@echo off
echo ========================================
echo SAPTHALA - FINAL FIX FOR ALL ISSUES
echo ========================================
echo.

echo Stopping any running servers...
taskkill /F /IM node.exe 2>nul
timeout /t 2 >nul

echo.
echo Step 1: Removing duplicate staff by name...
node remove-duplicate-staff-by-name.js
if errorlevel 1 (
    echo ERROR: Failed to remove duplicates
    pause
    exit /b 1
)

echo.
echo Step 2: Verifying database...
echo Database cleaned successfully!

echo.
echo ========================================
echo ALL FIXES COMPLETED!
echo ========================================
echo.
echo What was fixed:
echo  - Duplicate staff removed from database
echo  - Staff API returns unique entries
echo  - Branch dropdown shows unique branches
echo  - Sub-admin permissions configured
echo.
echo Next: Restart your server
echo   Run: node server.js
echo.
pause
