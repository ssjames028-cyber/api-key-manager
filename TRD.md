# TRD: API Key Manager
**버전**: 1.0.0
**작성일**: 2026-03-30
**기반 문서**: PRD v1.0.0
**상태**: Draft

---

## 1. 폴더 구조

```
api-key-manager/
├── src/                          # React 프론트엔드
│   ├── main.tsx                  # React 진입점
│   ├── App.tsx                   # 루트 컴포넌트, Context Provider 마운트
│   ├── index.css                 # Tailwind 지시문
│   │
│   ├── components/
│   │   ├── KeyTable.tsx          # API 키 목록 테이블
│   │   ├── KeyTableRow.tsx       # 테이블 행 (마스킹/토글/복사/삭제)
│   │   ├── AddKeyModal.tsx       # 키 추가 모달 폼
│   │   ├── DeleteConfirmModal.tsx# 삭제 확인 모달
│   │   ├── SearchBar.tsx         # 이름 기반 검색 인풋
│   │   ├── Toast.tsx             # 토스트 알림
│   │   └── EmptyState.tsx        # 키 없을 때 빈 상태 UI
│   │
│   ├── hooks/
│   │   ├── useApiKeys.ts         # 키 CRUD + Tauri command 호출
│   │   ├── useClipboard.ts       # 복사 + 30초 자동 초기화
│   │   └── useToast.ts           # 토스트 상태 관리
│   │
│   ├── context/
│   │   └── KeyContext.tsx        # 전역 키 목록 + 검색어 상태
│   │
│   ├── types/
│   │   └── index.ts              # ApiKey, Toast 등 공유 타입
│   │
│   └── lib/
│       └── tauri.ts              # invoke 래퍼 (타입 안전 헬퍼)
│
├── src-tauri/
│   ├── Cargo.toml                # 의존성: aes-gcm, uuid, serde, tauri
│   ├── tauri.conf.json           # 앱 설정, allowlist, window 크기
│   ├── build.rs
│   └── src/
│       ├── main.rs               # Tauri 빌더, command 등록
│       ├── commands.rs           # #[tauri::command] 함수 모음
│       ├── crypto.rs             # AES-256-GCM 암호화/복호화
│       ├── store.rs              # vault.json 파일 I/O
│       └── models.rs             # ApiKey, Vault 구조체
│
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 2. 데이터 모델

### 2.1 Rust 구조체 (`src-tauri/src/models.rs`)

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiKey {
    pub id: String,              // UUID v4
    pub name: String,            // 평문 이름 (검색용)
    pub encrypted_value: String, // Base64(nonce || ciphertext)
    pub created_at: String,      // ISO 8601 (UTC)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Vault {
    pub version: u8,             // 스키마 버전 (마이그레이션용)
    pub keys: Vec<ApiKey>,
}

impl Default for Vault {
    fn default() -> Self {
        Vault { version: 1, keys: vec![] }
    }
}
```

### 2.2 TypeScript 타입 (`src/types/index.ts`)

```typescript
export interface ApiKey {
  id: string;
  name: string;
  encryptedValue: string;  // 프론트엔드는 암호화된 값만 보유
  createdAt: string;       // ISO 8601
}

export interface AddKeyPayload {
  name: string;
  value: string;           // 평문 — Tauri command 호출 시에만 전달
}

export type ToastType = 'success' | 'error';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}
```

> **원칙**: 프론트엔드는 평문 값을 절대 상태(state)에 저장하지 않는다.
> 복호화된 값은 `useClipboard` 훅 내부에서 즉시 소비 후 폐기한다.

---

## 3. 암호화 저장 방식

### 3.1 키 파생 전략

마스터 암호화 키는 **기기 고유 식별자**에서 파생한다.

```
machine_id (macOS: IOPlatformUUID)
    │
    ▼
PBKDF2-HMAC-SHA256 (iterations: 100_000, salt: app_bundle_id)
    │
    ▼
256-bit master key
```

```rust
// src-tauri/src/crypto.rs
use pbkdf2::pbkdf2_hmac;
use sha2::Sha256;

pub fn derive_key(machine_id: &str) -> [u8; 32] {
    let salt = b"com.lysislab.api-key-manager";
    let mut key = [0u8; 32];
    pbkdf2_hmac::<Sha256>(
        machine_id.as_bytes(),
        salt,
        100_000,
        &mut key,
    );
    key
}
```

