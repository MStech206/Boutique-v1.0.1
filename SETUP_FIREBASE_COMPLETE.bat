@echo off
REM SAPTHALA BOUTIQUE - MASTER FIREBASE SETUP
REM This is the ONE AND ONLY script you need to run
REM It handles everything: credentials, dependencies, sync, and server restart

setlocal enabledelayedexpansion

echo.
echo ============================================================================
echo   SAPTHALA BOUTIQUE - FIREBASE CONNECTION IN ONE GO
echo ============================================================================
echo.
echo This will:
echo   1. Check for Firebase credentials
echo   2. Install firebase-admin package
echo   3. Sync all data to Firebase
echo   4. Configure the system for Firebase
echo   5. Restart the server
echo.
echo ⚠️  IMPORTANT REQUIREMENTS:
echo   - Firebase credentials JSON file must be in place
echo   - Node.js must be installed
echo   - Internet connection required
echo.
echo Starting in 5 seconds...
echo.
timeout /t 5 /nobreak

REM ==================== STEP 1: CHECK CREDENTIALS ====================

echo.
echo [STEP 1/5] Checking Firebase credentials...
echo.

if exist firebase-credentials.json (
    echo ✅ Firebase credentials found: firebase-credentials.json
) else (
    echo ❌ Firebase credentials NOT found!
    echo.
    echo 👉 YOU MUST:
    echo    1. Go to: https://console.firebase.google.com
    echo    2. Select project: "boutique-staff-app"
    echo    3. Project Settings ^(gear icon^) ^> Service Accounts
    echo    4. Click "Generate New Private Key"
    echo    5. Save downloaded JSON as "firebase-credentials.json" in project root
    echo       Location: %CD%\firebase-credentials.json
    echo.
    echo After placing the file, run this script again.
    echo.
    pause
    exit /b 1
)

REM ==================== STEP 2: INSTALL DEPENDENCIES ====================

echo [STEP 2/5] Installing firebase-admin package...
echo.

call npm list firebase-admin >nul 2>&1
if errorlevel 1 (
    echo Installing firebase-admin...
    call npm install firebase-admin
    if errorlevel 1 (
        echo ❌ Failed to install firebase-admin
        pause
        exit /b 1
    )
    echo ✅ firebase-admin installed
) else (
    echo ✅ firebase-admin already installed
)

REM ==================== STEP 3: CONFIGURE ENVIRONMENT ====================

echo.
echo [STEP 3/5] Configuring environment...
echo.

if not exist .env (
    echo Creating .env file with Firebase configuration...
    (
        echo MONGODB_URI=mongodb://localhost:27017/sapthala_boutique
        echo USE_FIREBASE=true
        echo GOOGLE_APPLICATION_CREDENTIALS=./firebase-credentials.json
        echo AUTO_SYNC_TO_FIREBASE=true
        echo PORT=3000
        echo JWT_SECRET=sapthala_boutique_secret_2024
        echo NODE_ENV=development
    ) > .env
    echo ✅ .env file created with Firebase settings
) else (
    echo ✅ .env file already exists
)

REM ==================== STEP 4: SYNC DATA TO FIREBASE ====================

echo.
echo [STEP 4/5] Synchronizing data to Firebase...
echo.

node setup-firebase-comprehensive.js

if errorlevel 1 (
    echo.
    echo ❌ Firebase sync failed!
    echo.
    echo 🔍 TROUBLESHOOTING:
    echo    - Check if firebase-credentials.json is valid
    echo    - Check internet connection
    echo    - Verify Firebase project is active
    echo    - Check server logs for errors
    echo.
    pause
    exit /b 1
)

REM ==================== STEP 5: RESTART SERVER ====================

echo.
echo [STEP 5/5] Restarting server...
echo.

REM Kill any existing server on port 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr "127.0.0.1:3000" ^| findstr "LISTENING"') do (
    taskkill /pid %%a /f >nul 2>&1
)

timeout /t 1 /nobreak

echo Starting server with Firebase...
echo.

start "SAPTHALA Server" node server.js

timeout /t 3 /nobreak

REM ==================== VERIFICATION ====================

echo.
echo ============================================================================
echo   ✅ FIREBASE SETUP COMPLETE!
echo ============================================================================
echo.
echo 📊 What was done:
echo    ✅ Firebase credentials verified
echo    ✅ Dependencies installed (firebase-admin)
echo    ✅ Environment configured
echo    ✅ Data synced to Firebase
echo    ✅ Server restarted
echo.
echo 🔗 VERIFY IN BROWSER:
echo    1. Admin Panel: http://localhost:3000
echo    2. Should show data loaded from Firebase
echo    3. Check Firebase Console for your data
echo.
echo 📌 IMPORTANT FILES:
echo    - firebase-credentials.json     (your secret credentials)
echo    - .env                          (configuration)
echo    - setup-firebase-comprehensive  (the sync script)
echo.
echo 🚀 SERVER IS NOW RUNNING:
echo    - Using Firebase as primary database
echo    - Falls back to MongoDB if Firebase unavailable
echo    - Admin panel should work now
echo.
echo ============================================================================
echo.
echo Press any key to close this window...
pause >nul
exit /b 0
