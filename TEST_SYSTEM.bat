@echo off
echo.
echo ============================================================
echo   SAPTHALA - QUICK SYSTEM TEST
echo ============================================================
echo.

echo Testing Node.js...
node --version
if errorlevel 1 (
    echo X Node.js not found!
    pause
    exit /b 1
)
echo OK Node.js installed
echo.

echo Testing npm...
npm --version
if errorlevel 1 (
    echo X npm not found!
    pause
    exit /b 1
)
echo OK npm installed
echo.

echo Checking files...
if exist "server.js" (
    echo OK server.js found
) else (
    echo X server.js missing!
)

if exist "database.js" (
    echo OK database.js found
) else (
    echo X database.js missing!
)

if exist "package.json" (
    echo OK package.json found
) else (
    echo X package.json missing!
)

if exist "firebase-integration-service.js" (
    echo OK firebase-integration-service.js found
) else (
    echo ! firebase-integration-service.js missing
)

if exist "firebase-credentials.json" (
    echo OK Firebase credentials found
) else (
    echo ! Firebase credentials not configured (optional)
)

echo.
echo Checking dependencies...
if exist "node_modules" (
    echo OK node_modules found
) else (
    echo ! node_modules missing - run: npm install
)

echo.
echo ============================================================
echo   TEST COMPLETE
echo ============================================================
echo.
echo If you see any X marks above, please fix those issues.
echo ! marks are warnings (optional features).
echo.
echo To start the system, run: LAUNCH_SYSTEM.bat
echo.
pause
