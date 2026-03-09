@echo off
echo ========================================
echo SAPTHALA Boutique - Complete Fix Script
echo ========================================
echo.

echo Step 1: Fixing duplicate staff and branches...
node fix-duplicates.js
if errorlevel 1 (
    echo ERROR: Failed to fix duplicates
    pause
    exit /b 1
)

echo.
echo Step 2: Syncing data to Firebase...
node sync-to-firebase.js
if errorlevel 1 (
    echo ERROR: Failed to sync to Firebase
    pause
    exit /b 1
)

echo.
echo ========================================
echo All fixes completed successfully!
echo ========================================
echo.
echo You can now restart the server.
echo.
pause
