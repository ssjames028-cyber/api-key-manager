# TASK.md — API Key Manager
**기반 문서**: PRD v1.0.0 / TRD v1.0.0
**작성일**: 2026-03-30
**진행 현황**: 0 / 28 완료

---

## 진행 요약

| 카테고리 | 전체 | 완료 | 진행률 |
|----------|------|------|--------|
| 환경설정 | 5 | 0 | 0% |
| Rust 백엔드 | 8 | 0 | 0% |
| React 프론트엔드 | 11 | 0 | 0% |
| 통합 | 3 | 0 | 0% |
| 빌드 | 1 | 0 | 0% |

---

## 카테고리 A — 환경설정

### T-001 · Tauri v2 프로젝트 초기화
- **난이도**: 쉬움
- **depends**: 없음
- **작업 내용**:
  - [ ] `npm create tauri-app@latest api-key-manager` 실행 (React + TypeScript 선택)
  - [ ] 디렉토리 구조 TRD §1 기준으로 정리
  - [ ] `src/`, `src-tauri/` 양쪽 정상 생성 확인
  - [ ] `npm run tauri dev` 로 빈 앱 실행 확인

---

### T-002 · Rust 의존성 추가 (Cargo.toml)
- **난이도**: 쉬움
- **depends**: T-001
- **작업 내용**:
  - [ ] `aes-gcm = "0.10"` 추가
  - [ ] `pbkdf2 = "0.12"`, `sha2 = "0.10"` 추가
  - [ ] `uuid = { version = "1", features = ["v4"] }` 추가
  - [ ] `chrono = { version = "0.4", features = ["serde"] }` 추가
  - [ ] `serde`, `serde_json`, `base64` 추가
  - [ ] `cargo build` 성공 확인

---

### T-003 · Tauri 플러그인 설치 및 설정
- **난이도**: 쉬움
- **depends**: T-001
- **작업 내용**:
  - [ ] `tauri-plugin-clipboard-manager` 추가 및 `main.rs` 등록
  - [ ] `tauri-plugin-fs` 추가 및 `main.rs` 등록
  - [ ] `tauri.conf.json` 윈도우 크기 설정 (800×560, min 600×400)
  - [ ] `tauri.conf.json` CSP 외부 네트워크 차단 설정
  - [ ] `tauri.conf.json` `identifier` → `com.lysislab.api-key-manager` 설정

---

### T-004 · 프론트엔드 의존성 설치
- **난이도**: 쉬움
- **depends**: T-001
- **작업 내용**:
  - [ ] `tailwindcss`, `@tailwindcss/vite` 설치
  - [ ] `lucide-react` 설치
  - [ ] `tailwind.config.ts` 다크 테마 기본값 설정 (`darkMode: 'class'`)
  - [ ] `index.css` Tailwind 지시문 추가
  - [ ] `<html class="dark">` 설정으로 다크 모드 고정 확인

---

### T-005 · 폴더 구조 및 기본 파일 생성
- **난이도**: 쉬움
- **depends**: T-004
- **작업 내용**:
  - [ ] `src/components/`, `src/hooks/`, `src/context/`, `src/types/`, `src/lib/` 디렉토리 생성
  - [ ] `src/types/index.ts` — `ApiKey`, `AddKeyPayload`, `Toast` 타입 정의
  - [ ] `src/lib/tauri.ts` — `tauriApi` 래퍼 스켈레톤 작성
  - [ ] `src-tauri/src/models.rs` — `ApiKey`, `Vault` 구조체 스켈레톤 작성
  - [ ] 각 파일 `mod` 선언 (`main.rs`에 모듈 등록)

---

## 카테고리 B — Rust 백엔드

### T-006 · ApiKey / Vault 구조체 정의
- **난이도**: 쉬움
- **depends**: T-002, T-005
- **작업 내용**:
  - [ ] `models.rs`: `ApiKey` 구조체 (id, name, encrypted_value, created_at)
  - [ ] `models.rs`: `Vault` 구조체 (version, keys) + `Default` 구현
  - [ ] `Serialize`, `Deserialize`, `Clone`, `Debug` derive 적용
  - [ ] `cargo check` 통과 확인

