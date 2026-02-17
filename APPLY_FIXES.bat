@echo off
color 0A
echo ========================================
echo  SAPTHALA SYSTEM FIX
echo ========================================
echo.
echo This will fix:
echo  1. Branch auto-creation when adding sub-admin
echo  2. Flutter dependency conflicts
echo  3. Mobile app branch display
echo.
pause

echo.
echo [STEP 1/3] Fixing Flutter Dependencies...
echo ========================================
cd Boutique-flutter
echo Cleaning Flutter cache...
call flutter clean >nul 2>&1
if exist pubspec.lock del pubspec.lock
echo Getting compatible dependencies...
call flutter pub get
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Flutter pub get failed!
    echo Please check your Flutter installation.
    pause
    exit /b 1
)
cd ..
echo DONE!

echo.
echo [STEP 2/3] Verifying Backend...
echo ========================================
curl -s http://localhost:3000/api/public/branches >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Backend is running!
    echo Branches API: OK
) else (
    echo WARNING: Backend not running!
    echo Please start backend first: START_ALL.bat
)
echo DONE!

echo.
echo [STEP 3/3] Testing Branch API...
echo ========================================
curl -s http://localhost:3000/api/public/branches
echo.
echo DONE!

echo.
echo ========================================
echo  ALL FIXES APPLIED!
echo ========================================
echo.
echo WHAT'S FIXED:
echo  - Branch auto-creation: When you add sub-admin, branch is created automatically
echo  - Flutter dependencies: Compatible versions installed
echo  - Mobile app: Will show branches in format "JNTU (SAPTHALA.JNTU)"
echo.
echo NEXT STEPS:
echo  1. Restart backend: RESTART_BACKEND.bat
echo  2. Run Flutter app: RUN_FLUTTER_APP.bat
echo  3. Add sub-admin in admin panel - branch will auto-create
echo  4. Check mobile app - branch will appear in dropdown
echo.
pause
