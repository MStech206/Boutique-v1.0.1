@echo off
setlocal enabledelayedexpansion
color 0B
title SAPTHALA - First Time Setup

cls
echo.
echo ============================================================
echo   SAPTHALA BOUTIQUE - FIRST TIME SETUP
echo   Firebase Integration Wizard
echo ============================================================
echo.
echo This wizard will help you set up your system for the first time.
echo.
echo What this setup will do:
echo   1. Verify system requirements
echo   2. Install dependencies
echo   3. Configure Firebase
echo   4. Build admin panels
echo   5. Test system
echo.
echo ============================================================
echo.
set /p continue="Ready to begin? (Y/N): "
if /i not "%continue%"=="Y" (
    echo Setup cancelled.
    pause
    exit /b 0
)

echo.
echo ============================================================
echo   STEP 1: System Verification
echo ============================================================
echo.
echo Checking system requirements...
echo.

node --version >nul 2>&1
if errorlevel 1 (
    echo X Node.js not found!
    echo.
    echo Please install Node.js from: https://nodejs.org
    echo After installation, run this setup again.
    echo.
    pause
    exit /b 1
)
echo OK Node.js installed

npm --version >nul 2>&1
if errorlevel 1 (
    echo X npm not found!
    echo.
    pause
    exit /b 1
)
echo OK npm installed
echo.

echo.
echo ============================================================
echo   STEP 2: Install Dependencies
echo ============================================================
echo.
echo Installing Node.js packages...
echo This may take a few minutes...
echo.

call npm install
if errorlevel 1 (
    echo X Dependency installation failed!
    echo.
    pause
    exit /b 1
)
echo.
echo OK Dependencies installed successfully
echo.

echo.
echo ============================================================
echo   STEP 3: Firebase Configuration
echo ============================================================
echo.
echo Firebase Setup Instructions:
echo.
echo 1. Go to: https://console.firebase.google.com
echo 2. Create a new project (or select existing)
echo 3. Enable Firestore Database
echo 4. Go to Project Settings ^> Service Accounts
echo 5. Click "Generate New Private Key"
echo 6. Save the JSON file as "firebase-credentials.json"
echo 7. Place it in this directory: %CD%
echo.
set /p hasFirebase="Do you have firebase-credentials.json ready? (Y/N): "

if /i "%hasFirebase%"=="Y" (
    if exist "firebase-credentials.json" (
        echo OK Firebase credentials found
        echo.
        echo Running Firebase setup wizard...
        echo.
        node setup-firebase-integration.js
        if errorlevel 1 (
            echo.
            echo X Firebase setup failed
            echo Please check your credentials and try again
            echo.
            pause
            exit /b 1
        )
    ) else (
        echo.
        echo X firebase-credentials.json not found in current directory
        echo Please place the file here and run setup again
        echo.
        pause
        exit /b 1
    )
) else (
    echo.
    echo ! Firebase not configured
    echo.
    echo The system will work with MongoDB only.
    echo You can configure Firebase later by running:
    echo   node setup-firebase-integration.js
    echo.
    pause
)

echo.
echo ============================================================
echo   STEP 4: Build Admin Panels
echo ============================================================
echo.
echo Building Super Admin React panel...
echo.

if exist "Boutique-app\super-admin-panel\package.json" (
    cd /d "Boutique-app\super-admin-panel"
    
    echo Installing Super Admin dependencies...
    call npm install
    
    echo Building production bundle...
    call npm run build
    
    cd /d "%~dp0"
    
    if exist "Boutique-app\super-admin-panel\dist\index.html" (
        echo OK Super Admin panel built successfully
    ) else (
        echo ! Super Admin build may have issues
        echo The system will still work with fallback panel
    )
) else (
    echo ! Super Admin source not found
    echo Using fallback super-admin.html
)
echo.

echo.
echo ============================================================
echo   STEP 5: System Verification
echo ============================================================
echo.
echo Running system verification...
echo.

node verify-system.js
if errorlevel 1 (
    echo.
    echo ! Some issues found, but system may still work
    echo Check the output above for details
    echo.
) else (
    echo.
    echo OK System verification passed!
    echo.
)
echo.

echo.
echo ============================================================
echo   STEP 6: Setup Complete
echo ============================================================
echo.
echo OK System is ready to use!
echo.
echo Default admin credentials:
echo   Username: admin
echo   Password: sapthala@2029
echo.
echo These will be created automatically on first server start.
echo.

echo.
echo ============================================================
echo   SETUP COMPLETE!
echo ============================================================
echo.
echo OK System is ready to use!
echo.
echo Next steps:
echo.
echo 1. Launch the system:
echo    Run: LAUNCH_SYSTEM.bat
echo.
echo 2. Access the panels:
echo    - Super Admin: http://localhost:3000/super-admin
echo    - Admin Panel: http://localhost:3000
echo    - Staff Portal: http://localhost:3000/staff
echo.
echo 3. Login credentials:
echo    - Admin: admin / sapthala@2029
echo    - Super Admin: Use Firebase email
echo    - Staff: Contact admin for credentials
echo.
echo 4. Read the documentation:
echo    - Quick Start: QUICK_START.md
echo    - Full Guide: FIREBASE_INTEGRATED_SYSTEM_README.md
echo.
echo ============================================================
echo.
set /p launch="Would you like to launch the system now? (Y/N): "

if /i "%launch%"=="Y" (
    echo.
    echo Launching SAPTHALA Boutique System...
    timeout /t 2 /nobreak >nul
    call LAUNCH_SYSTEM.bat
) else (
    echo.
    echo You can launch the system anytime by running:
    echo   LAUNCH_SYSTEM.bat
    echo.
)

echo.
echo Press any key to exit...
pause >nul
exit /b 0