---

### T-007 · 기기 고유 키 파생 함수
- **난이도**: 보통
- **depends**: T-006
- **작업 내용**:
  - [ ] `crypto.rs` 파일 생성
  - [ ] macOS `IOPlatformUUID` 읽기 (`system_profiler` 또는 `ioreg` 명령어 실행)
  - [ ] `PBKDF2-HMAC-SHA256` 로 256-bit 마스터 키 파생
  - [ ] `get_master_key(app: &AppHandle) -> Result<[u8; 32], String>` 함수 구현
  - [ ] 동일 기기에서 반복 호출 시 동일 키 반환 검증

---

### T-008 · AES-256-GCM 암호화 함수
- **난이도**: 보통
- **depends**: T-007
- **작업 내용**:
  - [ ] `crypto.rs`: `encrypt(plaintext: &str, key: &[u8; 32]) -> Result<String, String>` 구현
  - [ ] nonce 12바이트 랜덤 생성 (`OsRng`)
  - [ ] `Base64(nonce[12] || ciphertext)` 형태로 인코딩하여 반환
  - [ ] 단위 테스트: 암호화 결과가 평문과 다른지 확인

---

### T-009 · AES-256-GCM 복호화 함수
- **난이도**: 보통
- **depends**: T-008
- **작업 내용**:
  - [ ] `crypto.rs`: `decrypt(encoded: &str, key: &[u8; 32]) -> Result<String, String>` 구현
  - [ ] Base64 디코딩 → nonce(앞 12바이트) / ciphertext 분리
  - [ ] AES-256-GCM 복호화 후 UTF-8 문자열 반환
  - [ ] 단위 테스트: `encrypt → decrypt` 왕복 결과가 원문과 일치하는지 확인
  - [ ] 잘못된 키로 복호화 시 명확한 에러 메시지 반환 확인

---

### T-010 · Vault 파일 I/O (store.rs)
- **난이도**: 보통
- **depends**: T-006
- **작업 내용**:
  - [ ] `store.rs`: `load_vault(app: &AppHandle) -> Result<Vault, String>` 구현
  - [ ] 파일 없을 시 `Vault::default()` 반환 (초기 실행 대응)
  - [ ] `store.rs`: `save_vault(app: &AppHandle, vault: &Vault) -> Result<(), String>` 구현
  - [ ] 저장 경로: `app.path().app_data_dir()? / "vault.json"`
  - [ ] 저장 후 파일 권한 `0o600` 설정 (소유자 읽기/쓰기만)
  - [ ] `serde_json` 직렬화/역직렬화 확인

---

### T-011 · Tauri Commands 구현 (commands.rs)
- **난이도**: 보통
- **depends**: T-009, T-010
- **작업 내용**:
  - [ ] `get_all_keys(app: AppHandle) -> Result<Vec<ApiKey>, String>` 구현
  - [ ] `add_key(app, name, value) -> Result<ApiKey, String>` 구현
    - 이름/값 공백 검사
    - 이름 중복 검사
    - 암호화 후 vault에 저장
  - [ ] `delete_key(app, id) -> Result<(), String>` 구현
  - [ ] `get_decrypted_value(app, id) -> Result<String, String>` 구현
  - [ ] `main.rs`에 모든 command `.invoke_handler()` 등록

---

### T-012 · Rust 백엔드 통합 테스트
- **난이도**: 보통
- **depends**: T-011
- **작업 내용**:
  - [ ] `cargo test` — 암호화 왕복 테스트 통과
  - [ ] `cargo test` — vault 저장/로드 왕복 테스트 통과
  - [ ] `cargo test` — 이름 중복 추가 시 에러 반환 확인
  - [ ] `cargo test` — 없는 ID 삭제 시 조용히 성공(no-op) 확인
  - [ ] `cargo build --release` 경고 0건 확인