### 3.2 암호화 / 복호화

```rust
use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use aes_gcm::aead::rand_core::RngCore;
use base64::{engine::general_purpose, Engine};

// 암호화: 평문 → Base64(nonce[12] || ciphertext)
pub fn encrypt(plaintext: &str, key: &[u8; 32]) -> Result<String, String> {
    let cipher = Aes256Gcm::new(key.into());
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| e.to_string())?;

    let mut combined = nonce_bytes.to_vec();
    combined.extend_from_slice(&ciphertext);
    Ok(general_purpose::STANDARD.encode(combined))
}

// 복호화: Base64(nonce || ciphertext) → 평문
pub fn decrypt(encoded: &str, key: &[u8; 32]) -> Result<String, String> {
    let combined = general_purpose::STANDARD
        .decode(encoded)
        .map_err(|e| e.to_string())?;

    let (nonce_bytes, ciphertext) = combined.split_at(12);
    let cipher = Aes256Gcm::new(key.into());
    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| "복호화 실패: 데이터가 손상되었거나 키가 올바르지 않습니다".to_string())?;

    String::from_utf8(plaintext).map_err(|e| e.to_string())
}
```

### 3.3 저장 경로 및 파일 형식

```
~/Library/Application Support/com.lysislab.api-key-manager/vault.json
```

```json
{
  "version": 1,
  "keys": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "OpenAI Prod",
      "encrypted_value": "base64encodedNonce+Ciphertext==",
      "created_at": "2026-03-30T10:00:00Z"
    }
  ]
}
```

> `name`은 평문 저장 (검색 필터링 목적).
> `encrypted_value`만 AES-256-GCM 암호화.

---

## 4. Tauri Commands 인터페이스

### 4.1 Command 목록

| Command | 방향 | 설명 |
|---------|------|------|
| `get_all_keys` | Rust → JS | 전체 키 목록 반환 (값은 암호화 상태) |
| `add_key` | JS → Rust | 이름 + 평문 값 → 암호화 저장 |
| `delete_key` | JS → Rust | ID로 키 삭제 |
| `get_decrypted_value` | JS → Rust | ID → 복호화된 평문 값 반환 |

### 4.2 Rust 구현 (`src-tauri/src/commands.rs`)

```rust
use tauri::AppHandle;
use crate::{crypto, models::ApiKey, store};

#[tauri::command]
pub async fn get_all_keys(app: AppHandle) -> Result<Vec<ApiKey>, String> {
    let vault = store::load_vault(&app)?;
    Ok(vault.keys)
}

#[tauri::command]
pub async fn add_key(
    app: AppHandle,
    name: String,
    value: String,
) -> Result<ApiKey, String> {
    if name.trim().is_empty() || value.trim().is_empty() {
        return Err("이름과 값은 필수입니다.".into());
    }

    let mut vault = store::load_vault(&app)?;

    // 이름 중복 검사
    if vault.keys.iter().any(|k| k.name == name) {
        return Err(format!("'{name}'은 이미 존재하는 키 이름입니다."));
    }

    let master_key = crypto::get_master_key(&app)?;
    let encrypted_value = crypto::encrypt(&value, &master_key)?;

    let new_key = ApiKey {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        encrypted_value,
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    vault.keys.push(new_key.clone());
    store::save_vault(&app, &vault)?;
    Ok(new_key)
}

#[tauri::command]
pub async fn delete_key(app: AppHandle, id: String) -> Result<(), String> {
    let mut vault = store::load_vault(&app)?;
    vault.keys.retain(|k| k.id != id);
    store::save_vault(&app, &vault)
}

#[tauri::command]
pub async fn get_decrypted_value(
    app: AppHandle,
    id: String,
) -> Result<String, String> {
    let vault = store::load_vault(&app)?;
    let key = vault.keys
        .iter()
        .find(|k| k.id == id)
        .ok_or("키를 찾을 수 없습니다.")?;

    let master_key = crypto::get_master_key(&app)?;
    crypto::decrypt(&key.encrypted_value, &master_key)
}
```

