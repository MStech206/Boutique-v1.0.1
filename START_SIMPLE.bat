@echo off
title SAPTHALA - Simple Start
color 0A

cls
echo.
echo ============================================================
echo   SAPTHALA BOUTIQUE - SIMPLE START
echo ============================================================
echo.
echo This will start your boutique management system.
echo.
echo Press any key to continue...
pause >nul

echo.
echo Starting system...
echo.

REM Kill any existing process on port 3000
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :3000') do (
    taskkill /F /PID %%a >nul 2>&1
)

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Start the server
echo Starting backend server...
start "SAPTHALA Backend" cmd /k "title SAPTHALA Backend && node server.js"

REM Wait for server to start
echo Waiting for server to start...
timeout /t 8 /nobreak >nul

REM Open admin panel
echo Opening admin panel...
start "" "http://localhost:3000"

echo.
echo ============================================================
echo   SYSTEM STARTED!
echo ============================================================
echo.
echo Admin Panel opened in your browser.
echo.
echo Login with:
echo   Username: admin
echo   Password: sapthala@2029
echo.
echo To stop the server, close the backend window.
echo.
echo ============================================================
echo.
pause