---

### T-013 · Rust 보안 hardening
- **난이도**: 어려움
- **depends**: T-012
- **작업 내용**:
  - [ ] 모든 command 함수에서 에러 메시지에 키 값 미포함 확인
  - [ ] `get_decrypted_value` — 로그/panic에 평문 미출력 확인
  - [ ] `eprintln!` / `println!` 에 민감 데이터 포함 여부 전수 검사
  - [ ] vault 파일 경로 외 파일시스템 접근 없음 확인 (Tauri allowlist 검토)

---

## 카테고리 C — React 프론트엔드

### T-014 · tauriApi 래퍼 완성 (lib/tauri.ts)
- **난이도**: 쉬움
- **depends**: T-005, T-011
- **작업 내용**:
  - [ ] `getAllKeys(): Promise<ApiKey[]>` 구현
  - [ ] `addKey(payload): Promise<ApiKey>` 구현
  - [ ] `deleteKey(id): Promise<void>` 구현
  - [ ] `getDecryptedValue(id): Promise<string>` 구현
  - [ ] 각 함수 TypeScript 반환 타입 명시 확인

---

### T-015 · KeyContext 및 KeyContextProvider 구현
- **난이도**: 보통
- **depends**: T-014
- **작업 내용**:
  - [ ] `context/KeyContext.tsx` 생성
  - [ ] `keys`, `filteredKeys`, `searchQuery`, `isLoading` 상태 정의
  - [ ] `addKey`, `deleteKey` 비동기 액션 구현 (불변 업데이트)
  - [ ] 초기 마운트 시 `getAllKeys()` 호출하여 상태 초기화
  - [ ] `useKeyContext()` 훅 export
  - [ ] `App.tsx`에 Provider 마운트

---

### T-016 · useToast 훅 및 Toast 컴포넌트
- **난이도**: 쉬움
- **depends**: T-005
- **작업 내용**:
  - [ ] `hooks/useToast.ts`: `toasts` 상태, `showToast(msg, type)`, `removeToast(id)` 구현
  - [ ] 3초 후 자동 소멸 타이머 (`setTimeout`)
  - [ ] `components/Toast.tsx`: success(민트)/error(레드) 스타일 분기
  - [ ] 우하단 고정 위치, 복수 토스트 스택 표시
  - [ ] `App.tsx`에 `<ToastContainer>` 배치

---

### T-017 · useClipboard 훅
- **난이도**: 보통
- **depends**: T-003, T-014
- **작업 내용**:
  - [ ] `hooks/useClipboard.ts` 생성
  - [ ] `tauri-plugin-clipboard-manager`의 `writeText` 호출
  - [ ] 복사 성공 후 30초 타이머 → `writeText('')`로 클립보드 초기화
  - [ ] 재복사 시 기존 타이머 취소 후 새 타이머 시작
  - [ ] `copy(text: string): Promise<void>` 함수 반환

---

### T-018 · SearchBar 컴포넌트
- **난이도**: 쉬움
- **depends**: T-015
- **작업 내용**:
  - [ ] `components/SearchBar.tsx` 생성
  - [ ] `lucide-react`의 `Search` 아이콘 적용
  - [ ] 입력값 변경 시 debounce 200ms 후 `setSearchQuery` 호출
  - [ ] 검색창 초기화(X) 버튼 — 검색어 있을 때만 노출
  - [ ] 다크 테마 스타일 적용 (`zinc-800` 배경, 포커스 민트 링)

---

### T-019 · EmptyState 컴포넌트
- **난이도**: 쉬움
- **depends**: T-005
- **작업 내용**:
  - [ ] `components/EmptyState.tsx` 생성
  - [ ] 키 목록이 빈 경우: "등록된 API 키가 없습니다." + 추가 안내 문구
  - [ ] 검색 결과가 없는 경우: "'{query}'에 해당하는 키가 없습니다." 메시지
  - [ ] `lucide-react` `KeyRound` 아이콘 중앙 배치