### 4.3 TypeScript 래퍼 (`src/lib/tauri.ts`)

```typescript
import { invoke } from '@tauri-apps/api/core';
import type { ApiKey, AddKeyPayload } from '../types';

export const tauriApi = {
  getAllKeys: (): Promise<ApiKey[]> =>
    invoke('get_all_keys'),

  addKey: (payload: AddKeyPayload): Promise<ApiKey> =>
    invoke('add_key', { name: payload.name, value: payload.value }),

  deleteKey: (id: string): Promise<void> =>
    invoke('delete_key', { id }),

  getDecryptedValue: (id: string): Promise<string> =>
    invoke('get_decrypted_value', { id }),
};
```

---

## 5. React 컴포넌트 트리

```
App
├── KeyContextProvider          # 전역 상태 공급
│   ├── ToastContainer          # 토스트 렌더링 (portal)
│   │
│   ├── Header
│   │   └── AddKeyButton        # "+ 새 키" 버튼
│   │
│   ├── SearchBar               # 검색 인풋 (debounce 200ms)
│   │
│   ├── KeyTable                # 키 목록 테이블
│   │   ├── KeyTableRow         # 행 반복 렌더링
│   │   │   ├── MaskedValue     # 마스킹/평문 토글 표시
│   │   │   └── ActionButtons   # 👁 📋 🗑 아이콘 버튼
│   │   └── EmptyState          # 키 없을 때 표시
│   │
│   ├── AddKeyModal             # 키 추가 모달 (조건부 렌더)
│   │   └── KeyValueInput       # 값 입력 (show/hide 토글)
│   │
│   └── DeleteConfirmModal      # 삭제 확인 모달 (조건부 렌더)
```

### 5.1 컴포넌트별 책임

| 컴포넌트 | 책임 |
|----------|------|
| `App.tsx` | Provider 마운트, 모달 열림 상태 관리 |
| `KeyTable.tsx` | 필터링된 키 목록 순회 렌더링 |
| `KeyTableRow.tsx` | 단일 행: 마스킹 토글, 복사, 삭제 이벤트 처리 |
| `MaskedValue.tsx` | `isVisible` prop에 따라 평문/마스킹 문자열 반환 |
| `AddKeyModal.tsx` | 폼 상태, 유효성 검사, submit → `addKey` 호출 |
| `DeleteConfirmModal.tsx` | 삭제 대상 이름 표시, 확인 시 `deleteKey` 호출 |
| `SearchBar.tsx` | `debounce` 처리 후 Context에 검색어 업데이트 |
| `Toast.tsx` | 메시지 + 타입에 따른 색상, 3초 자동 소멸 |
| `EmptyState.tsx` | 순수 표시 컴포넌트 |

---

## 6. 상태 관리

### 6.1 전략: Context + useState (Zustand 미사용)

키 목록 규모(최대 1,000개)와 단일 뷰 구조상 외부 상태 라이브러리 불필요.
`KeyContext`가 단일 진실 공급원(single source of truth) 역할을 한다.

### 6.2 KeyContext (`src/context/KeyContext.tsx`)

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { tauriApi } from '../lib/tauri';
import type { ApiKey } from '../types';

interface KeyContextValue {
  keys: ApiKey[];
  filteredKeys: ApiKey[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  addKey: (name: string, value: string) => Promise<void>;
  deleteKey: (id: string) => Promise<void>;
  isLoading: boolean;
}

const KeyContext = createContext<KeyContextValue | null>(null);

export function KeyContextProvider({ children }: { children: React.ReactNode }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    tauriApi.getAllKeys()
      .then(setKeys)
      .finally(() => setIsLoading(false));
  }, []);

  const filteredKeys = keys.filter(k =>
    k.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addKey = async (name: string, value: string) => {
    const newKey = await tauriApi.addKey({ name, value });
    setKeys(prev => [newKey, ...prev]);  // 불변 업데이트, 최신순
  };

  const deleteKey = async (id: string) => {
    await tauriApi.deleteKey(id);
    setKeys(prev => prev.filter(k => k.id !== id));  // 불변 업데이트
  };

  return (
    <KeyContext.Provider value={{
      keys, filteredKeys, searchQuery, setSearchQuery,
      addKey, deleteKey, isLoading,
    }}>
      {children}
    </KeyContext.Provider>
  );
}

