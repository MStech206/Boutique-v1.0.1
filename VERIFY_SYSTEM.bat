@echo off
setlocal enabledelayedexpansion

color 0B
title SAPTHALA System Verification - Complete Check

echo.
echo ========================================================
echo   SAPTHALA SYSTEM VERIFICATION REPORT
echo ========================================================
echo.
echo Checking all components...
echo.

set passed=0
set failed=0
set warnings=0

REM Check 1: Admin Panel HTML exists
echo [CHECK 1] Admin Panel HTML File...
if exist "admin-complete.html" (
    echo ✓ admin-complete.html found
    set /a passed+=1
) else (
    echo ✗ admin-complete.html not found
    set /a failed+=1
)
echo.

REM Check 2: Super Admin HTML exists
echo [CHECK 2] Super Admin Fallback HTML...
if exist "super-admin.html" (
    echo ✓ super-admin.html found
    set /a passed+=1
) else (
    echo ✗ super-admin.html not found
    set /a warnings+=1
)
echo.

REM Check 3: Staff Portal HTML exists
echo [CHECK 3] Staff Portal HTML...
if exist "staff-portal.html" (
    echo ✓ staff-portal.html found
    set /a passed+=1
) else (
    echo ✗ staff-portal.html not found
    set /a failed+=1
)
echo.

REM Check 4: Super Admin React App Built
echo [CHECK 4] Super Admin React App Build...
if exist "Boutique-app\super-admin-panel\dist\index.html" (
    echo ✓ Super Admin React app built (dist/index.html found)
    if exist "Boutique-app\super-admin-panel\dist\assets" (
        echo ✓ Build assets directory exists
        set /a passed+=1
    ) else (
        echo ✗ Build assets missing
        set /a warnings+=1
    )
) else (
    echo ✗ Super Admin React app not built
    echo   Run: cd Boutique-app\super-admin-panel ^&^& npm run build
    set /a warnings+=1
)
echo.

REM Check 5: Server.js exists
echo [CHECK 5] Backend Server File...
if exist "server.js" (
    echo ✓ server.js found
    set /a passed+=1
) else (
    echo ✗ server.js not found
    set /a failed+=1
)
echo.

REM Check 6: Node modules installed
echo [CHECK 6] Node Modules...
if exist "node_modules" (
    echo ✓ Node modules installed
    set /a passed+=1
) else (
    echo ✗ Node modules missing
    echo   Run: npm install
    set /a warnings+=1
)
echo.

REM Check 7: LAUNCH_SYSTEM.bat exists
echo [CHECK 7] System Launcher...
if exist "LAUNCH_SYSTEM.bat" (
    echo ✓ LAUNCH_SYSTEM.bat found
    set /a passed+=1
) else (
    echo ✗ LAUNCH_SYSTEM.bat not found
    set /a failed+=1
)
echo.

REM Check 8: Database.js exists
echo [CHECK 8] Database Configuration...
if exist "database.js" (
    echo ✓ database.js found
    set /a passed+=1
) else (
    echo ✗ database.js not found
    set /a failed+=1
)
echo.

REM Check 9: Public folder structure
echo [CHECK 9] Public Assets Folder...
if exist "public" (
    echo ✓ public folder exists
    if exist "public\js" (
        echo ✓ public/js exists
        set /a passed+=1
    ) else (
        echo ⚠ public/js missing
        set /a warnings+=1
    )
) else (
    echo ✗ public folder not found
    set /a failed+=1
)
echo.

REM Summary
echo ========================================================
echo   VERIFICATION SUMMARY
echo ========================================================
echo Passed Checks:    !passed!
echo Failed Checks:    !failed!
echo Warnings:         !warnings!
echo.

if !failed! gtr 0 (
    echo ❌ CRITICAL ISSUES FOUND - FIX REQUIRED
) else if !warnings! gtr 0 (
    echo ⚠️  OK WITH WARNINGS - Review recommended
) else (
    echo ✅ ALL CHECKS PASSED - SYSTEM READY
)

