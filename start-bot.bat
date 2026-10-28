@echo off
chcp 65001 >nul
title Zalo Care Bot - Chăm sóc khách hàng tự động & Trợ lý AI
echo ============================================================
echo   ĐANG KHỞI ĐỘNG ZALO CARE BOT (PORT 3088)...
echo   Trình duyệt sẽ tự động mở tại: http://localhost:3088
echo ============================================================
cd /d "%~dp0"
start "" "http://localhost:3088"
node server.js
pause
