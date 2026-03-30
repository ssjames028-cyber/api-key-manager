# API Key Manager

로컬에서 완전히 동작하는 macOS용 API 키 관리 앱입니다.
키 값은 AES-256-GCM으로 암호화되어 저장됩니다.

## 설치 방법 (일반 사용자)

1. [Releases](../../releases) 페이지에서 최신 `.dmg` 파일 다운로드
2. DMG 파일 열기 → 앱을 Applications 폴더로 드래그
3. **처음 실행 시**: 앱 아이콘 우클릭 → "열기" 선택 (미서명 앱 경고 우회)

## 직접 빌드 방법 (개발자)

### 사전 요구사항

- macOS 13 Ventura 이상
- [Node.js 18+](https://nodejs.org)
- [Rust](https://rustup.rs)

### 빌드

```bash
git clone https://github.com/YOUR_USERNAME/api-key-manager.git
cd api-key-manager
npm install
npm run tauri dev     # 개발 모드
npm run tauri build   # 릴리즈 빌드 (.dmg 생성)
```

## 기능

- API 키 등록 / 조회 / 삭제
- 키 값 마스킹 처리 (기본 숨김)
- 보기 클릭 시 5초 후 자동 숨김
- 클립보드 복사 (30초 후 자동 초기화)
- 이름 기반 실시간 검색
- 완전 오프라인 동작

## 보안

- AES-256-GCM 암호화 저장
- 키 파일: `~/Library/Application Support/com.lysislab.api-key-manager/`
- 네트워크 요청 없음
