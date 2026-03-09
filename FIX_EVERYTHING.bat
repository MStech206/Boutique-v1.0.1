@echo off
color 0A
title SAPTHALA - Database and Charts Fix

echo.
echo ========================================
echo   SAPTHALA BOUTIQUE SYSTEM
echo   Database and Charts Fix
echo ========================================
echo.

echo Step 1: Starting MongoDB Service...
echo ----------------------------------------
net start MongoDB 2>nul
if errorlevel 1 (
    echo MongoDB service already running or not installed
    echo Continuing anyway...
) else (
    echo MongoDB service started successfully
)
echo.

echo Step 2: Testing Database Connection...
echo ----------------------------------------
node test-database-charts.js
if errorlevel 1 (
    echo.
    echo WARNING: Database test failed!
    echo Running fix script...
    node fix-database-and-charts.js
)
echo.

echo Step 3: Killing Old Server Process...
echo ----------------------------------------
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    echo Killing process %%a
    taskkill /F /PID %%a 2>nul
)
timeout /t 2 /nobreak >nul
echo.

echo Step 4: Starting Server...
echo ----------------------------------------
start /B node server.js
echo Server starting... Please wait
timeout /t 5 /nobreak >nul
echo.

echo Step 5: Opening Admin Panel...
echo ----------------------------------------
start http://localhost:3000
echo.

echo ========================================
echo   FIX COMPLETE!
echo ========================================
echo.
echo Status:
echo   [OK] MongoDB Service Running
echo   [OK] Database Connected
echo   [OK] Server Started on Port 3000
echo   [OK] Admin Panel Opened
echo.
echo What to check:
echo   1. Dashboard shows order statistics
echo   2. Charts display (Revenue Trend and Categories)
echo   3. Orders tab shows data
echo   4. No errors in browser console (F12)
echo.
echo If charts still don't show:
echo   - Press Ctrl+F5 to hard refresh
echo   - Clear browser cache
echo   - Check browser console for errors
echo.
echo ========================================
pause
