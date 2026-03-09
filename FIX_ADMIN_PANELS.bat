@echo off
color 0A
title Fixing Admin Panel Issues

echo.
echo ============================================================
echo   FIXING ADMIN PANEL ISSUES
echo ============================================================
echo.
echo   Issues to fix:
echo   1. Super Admin 403 errors (authentication)
echo   2. Admin dashboard revenue not showing
echo   3. Super Admin refresh redirects to admin
echo.
echo ============================================================
echo.

echo [1/3] Checking server status...
curl -s http://localhost:3000/api/settings >nul 2>&1
if errorlevel 1 (
    echo       X Server not running - Please start server first
    echo       Run: node server.js
    pause
    exit /b 1
)
echo       OK Server is running

echo [2/3] Restarting server to apply fixes...
echo       Killing existing server...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul

echo       Starting server...
start "SAPTHALA Server" cmd /k "node server.js"
timeout /t 5 /nobreak >nul

echo [3/3] Opening panels...
start "" "http://localhost:3000"
timeout /t 2 /nobreak >nul
start "" "http://localhost:3000/super-admin"

echo.
echo ============================================================
echo   FIXES APPLIED!
echo ============================================================
echo.
echo   What was fixed:
echo   - Super Admin authentication
echo   - Dashboard revenue calculation
echo   - Refresh redirect issue
echo   - Chart display
echo.
echo   Test now:
echo   1. Login to admin panel (admin / sapthala@2029)
echo   2. Check dashboard shows revenue
echo   3. Go to super-admin panel
echo   4. Refresh - should stay on super-admin
echo.
echo ============================================================
echo.
timeout /t 3 /nobreak >nul
exit /b 0
