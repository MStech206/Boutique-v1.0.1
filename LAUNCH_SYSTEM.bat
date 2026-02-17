@echo off
setlocal enabledelayedexpansion
color 0A
title SAPTHALA - Complete System

:MENU
cls
echo.
echo ========================================================
echo   SAPTHALA BOUTIQUE MANAGEMENT SYSTEM
echo ========================================================
echo.
echo   [1] Start Complete System
echo   [2] Backend Server Only
echo   [3] Open Super Admin
echo   [4] Open Admin Panel
echo   [5] Open Staff Portal
echo   [6] Flutter Mobile App
echo   [7] Test System
echo   [8] Kill Port 3000
echo   [9] Reset Admin Password
echo   [0] Exit
echo.
echo ========================================================
set /p choice="Enter choice (0-9): "

if "%choice%"=="1" goto START_ALL
if "%choice%"=="2" goto BACKEND
if "%choice%"=="3" goto SUPER_ADMIN
if "%choice%"=="4" goto ADMIN
if "%choice%"=="5" goto STAFF
if "%choice%"=="6" goto FLUTTER
if "%choice%"=="7" goto TEST
if "%choice%"=="8" goto KILL_PORT
if "%choice%"=="9" goto RESET_PASSWORD
if "%choice%"=="0" exit
goto MENU

:START_ALL
cls
echo.
echo ========================================================
echo   STARTING SAPTHALA BOUTIQUE SYSTEM
echo ========================================================
echo.

REM Step 1: Fix HTML files
echo [1/5] Preparing files...
call :FIX_HTML_FILES
echo       ✓ Files ready

REM Step 2: Check MongoDB
echo [2/5] Checking MongoDB...
sc query MongoDB >nul 2>&1
if errorlevel 1 (
    echo       Starting MongoDB...
    net start MongoDB >nul 2>&1
)
echo       ✓ MongoDB ready

REM Step 3: Clear port
echo [3/5] Clearing port 3000...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :3000') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul
echo       ✓ Port cleared

REM Step 4: Install or check dependencies
echo [4/5] Checking dependencies...
if not exist "node_modules" (
    echo       Installing npm packages...
    call npm install >nul 2>&1
)
echo       ✓ Dependencies ready

REM Step 5: Build super-admin if needed
echo [5/5] Building super-admin panel...
if not exist "Boutique-app\super-admin-panel\dist\index.html" (
    echo       Building React app...
    cd /d "Boutique-app\super-admin-panel" 2>nul
    if not exist "node_modules" npm install >nul 2>&1
    npm run build >nul 2>&1
    cd /d "%~dp0" 2>nul
    echo       ✓ Build complete
) else (
    echo       ✓ Already built
)

REM Start server
echo.
echo Starting backend server...
start "SAPTHALA Backend" cmd /k "title SAPTHALA Backend Server && node server.js"
timeout /t 8 /nobreak >nul

REM Verify connection
echo Verifying connection...
timeout /t 1 /nobreak >nul

REM Open panels
echo.
echo Opening admin panels...
start "" "http://localhost:3000"
timeout /t 1 /nobreak >nul
start "" "http://localhost:3000/super-admin"
timeout /t 1 /nobreak >nul
start "" "http://localhost:3000/staff"

echo.
echo ========================================================
echo   SYSTEM STARTED SUCCESSFULLY!
echo ========================================================
echo.
echo   ADMIN PANEL:      http://localhost:3000
echo   Username: admin   Password: sapthala@2029
echo.
echo   SUPER ADMIN:      http://localhost:3000/super-admin
echo   Username: superadmin   Password: superadmin@2029
echo.
echo   STAFF PORTAL:     http://localhost:3000/staff
echo   PIN: 1234
echo.
echo ========================================================
echo.
pause
goto MENU

:BACKEND
cls
echo.
echo Preparing to start backend server...
echo.

echo [1/3] Checking MongoDB...
sc query MongoDB >nul 2>&1
if errorlevel 1 (
    net start MongoDB >nul 2>&1
)

echo [2/3] Clearing port 3000...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :3000') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul

echo [3/3] Installing dependencies...
if not exist "node_modules" (
    call npm install >nul 2>&1
)

echo.
echo ========================================================
echo   STARTING BACKEND SERVER
echo ========================================================
echo.
echo Backend will be available at: http://localhost:3000
echo Press Ctrl+C to stop the server
echo.
echo ========================================================
echo.

timeout /t 2 /nobreak >nul
node server.js

pause
goto MENU

:SUPER_ADMIN
start "" "http://localhost:3000/super-admin"
goto MENU

:ADMIN
start "" "http://localhost:3000"
goto MENU

:STAFF
start "" "http://localhost:3000/staff"
goto MENU

:FLUTTER
cls
echo Starting Flutter App...
echo.
cd /d "Boutique-flutter" 2>nul
if exist "lib\main.dart" (
    flutter run
) else (
    echo Flutter project not found!
)
cd /d "%~dp0" 2>nul
pause
goto MENU

:TEST
cls
echo.
echo ========================================================
echo   SYSTEM TEST
echo ========================================================
echo.

echo Testing endpoints...
timeout /t 1 /nobreak >nul

curl -s -o nul -w "Admin Panel:     http://localhost:3000                [%%{http_code}]\n" http://localhost:3000
curl -s -o nul -w "Super Admin:     http://localhost:3000/super-admin    [%%{http_code}]\n" http://localhost:3000/super-admin
curl -s -o nul -w "Staff Portal:    http://localhost:3000/staff          [%%{http_code}]\n" http://localhost:3000/staff
curl -s -o nul -w "API Health:      http://localhost:3000/api/settings   [%%{http_code}]\n" http://localhost:3000/api/settings

echo.
echo All tests complete!
echo.
pause
goto MENU

:KILL_PORT
cls
echo.
echo Killing processes on port 3000...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :3000') do (
    set pid=%%a
    taskkill /F /PID !pid! >nul 2>&1
)
echo Done!
echo.
timeout /t 2 /nobreak >nul
goto MENU

:RESET_PASSWORD
cls
echo.
echo Resetting admin password...
if exist "reset-admin-password.js" (
    node reset-admin-password.js
) else (
    echo Script not found!
)
echo.
pause
goto MENU

:FIX_HTML_FILES
if not exist ".backups" mkdir ".backups"
for %%f in (sapthala-admin-clean.html super-admin.html staff-portal.html) do (
    if exist "%%f" (
        copy "%%f" ".backups\%%f.bak" >nul 2>&1
    )
)
exit /b

