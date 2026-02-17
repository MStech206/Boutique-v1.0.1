@echo off
echo ========================================
echo SAPTHALA System Integration Test
echo ========================================
echo.

REM Check if server is running
echo Checking if server is running...
curl -s http://localhost:3000/api/settings >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Server is not running!
    echo Please run START_ALL.bat first
    echo.
    pause
    exit /b 1
)

echo Server is running. Starting tests...
echo.

node test-complete-system.js

echo.
echo ========================================
echo Test completed!
echo ========================================
pause