echo.
echo ========================================================
echo Running System Tests...
echo ========================================================
echo.

REM Try to test server connectivity
timeout /t 1 /nobreak >nul
curl -s http://localhost:3000/api/settings >nul 2>&1
if errorlevel 1 (
    echo NOTE: Server is not currently running (this is normal)
    echo To start: Run LAUNCH_SYSTEM.bat and select Option 1
) else (
    echo ✓ Server is running and responding!
    echo.
    echo Website Status:
    curl -s -o nul -w "Admin Panel: %%{http_code}\n" http://localhost:3000
    curl -s -o nul -w "Super Admin: %%{http_code}\n" http://localhost:3000/super-admin
    curl -s -o nul -w "Staff Portal: %%{http_code}\n" http://localhost:3000/staff
    curl -s -o nul -w "API Status: %%{http_code}\n" http://localhost:3000/api/settings
)

echo.
echo ========================================================
pause

set ERRORS=0

REM Check Node.js
echo [1/6] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo   ❌ Node.js is NOT installed
    set /a ERRORS+=1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo   ✅ Node.js installed: %NODE_VERSION%
)

REM Check npm
echo [2/6] Checking npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo   ❌ npm is NOT installed
    set /a ERRORS+=1
) else (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo   ✅ npm installed: %NPM_VERSION%
)

REM Check MongoDB
echo [3/6] Checking MongoDB...
sc query MongoDB | find "RUNNING" >nul 2>&1
if errorlevel 1 (
    echo   ⚠️  MongoDB service is NOT running
    echo   💡 Start with: net start MongoDB
    set /a ERRORS+=1
) else (
    echo   ✅ MongoDB service is running
)

REM Check Flutter
echo [4/6] Checking Flutter...
flutter --version >nul 2>&1
if errorlevel 1 (
    echo   ❌ Flutter is NOT installed
    set /a ERRORS+=1
) else (
    echo   ✅ Flutter is installed
)

REM Check node_modules
echo [5/6] Checking dependencies...
if not exist "node_modules\" (
    echo   ⚠️  Node modules not installed
    echo   💡 Run: npm install
    set /a ERRORS+=1
) else (
    echo   ✅ Node modules installed
)

REM Check required files
echo [6/6] Checking project files...
set FILES_OK=1
if not exist "server.js" (
    echo   ❌ server.js not found
    set FILES_OK=0
)
if not exist "database.js" (
    echo   ❌ database.js not found
    set FILES_OK=0
)
if not exist "package.json" (
    echo   ❌ package.json not found
    set FILES_OK=0
)
if not exist "Boutique-flutter\pubspec.yaml" (
    echo   ❌ Flutter project not found
    set FILES_OK=0
)

if %FILES_OK%==1 (
    echo   ✅ All required files present
) else (
    set /a ERRORS+=1
)

echo.
echo  ========================================================
echo    VERIFICATION RESULTS
echo  ========================================================
echo.

if %ERRORS%==0 (
    echo   ✅ ALL CHECKS PASSED!
    echo.
    echo   Your system is ready to run SAPTHALA Boutique.
    echo.
    echo   Next steps:
    echo   1. Run: START_ALL.bat
    echo   2. Or manually:
    echo      - Terminal 1: npm start
    echo      - Terminal 2: cd Boutique-flutter ^&^& flutter run
    echo.
) else (
    echo   ❌ %ERRORS% ISSUE(S) FOUND
    echo.
    echo   Please fix the issues above before running the system.
    echo.
    echo   Common fixes:
    echo   - Install Node.js: https://nodejs.org/
    echo   - Install MongoDB: https://www.mongodb.com/try/download/community
    echo   - Install Flutter: https://flutter.dev/docs/get-started/install
    echo   - Run: npm install
    echo   - Start MongoDB: net start MongoDB
    echo.
)

echo  ========================================================
echo.

pause