export const useKeyContext = () => {
  const ctx = useContext(KeyContext);
  if (!ctx) throw new Error('useKeyContext must be used within KeyContextProvider');
  return ctx;
};
```

### 6.3 로컬 상태 (컴포넌트 수준)

| 컴포넌트 | 로컬 상태 | 이유 |
|----------|-----------|------|
| `KeyTableRow` | `isVisible: boolean` | 행별 독립 토글, 전역 불필요 |
| `KeyTableRow` | `copyState: 'idle' \| 'copied'` | 아이콘 피드백, 1.5초 한정 |
| `AddKeyModal` | `name, value, error` | 폼 제출 전까지 유효 |
| `App` | `isAddModalOpen, deleteTarget` | 모달 열림 제어 |

### 6.4 useClipboard 훅 (`src/hooks/useClipboard.ts`)

```typescript
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { useCallback, useRef } from 'react';

export function useClipboard() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(async (text: string) => {
    await writeText(text);

    // 기존 타이머 취소 후 재설정
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      await writeText('');  // 클립보드 초기화
    }, 30_000);
  }, []);

  return { copy };
}
```

---

## 7. Tauri 설정 (`tauri.conf.json` 핵심)

```json
{
  "productName": "API Key Manager",
  "identifier": "com.lysislab.api-key-manager",
  "app": {
    "windows": [{
      "title": "API Key Manager",
      "width": 800,
      "height": 560,
      "minWidth": 600,
      "minHeight": 400,
      "resizable": true,
      "decorations": true
    }],
    "security": {
      "csp": "default-src 'self'; script-src 'self'; connect-src ipc: http://ipc.localhost"
    }
  },
  "bundle": {
    "targets": ["dmg", "app"]
  }
}
```

---

## 8. Cargo.toml 의존성

```toml
[dependencies]
tauri          = { version = "2", features = ["macos-private-api"] }
tauri-plugin-clipboard-manager = "2"
tauri-plugin-fs = "2"
serde          = { version = "1", features = ["derive"] }
serde_json     = "1"
aes-gcm        = "0.10"
pbkdf2         = "0.12"
sha2           = "0.10"
uuid           = { version = "1", features = ["v4"] }
chrono         = { version = "0.4", features = ["serde"] }
base64         = "0.22"
```

---

## 9. 마스킹 로직

```typescript
// src/components/MaskedValue.tsx
export function maskValue(value: string): string {
  if (value.length <= 7) return '••••••••••••';
  const prefix = value.slice(0, 4);   // 앞 4자
  const suffix = value.slice(-3);     // 뒤 3자
  return `${prefix}••••••••••••${suffix}`;
}

// 표시 예: sk-proj-xxxxx → sk-p••••••••••••xxx
```

---

## 10. 에러 처리 전략

| 레이어 | 에러 처리 |
|--------|-----------|
| Rust commands | `Result<T, String>` 반환, 에러 메시지 한국어 |
| `tauriApi` 래퍼 | `try/catch` 없음 — 호출부(hook)에 위임 |
| `useApiKeys` 훅 | `try/catch` → `useToast`로 에러 토스트 발행 |
| 폼 유효성 | 제출 시점 동기 검사, 인라인 에러 메시지 표시 |
| vault 로드 실패 | 빈 Vault로 폴백 + 콘솔 경고 (데이터 손실 방지) |

---

## 11. 보안 체크리스트

- [ ] 프론트엔드 상태(state)에 평문 키 값 저장 금지
- [ ] `console.log` / `console.error`에 키 값 포함 금지
- [ ] Tauri CSP: 외부 네트워크 연결 차단 확인
- [ ] `get_decrypted_value` command는 복사 버튼 클릭 시에만 호출
- [ ] 클립보드 30초 초기화 타이머 — 앱 종료 시에도 `writeText('')` 호출
- [ ] vault.json 파일 권한: `600` (소유자 읽기/쓰기만)
- [ ] 빌드 결과물에 `.env`, 테스트 키 미포함 확인
