@echo off
echo ========================================
echo Task Assignment Test
echo ========================================
echo.

REM Check if server is running
curl -s http://localhost:3000/api/settings >nul 2>&1
if errorlevel 1 (
    echo ERROR: Server is not running!
    echo Please start the server first using LAUNCH_SYSTEM.bat
    echo.
    pause
    exit /b 1
)

echo Running test...
echo.
node test-task-assignment.js

echo.
pause
