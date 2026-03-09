@echo off
echo ========================================
echo SAPTHALA BOUTIQUE - QUICK START
echo ========================================
echo.

echo [1/4] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)
echo OK: Node.js is installed

echo.
echo [2/4] Checking MongoDB...
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo OK: MongoDB is running
) else (
    echo WARNING: MongoDB is not running
    echo Server will use file-based fallback
)

echo.
echo [3/4] Starting server...
start "SAPTHALA Server" cmd /k "node server.js"
timeout /t 3 >nul

echo.
echo [4/4] Running tests...
timeout /t 2 >nul
node test-e2e-complete.js

echo.
echo ========================================
echo TESTING COMPLETE
echo ========================================
echo.
echo Next steps:
echo 1. Open browser: http://localhost:3000
echo 2. Login: admin / sapthala@2029
echo 3. Test order creation
echo.
echo Press any key to open browser...
pause >nul
start http://localhost:3000

echo.
echo Server is running in separate window
echo Close that window to stop the server
echo.
pause
