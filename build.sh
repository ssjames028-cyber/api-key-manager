#!/bin/bash
set -e

echo "📦 API Key Manager — Release Build"
echo "===================================="

echo "[1/3] 의존성 설치..."
npm install

echo "[2/3] 릴리즈 빌드..."
npm run tauri build

echo "[3/3] 빌드 결과물 확인..."
DMG_PATH=$(find src-tauri/target/release/bundle/dmg -name "*.dmg" | head -1)
APP_PATH=$(find src-tauri/target/release/bundle/macos -name "*.app" | head -1)

echo ""
echo "✅ 빌드 완료"
echo "   .dmg : $DMG_PATH ($(du -sh "$DMG_PATH" | cut -f1))"
echo "   .app : $APP_PATH ($(du -sh "$APP_PATH" | cut -f1))"
