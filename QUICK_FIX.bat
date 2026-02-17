@echo off
color 0A
title SAPTHALA - Quick Fix

echo.
echo ========================================================
echo   SAPTHALA - ELEGANT FIX APPLIED
echo ========================================================
echo.
echo Applying elegant fix...
echo.

echo [1/3] Resetting admin password...
node reset-admin-password.js
echo.

echo [2/3] Killing port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul
echo Done!
echo.

echo [3/3] Starting system...
start "SAPTHALA Backend" cmd /k "color 0A && title SAPTHALA Backend && node server.js"
timeout /t 8 /nobreak >nul

echo.
echo Opening admin panel...
start "" "http://localhost:3000"

echo.
echo ========================================================
echo   SYSTEM READY!
echo ========================================================
echo.
echo Admin Panel: http://localhost:3000
echo Username: admin
echo Password: sapthala@2029
echo.
echo ========================================================
pause
