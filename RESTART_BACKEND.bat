@echo off
echo ========================================
echo   SAPTHALA Backend - Complete Restart
echo ========================================
echo.

echo [1/3] Killing any process on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    echo Found process: %%a
    taskkill /F /PID %%a 2>nul
)
timeout /t 2 /nobreak >nul

echo.
echo [2/3] Checking MongoDB...
sc query MongoDB | find "RUNNING" >nul
if %errorlevel% equ 0 (
    echo MongoDB is running ✓
) else (
    echo Starting MongoDB...
    net start MongoDB
)

echo.
echo [3/3] Starting SAPTHALA Backend Server...
echo.
echo ========================================
echo   Server will start on port 3000
echo   Press Ctrl+C to stop
echo ========================================
echo.

node server.js
