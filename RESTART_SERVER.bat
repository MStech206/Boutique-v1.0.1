@echo off
echo.
echo ========================================
echo   SAPTHALA Backend Server Restart
echo ========================================
echo.

echo [1/3] Killing existing server on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo Killing PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo [2/3] Waiting 2 seconds...
timeout /t 2 /nobreak >nul

echo [3/3] Starting server...
echo.
node server.js