---

### T-020 · MaskedValue 유틸 및 KeyTableRow 컴포넌트
- **난이도**: 보통
- **depends**: T-015, T-017
- **작업 내용**:
  - [ ] `maskValue(value: string): string` 유틸 함수 구현
    - 형식: `앞4자 + ••••••••••••(고정 12자) + 뒤3자`
    - 7자 이하 입력: `••••••••••••` 고정 반환
  - [ ] `components/KeyTableRow.tsx` 생성
  - [ ] `isVisible` 로컬 상태로 눈 아이콘 토글 구현
    - `isVisible=false`: 마스킹 표시, `Eye` 아이콘
    - `isVisible=true`: 복호화 값 표시, `EyeOff` 아이콘
    - 토글 시 `getDecryptedValue` 최초 1회 호출 후 로컬 캐시
  - [ ] `copyState: 'idle' | 'copied'` 로컬 상태로 아이콘 전환
    - 복사 성공: `Check` 아이콘으로 1.5초 후 `Copy` 아이콘 복귀
  - [ ] 행 hover 시 Actions 아이콘 표시 (평소 숨김)
  - [ ] 삭제 버튼: `Trash2` 아이콘, `onDeleteRequest(id, name)` prop 호출

---

### T-021 · KeyTable 컴포넌트
- **난이도**: 쉬움
- **depends**: T-019, T-020
- **작업 내용**:
  - [ ] `components/KeyTable.tsx` 생성
  - [ ] `filteredKeys`를 순회하여 `KeyTableRow` 렌더링
  - [ ] `filteredKeys.length === 0` 시 `EmptyState` 렌더링
  - [ ] 테이블 헤더: 이름 / 값 / 생성일 / 작업
  - [ ] `isLoading=true` 시 스켈레톤 로딩 UI (3행)
  - [ ] 생성일 표시 형식: `YYYY-MM-DD`

---

### T-022 · AddKeyModal 컴포넌트
- **난이도**: 보통
- **depends**: T-015, T-016
- **작업 내용**:
  - [ ] `components/AddKeyModal.tsx` 생성
  - [ ] `name`, `value` 폼 상태 관리 (`useState`)
  - [ ] 클라이언트 유효성 검사
    - 이름 공백 → "이름을 입력해주세요." 인라인 에러
    - 값 공백 → "API 키 값을 입력해주세요." 인라인 에러
  - [ ] 값 입력창: `show/hide` 토글 (`Eye` / `EyeOff` 아이콘)
  - [ ] 제출 시 `addKey()` 호출 → 성공: 모달 닫기 + 성공 토스트
  - [ ] 제출 중 버튼 비활성화 + 로딩 스피너
  - [ ] ESC 키 / 배경 클릭으로 모달 닫기
  - [ ] 배경: 블러 + 반투명 딤 (`backdrop-blur-sm`)

---

