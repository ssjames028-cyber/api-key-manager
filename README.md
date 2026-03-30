# 🔑 API Key Manager

> macOS용 로컬 API 키 관리 앱. 키 값은 AES-256-GCM으로 암호화되어 내 컴퓨터에만 저장됩니다.

![Platform](https://img.shields.io/badge/platform-macOS-black)
![Version](https://img.shields.io/badge/version-0.1.0-emerald)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## 화면 미리보기

| 메인 화면 | 키 추가 | 삭제 확인 |
|-----------|---------|-----------|
| 키 목록 테이블, 검색, 마스킹 표시 | 이름 + 값 입력 폼 | 삭제 전 확인 모달 |

---

## 주요 기능

- **API 키 등록** — 이름 + 값 입력, 생성일 자동 기록
- **마스킹 표시** — 기본적으로 `sk-p••••••••••••xxx` 형태로 숨김
- **보기 토글** — 눈 아이콘 클릭 시 평문 표시, **5초 후 자동 숨김**
- **클립보드 복사** — 복사 아이콘 클릭, **30초 후 자동 초기화**
- **삭제** — 휴지통 아이콘 + 확인 모달 (실수 방지)
- **실시간 검색** — 이름 기반 필터링
- **완전 오프라인** — 네트워크 요청 없음, 100% 로컬 동작

---

## 보안

| 항목 | 내용 |
|------|------|
| 암호화 알고리즘 | AES-256-GCM |
| 저장 위치 | `~/Library/Application Support/com.lysislab.api-key-manager/` |
| 네트워크 | 요청 없음 (CSP로 외부 연결 차단) |
| 화면 보호 | 기본 마스킹, 보기 후 5초 자동 숨김 |
| 클립보드 | 복사 후 30초 자동 초기화 |

---

## 설치 방법 (일반 사용자)

### 1. DMG 다운로드

[**Releases 페이지**](../../releases/latest)에서 최신 `.dmg` 파일을 다운로드합니다.

### 2. 앱 설치

DMG 파일을 열고 **API Key Manager** 앱을 **Applications** 폴더로 드래그합니다.

### 3. 처음 실행 시 (중요)

Apple 공식 서명이 없어 아래 경고가 표시됩니다.

```
"API Key Manager"는 Apple이 확인할 수 없는 개발자의 앱입니다.
```

**해결 방법**: 앱 아이콘을 **우클릭 → "열기"** 클릭 → 확인

> 이후부터는 정상적으로 실행됩니다.

### 요구사항

- macOS 13 Ventura 이상
- Apple Silicon (M1/M2/M3) 또는 Intel Mac

---

## 직접 빌드 방법 (개발자)

### 사전 요구사항

```bash
# Node.js 18+ 설치 확인
node --version

# Rust 설치
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# tauri-cli 설치
cargo install tauri-cli --version "^2" --locked
```

### 빌드

```bash
# 저장소 클론
git clone https://github.com/ssjames028-cyber/api-key-manager.git
cd api-key-manager

# 의존성 설치
npm install

# 개발 모드 실행 (핫 리로드)
npm run tauri dev

# 릴리즈 빌드 (.dmg 생성)
npm run tauri build
# 결과물: src-tauri/target/release/bundle/dmg/
```

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 데스크톱 프레임워크 | Tauri v2 |
| 프론트엔드 | React 18 + TypeScript |
| 스타일링 | Tailwind CSS v4 |
| 암호화 | Rust `aes-gcm` crate |
| 빌드 도구 | Vite |

---

## 릴리즈 정보

### v0.1.0
- 최초 릴리즈
- AES-256-GCM 암호화 저장
- 키 추가 / 조회 / 삭제 / 검색
- 마스킹 + 5초 자동 숨김
- 클립보드 복사 (30초 자동 초기화)
- 앱 번들 크기: **1.6 MB**

---

## 라이선스

MIT
