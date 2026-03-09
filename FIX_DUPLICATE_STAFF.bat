@echo off
REM SAPTHALA Boutique - Comprehensive Duplicate Staff Fix
REM This script removes duplicates, invalid roles, and cleans up workflow stages

echo.
echo ========================================
echo SAPTHALA BOUTIQUE - DUPLICATE STAFF FIX
echo ========================================
echo.
echo This script will:
echo   1. Remove staff with measuring/designing roles
echo   2. Remove duplicate staff (keep one per role per branch)
echo   3. Clean up invalid workflow stages
echo   4. Update orders to remove invalid workflow tasks
echo.
echo Starting in 3 seconds...
echo.
timeout /t 3 /nobreak

node fix-duplicate-staff-comprehensive.js

if errorlevel 1 (
    echo.
    echo ❌ Fix script failed!
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ Fix Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Restart the server: node server.js
echo   2. Refresh your browser
echo   3. Verify no duplicate staff appear in dropdowns
echo.
echo Press any key to continue...
pause
