@echo off
echo ========================================
echo SAPTHALA BOUTIQUE - SERVER TEST SCRIPT
echo ========================================
echo.

echo 1. Testing server startup...
echo.

cd /d "d:\Boutique 1 issue\Boutique"

echo Starting server...
timeout /t 2 /nobreak >nul

start /b node server.js

echo Waiting for server to start...
timeout /t 5 /nobreak >nul

echo.
echo 2. Testing server endpoints...
echo.

echo Testing health endpoint...
curl -s http://localhost:3000/api/health

echo.
echo.
echo Testing Firestore health endpoint...
curl -s http://localhost:3000/api/health/firestore

echo.
echo.
echo 3. Opening admin panel...
echo.

start http://localhost:3000

echo.
echo ========================================
echo TEST COMPLETE
echo ========================================
echo.
echo The server should now be running with:
echo - Fixed syntax errors
echo - Firestore admin panel as default
echo - MongoDB fallback support
echo.
echo Check the browser for the admin panel.
echo.
pause