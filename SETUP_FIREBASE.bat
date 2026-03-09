@echo off
REM SAPTHALA Boutique - Firebase Setup & Sync in One Go
REM This will connect Firebase, sync all data, and make it work

echo.
echo ========================================
echo SAPTHALA BOUTIQUE - FIREBASE SETUP
echo ========================================
echo.
echo This will:
echo   1. Initialize Firebase connection
echo   2. Create Firestore collections
echo   3. Sync branches from MongoDB
echo   4. Sync staff members (deduplicated)
echo   5. Sync admin users
echo   6. Create settings
echo.
echo ⚠️  MAKE SURE:
echo   - Firebase credentials JSON is in project root
echo   - MongoDB is running (or will use defaults)
echo   - Node.js is installed
echo.
echo Starting in 3 seconds...
echo.
timeout /t 3 /nobreak

echo.
echo 🔥 Initializing Firebase setup...
echo.

node setup-firebase-comprehensive.js

if errorlevel 1 (
    echo.
    echo ❌ Setup failed!
    echo.
    echo ⚠️  TROUBLESHOOTING:
    echo.
    echo 1. Check if firebase-credentials.json exists in project root
    echo    If not, download it from Firebase Console:
    echo    - Go to Firebase Console
    echo    - Project Settings (gear icon)
    echo    - Service Accounts tab
    echo    - Click "Generate New Private Key"
    echo    - Save as firebase-credentials.json in project root
    echo.
    echo 2. Check if Node.js is installed:
    echo    node --version
    echo.
    echo 3. Check if firebase-admin package is installed:
    echo    npm install firebase-admin
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ FIREBASE SETUP COMPLETE!
echo ========================================
echo.
echo Next steps:
echo   1. Login to Firebase Console
echo   2. Check Firestore Database for your data
echo   3. Update .env file with GOOGLE_APPLICATION_CREDENTIALS
echo   4. Restart your server
echo.
echo Now run:
echo   node server.js
echo.
echo Press any key to continue...
pause
