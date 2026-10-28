@echo off
chcp 65001 >nul
title Cài đặt & Khởi chạy Zalo Care Bot
cd /d "%~dp0"

echo ====================================================================
echo   CHÀO MỪNG ĐẾN VỚI BỘ CÀI ĐẶT TỰ ĐỘNG ZALO CARE BOT
echo ====================================================================
echo.

:: 1. Kiểm tra Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Máy tính chưa cài đặt Node.js. Đang tự động cài đặt Node.js LTS qua Winget...
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    if %errorlevel% neq 0 (
        echo [X] Vui lòng tải và cài đặt Node.js tại https://nodejs.org rồi chạy lại file này.
        pause
        exit /b 1
    )
    set "PATH=%PATH%;C:\Program Files\nodejs"
)

:: 2. Cài đặt thư viện nếu chưa có node_modules
if not exist "node_modules" (
    echo [1/3] Đang tải và cài đặt các thư viện cần thiết (chỉ mất khoảng 20 giây)...
    call npm.cmd install
) else (
    echo [1/3] Thư viện đã sẵn sàng.
)

:: 3. Tạo biểu tượng ứng dụng ngoài màn hình Desktop
echo [2/3] Đang tạo biểu tượng ứng dụng Zalo Care Bot ngoài màn hình Desktop...
node src/scripts/setupDesktopApp.js

:: 4. Mở ứng dụng
echo [3/3] Đang khởi động ứng dụng Zalo Care Bot...
wscript.exe "%~dp0ZaloCare-App.vbs"

echo.
echo ====================================================================
echo   ✅ ĐÃ CÀI ĐẶT XONG!
echo   Biểu tượng "Zalo Care Bot" đã được tạo ngoài màn hình Desktop của bạn.
echo   Hãy quét mã QR Zalo của bạn trong mục "Kết nối Zalo" để bắt đầu!
echo ====================================================================
timeout /t 5
