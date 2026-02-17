@echo off
title SAPTHALA System Test
color 0E

echo ========================================
echo    SAPTHALA SYSTEM - COMPLETE TEST
echo ========================================
echo.

REM Test 1: Backend
echo [TEST 1/5] Backend Server (localhost:3000)
curl -s http://localhost:3000/api/settings >nul 2>&1
if %errorlevel% equ 0 (
    echo     [PASS] Backend is responding
    curl -s http://localhost:3000 | findstr "SAPTHALA" >nul
    if %errorlevel% equ 0 (
        echo     [PASS] Admin panel HTML is being served
    ) else (
        echo     [FAIL] Admin panel HTML not found
    )
) else (
    echo     [FAIL] Backend not responding
    echo     Fix: Run "node server.js"
)
echo.

REM Test 2: Admin Panel in Browser
echo [TEST 2/5] Opening Admin Panel in Browser
start http://localhost:3000
echo     [INFO] Admin panel opened in browser
echo     Check if page loads correctly
timeout /t 3 >nul
echo.

REM Test 3: Super Admin
echo [TEST 3/5] Super Admin Panel (localhost:5173)
curl -s http://localhost:5173 >nul 2>&1
if %errorlevel% equ 0 (
    echo     [PASS] Super Admin is running
    start http://localhost:5173
    echo     [INFO] Super Admin opened in browser
) else (
    echo     [FAIL] Super Admin not running
    echo     Fix: cd Boutique-app\super-admin-panel && npm run dev
)
echo.

REM Test 4: Flutter/Java Setup
echo [TEST 4/5] Flutter Environment
where flutter >nul 2>&1
if %errorlevel% equ 0 (
    echo     [PASS] Flutter is installed
) else (
    echo     [FAIL] Flutter not found
)

if exist "C:\Program Files\Java\jdk-25\bin\java.exe" (
    echo     [PASS] Java JDK-25 found
) else (
    echo     [FAIL] Java JDK-25 not found
)
echo.

REM Test 5: Emulator
echo [TEST 5/5] Android Emulator
adb devices | findstr "emulator" >nul
if %errorlevel% equ 0 (
    echo     [PASS] Emulator is running
) else (
    echo     [FAIL] Emulator not running
    echo     Fix: Start from Android Studio
)
echo.

echo ========================================
echo    TEST SUMMARY
echo ========================================
echo.
echo Next Steps:
echo 1. If admin panel blank: Press Ctrl+F5 in browser
echo 2. If Flutter fails: Run START_FLUTTER_FIXED.bat
echo 3. If super admin fails: cd Boutique-app\super-admin-panel && npm run dev
echo.
pause
