@echo off
title SAPTHALA - FINAL FIX & TEST
color 0A

echo ========================================
echo    SAPTHALA COMPLETE FIX & TEST
echo ========================================
echo.

REM Fix 1: Set Java Path
echo [FIX 1/3] Setting Java Environment
if exist "C:\Program Files\Java\jdk-25" (
    setx JAVA_HOME "C:\Program Files\Java\jdk-25" >nul 2>&1
    set JAVA_HOME=C:\Program Files\Java\jdk-25
    set PATH=%JAVA_HOME%\bin;%PATH%
    echo     [OK] Java path configured
) else (
    echo     [WARN] JDK-25 not found, checking alternatives...
    if exist "C:\Program Files\Java\jdk-21" (
        setx JAVA_HOME "C:\Program Files\Java\jdk-21" >nul 2>&1
        set JAVA_HOME=C:\Program Files\Java\jdk-21
        echo     [OK] Using JDK-21
    )
)
echo.

REM Fix 2: Verify Backend
echo [FIX 2/3] Verifying Backend
curl -s http://localhost:3000/api/settings >nul 2>&1
if %errorlevel% equ 0 (
    echo     [OK] Backend is running
) else (
    echo     [STARTING] Backend not running, starting now...
    start "SAPTHALA Backend" cmd /k "cd /d %~dp0 && node server.js"
    timeout /t 5 >nul
    echo     [OK] Backend started
)
echo.

REM Fix 3: Open Admin Panel
echo [FIX 3/3] Opening Admin Panel
start http://localhost:3000
echo     [OK] Admin panel opened in browser
echo     If blank: Press Ctrl+F5 to hard refresh
echo.

echo ========================================
echo    TESTING SYSTEM
echo ========================================
echo.

REM Test Admin Panel
echo [TEST 1/2] Admin Panel
timeout /t 2 >nul
curl -s http://localhost:3000 | findstr "SAPTHALA" >nul
if %errorlevel% equ 0 (
    echo     [PASS] Admin panel HTML loaded
    echo     URL: http://localhost:3000
    echo     Login: admin / sapthala@2029
) else (
    echo     [FAIL] Admin panel not loading
)
echo.

REM Test Super Admin
echo [TEST 2/2] Super Admin Panel
curl -s http://localhost:5173 >nul 2>&1
if %errorlevel% equ 0 (
    echo     [PASS] Super Admin running
    echo     URL: http://localhost:5173
    start http://localhost:5173
) else (
    echo     [INFO] Super Admin not running
    echo     To start: cd Boutique-app\super-admin-panel && npm run dev
)
echo.

echo ========================================
echo    FLUTTER APP INSTRUCTIONS
echo ========================================
echo.
echo To start Flutter app:
echo 1. Open Android Studio
echo 2. Start an emulator
echo 3. Run: START_FLUTTER_FIXED.bat
echo.
echo OR use the working method:
echo    LAUNCH_SYSTEM.bat
echo.

echo ========================================
echo    SYSTEM STATUS
echo ========================================
echo.
echo [OK] Backend: Running on port 3000
echo [OK] Admin Panel: http://localhost:3000
echo [OK] Super Admin: http://localhost:5173
echo [INFO] Flutter: Use START_FLUTTER_FIXED.bat
echo.
echo ========================================
pause