### T-023 · DeleteConfirmModal 컴포넌트
- **난이도**: 쉬움
- **depends**: T-015, T-016
- **작업 내용**:
  - [ ] `components/DeleteConfirmModal.tsx` 생성
  - [ ] `deleteTarget: { id: string; name: string } | null` prop 수신
  - [ ] 모달 본문: `'{name}' 키를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
  - [ ] [취소] 버튼: `zinc-700` 스타일
  - [ ] [삭제] 버튼: `red-600` 스타일
  - [ ] 삭제 확인 시 `deleteKey()` 호출 → 성공: 모달 닫기 + 삭제 토스트
  - [ ] ESC 키 / [취소] 클릭으로 닫기

---

### T-024 · Header 및 App.tsx 레이아웃 조립
- **난이도**: 쉬움
- **depends**: T-021, T-022, T-023
- **작업 내용**:
  - [ ] `App.tsx`: `isAddModalOpen`, `deleteTarget` 로컬 상태 정의
  - [ ] Header: 좌측 앱 타이틀, 우측 "+ 새 키" 버튼 (`Plus` 아이콘)
  - [ ] 전체 배경: `bg-zinc-950`, 텍스트: `text-zinc-100`
  - [ ] 레이아웃 순서: Header → SearchBar → KeyTable
  - [ ] 모달 조건부 렌더링 연결
  - [ ] `<html class="dark">` 적용 확인

---

## 카테고리 D — 통합

### T-025 · Tauri invoke 연동 E2E 테스트
- **난이도**: 보통
- **depends**: T-013, T-024
- **작업 내용**:
  - [ ] `npm run tauri dev` 실행 후 앱 정상 로딩 확인
  - [ ] 키 추가 → 목록에 즉시 반영 확인
  - [ ] 마스킹 토글 → 눈 아이콘 전환 및 평문 표시 확인
  - [ ] 클립보드 복사 → 실제 붙여넣기로 값 일치 확인
  - [ ] 삭제 모달 → 확인 후 목록에서 제거 확인
  - [ ] 검색 → 실시간 필터링 확인
  - [ ] 앱 재시작 → 키 목록 유지 확인 (vault.json 영속성)
  - [ ] vault.json 파일 직접 열기 → 값이 암호화 문자열인지 확인

---

### T-026 · 클립보드 30초 초기화 검증
- **난이도**: 쉬움
- **depends**: T-025
- **작업 내용**:
  - [ ] 복사 후 31초 경과 시 클립보드가 비워지는지 수동 확인
  - [ ] 30초 내 재복사 시 타이머 리셋되는지 확인
  - [ ] 앱 종료 시 클립보드 초기화 동작 확인 (tauri `on_window_event` 활용)

---

### T-027 · 보안 최종 검증
- **난이도**: 보통
- **depends**: T-025, T-026
- **작업 내용**:
  - [ ] Charles Proxy / Proxyman으로 앱 실행 중 네트워크 요청 0건 확인
  - [ ] React DevTools에서 키 평문 값이 state/props에 노출되지 않는지 확인
  - [ ] vault.json 파일 권한이 `600`인지 확인 (`ls -la`)
  - [ ] Xcode Console에서 민감 데이터 로그 미출력 확인

---

## 카테고리 E — 빌드

### T-028 · 릴리즈 빌드 및 .dmg 생성
- **난이도**: 보통
- **depends**: T-027
- **작업 내용**:
  - [ ] `npm run tauri build` 실행
  - [ ] 빌드 경고 0건 확인
  - [ ] 번들 크기 10 MB 이하 확인
  - [ ] `.dmg` 파일 생성 확인 (`src-tauri/target/release/bundle/dmg/`)
  - [ ] `.dmg` 마운트 후 앱 실행 및 기본 동작 확인
  - [ ] macOS Gatekeeper 경고 없이 실행되는지 확인 (서명 필요 시 `codesign` 적용)
  - [ ] `build.sh` 작성 (`npm install && npm run tauri build`)

---

## 의존 관계 요약

```
T-001
├── T-002 → T-006 → T-007 → T-008 → T-009 ┐
│                 └── T-010               ├→ T-011 → T-012 → T-013
│                                         ┘
├── T-003
├── T-004 → T-005 ──────────────────────────→ T-014 → T-015 → T-021 ┐
│             └── T-016                                T-022         ├→ T-024 → T-025 → T-026 → T-027 → T-028
│             └── T-017                                T-023         ┘
│             └── T-018 → T-021
│             └── T-019 → T-021
│             └── T-020 → T-021
```

---

## 완료 기준 (Definition of Done)

- [ ] 모든 T-xxx 체크박스 완료
- [ ] `cargo test` 전체 통과
- [ ] `npm run tauri build` 경고 0건
- [ ] vault.json에 평문 키 값 없음 (수동 확인)
- [ ] 네트워크 요청 0건 (Proxyman 확인)
- [ ] .dmg 번들 크기 ≤ 10 MB
