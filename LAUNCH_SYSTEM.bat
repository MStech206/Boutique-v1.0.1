@echo off
setlocal enabledelayedexpansion
color 0A
title SAPTHALA BOUTIQUE - System Launcher

:MENU
cls
echo.
echo ============================================================
echo   SAPTHALA BOUTIQUE MANAGEMENT SYSTEM
echo   Firebase-Integrated Multi-Panel System
echo ============================================================
echo.
echo   LAUNCH OPTIONS:
echo   [1] Start Complete System (Recommended)
echo   [2] Backend Server Only
echo   [3] Super Admin Panel
echo   [4] Admin Panel
echo   [5] Staff Portal
echo.
echo   MANAGEMENT:
echo   [8] Test System Health
echo   [9] Firebase Setup
echo   [C] Kill Port 3000
echo   [R] Reset Admin Password
echo.
echo   [0] Exit
echo.
echo ============================================================
set /p choice="Enter choice: "

if /i "%choice%"=="1" goto START_ALL
if /i "%choice%"=="2" goto BACKEND
if /i "%choice%"=="3" goto SUPER_ADMIN
if /i "%choice%"=="4" goto ADMIN
if /i "%choice%"=="5" goto STAFF
if /i "%choice%"=="8" goto TEST
if /i "%choice%"=="9" goto FIREBASE_SETUP
if /i "%choice%"=="C" goto KILL_PORT
if /i "%choice%"=="R" goto RESET_PASSWORD
if /i "%choice%"=="0" exit /b 0
goto MENU

:START_ALL
cls
echo.
echo ============================================================
echo   STARTING SAPTHALA BOUTIQUE SYSTEM
echo ============================================================
echo.

echo [1/6] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo       X Node.js not found! Please install Node.js
    pause
    goto MENU
)
echo       OK Node.js ready

echo [2/6] Checking Firebase...
if exist "firebase-credentials.json" (
    echo       OK Firebase credentials found
    set "GOOGLE_APPLICATION_CREDENTIALS=%CD%\firebase-credentials.json"
) else (
    echo       ! Firebase credentials not found (optional)
)
if exist ".env.firebase" (
    for /f "usebackq tokens=1,* delims==" %%A in (".env.firebase") do (
        if "%%A"=="GOOGLE_APPLICATION_CREDENTIALS" (
            if not "%%B"=="" (
                set "GOOGLE_APPLICATION_CREDENTIALS=%%B"
                echo       Using credentials from .env.firebase
            )
        )
    )
)

echo [3/6] Checking MongoDB...
sc query MongoDB >nul 2>&1
if errorlevel 1 (
    echo       ! MongoDB not running (using Firebase only)
) else (
    echo       OK MongoDB available
)

echo [4/6] Clearing port 3000...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :3000') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul
echo       OK Port cleared

echo [5/6] Checking dependencies...
if not exist "node_modules" (
    echo       Installing packages...
    call npm install >nul 2>&1
)
echo       OK Dependencies ready

:: Run normalization/fixes (safe, idempotent)
if exist "scripts\normalize-roles.js" (
    echo [*] Normalizing MongoDB roles...
    node scripts\normalize-roles.js 2>nul
)

if exist "scripts\fix-firestore-admin-roles.js" (
    echo [*] Normalizing Firestore roles...
    node scripts\fix-firestore-admin-roles.js 2>nul
)

echo [6/6] Starting backend server...
start "SAPTHALA Backend" cmd /k "title SAPTHALA Backend && node server.js"
timeout /t 8 /nobreak >nul

echo.
echo Opening admin panels...
timeout /t 2 /nobreak >nul
start "" "http://localhost:3000"
timeout /t 1 /nobreak >nul
start "" "http://localhost:3000/super-admin"
timeout /t 1 /nobreak >nul
start "" "http://localhost:3000/staff"

echo.
echo ============================================================
echo   SYSTEM STARTED SUCCESSFULLY!
echo ============================================================
echo.
echo   SUPER ADMIN:    http://localhost:3000/super-admin
echo   Email: mstechno2323@gmail.com (Firebase Auth)
echo.
echo   ADMIN PANEL:    http://localhost:3000
echo   Username: admin   Password: sapthala@2029
echo.
echo   STAFF PORTAL:   http://localhost:3000/staff
echo   Staff ID + PIN: 1234
echo.
echo   DATABASE: Firebase Firestore (Primary)
echo   FALLBACK: MongoDB (If available)
echo.
echo ============================================================
echo.
echo System started! Opening browser in 3 seconds...
timeout /t 3 /nobreak >nul
exit /b 0

:BACKEND
cls
echo.
echo ============================================================
echo   STARTING BACKEND SERVER
echo ============================================================
echo.

echo Checking port 3000...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :3000') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul

echo.
echo Backend will be available at: http://localhost:3000
echo Press Ctrl+C to stop the server
echo.
echo ============================================================
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

:TEST
cls
echo.
echo ============================================================
echo   SYSTEM HEALTH CHECK
echo ============================================================
echo.

echo Testing endpoints...
timeout /t 1 /nobreak >nul

curl -s -o nul -w "Admin Panel:     http://localhost:3000                [%%{http_code}]\n" http://localhost:3000 2>nul
curl -s -o nul -w "Super Admin:     http://localhost:3000/super-admin    [%%{http_code}]\n" http://localhost:3000/super-admin 2>nul
curl -s -o nul -w "Staff Portal:    http://localhost:3000/staff          [%%{http_code}]\n" http://localhost:3000/staff 2>nul
curl -s -o nul -w "API Health:      http://localhost:3000/api/settings   [%%{http_code}]\n" http://localhost:3000/api/settings 2>nul

echo.
echo All tests complete!
echo.
pause
goto MENU

:FIREBASE_SETUP
cls
echo.
echo ============================================================
echo   FIREBASE SETUP
echo ============================================================
echo.
echo Running Firebase setup wizard...
echo.

if exist "setup-firebase-integration.js" (
    node setup-firebase-integration.js
) else (
    echo X Setup script not found
)

echo.
pause
goto MENU

:KILL_PORT
cls
echo.
echo ============================================================
echo   KILLING PORT 3000
echo ============================================================
echo.

for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :3000') do (
    set pid=%%a
    taskkill /F /PID !pid! >nul 2>&1
    echo Killed process: !pid!
)

echo.
echo OK All processes on port 3000 terminated
echo.
timeout /t 2 /nobreak >nul
goto MENU

:RESET_PASSWORD
cls
echo.
echo ============================================================
echo   RESET ADMIN PASSWORD
echo ============================================================
echo.

if exist "reset-admin-password.js" (
    node reset-admin-password.js
) else (
    echo X Script not found
)

echo.
pause
goto MENU
