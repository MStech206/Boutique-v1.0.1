@echo off
REM ============================================================
REM FIREBASE DATABASE MIGRATION - MASTER CONTROL
REM Migrates MongoDB to Firebase Firestore
REM Fixes authentication and admin panel issues
REM ============================================================

color 0A
title FIREBASE MIGRATION - SAPTHALA BOUTIQUE

echo.
echo ============================================================
echo   FIREBASE DATABASE MIGRATION TOOL
echo   Migrating to Firestore ^& Fixing Admin Panel
echo ============================================================
echo.

REM Check if firebase-credentials.json exists
if not exist "firebase-credentials.json" (
    echo.
    echo [ERROR] firebase-credentials.json not found!
    echo.
    echo TO FIX:
    echo 1. Go to: https://console.firebase.google.com
    echo 2. Select: boutique-staff-app
    echo 3. Settings (gear icon) ^> Service Accounts
    echo 4. Click: "Generate New Private Key"
    echo 5. Save downloaded JSON as: firebase-credentials.json
    echo 6. Place in current directory
    echo.
    pause
    exit /b 1
)

echo [OK] Firebase credentials found
echo.

REM Kill existing Node processes
echo [1/5] Stopping existing server...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Install dependencies
echo [2/5] Installing Firebase Admin SDK...
call npm install firebase-admin mongoose --save >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed

REM Run migration
echo [3/5] Running database migration...
echo ============================================================
call node migrate-to-firebase-complete.js
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Migration failed!
    pause
    exit /b 1
)
echo [OK] Migration completed

REM Start server
echo.
echo [4/5] Starting server with Firebase...
cd /d "%~dp0"
start cmd /k "node server.js"
timeout /t 3 /nobreak >nul

REM Open admin panel
echo [5/5] Opening admin panel...
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo.
echo ============================================================
echo   MIGRATION COMPLETE!
echo ============================================================
echo.
echo [OK] Admin panel: http://localhost:3000
echo [OK] Login email: mstechno2323@gmail.com
echo [OK] Password: superadmin@123
echo.
echo [OK] Your data is now in Firebase Firestore
echo [OK] Admin panel should now work correctly
echo.
echo Press any key to continue...
pause >nul
