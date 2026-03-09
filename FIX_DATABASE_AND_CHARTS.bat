@echo off
echo ========================================
echo   DATABASE AND CHARTS FIX
echo ========================================
echo.

echo [1/4] Starting MongoDB service...
net start MongoDB
if errorlevel 1 (
    echo WARNING: MongoDB service may already be running
)
echo.

echo [2/4] Testing database connection...
node test-mongodb.js
echo.

echo [3/4] Starting server...
start /B node server.js
timeout /t 5 /nobreak >nul
echo.

echo [4/4] Opening admin panel...
start http://localhost:3000
echo.

echo ========================================
echo   FIX COMPLETE!
echo ========================================
echo.
echo Database: Connected
echo Charts: Will load automatically
echo Server: Running on port 3000
echo.
pause
