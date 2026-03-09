@echo off
color 0B
title SAPTHALA Boutique - Firebase System

cls
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║         🔥 SAPTHALA BOUTIQUE - Firebase System 🔥         ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo [1/3] Checking Firebase credentials...
if not exist "firebase-credentials.json" (
    echo ❌ Firebase credentials not found!
    echo Please ensure firebase-credentials.json exists
    pause
    exit /b 1
)
echo ✅ Firebase credentials found
echo.

echo [2/3] Starting server...
start /B node server.js
timeout /t 3 /nobreak >nul
echo ✅ Server started
echo.

echo [3/3] Opening admin panel...
start http://localhost:3000
echo ✅ Admin panel opened
echo.

echo ╔════════════════════════════════════════════════════════════╗
echo ║  ✅ SYSTEM READY                                           ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo 🔥 Database: Firebase/Firestore
echo 📊 Charts: Enabled
echo 🌐 URL: http://localhost:3000
echo.
echo Press any key to stop the server...
pause >nul

echo.
echo Stopping server...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul
echo ✅ Server stopped
pause
