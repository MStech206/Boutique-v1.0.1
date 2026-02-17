@echo off
color 0E
title SAPTHALA - Complete System Test

echo ========================================
echo   SAPTHALA SYSTEM TEST
echo ========================================
echo.

echo [TEST 1] Sub-Admin Loading
echo Opening admin panel...
start "" "http://localhost:3000"
timeout /t 2 >nul
echo Click Sub-Admins tab and verify it loads
echo.

echo [TEST 2] Branches Section
echo Scroll down in Sub-Admins tab
echo Verify Branches section is visible
echo Click + Add Branch and test
echo.

echo [TEST 3] Reports Branch Selection
echo Click Reports tab
echo Verify Branch dropdown is populated
echo Select a branch and click Show Report
echo.

echo [TEST 4] Super Admin Panel (React)
echo Starting React super admin...
cd /d "%~dp0Boutique-app\super-admin-panel"
start "" "http://localhost:5173"
echo.

echo ========================================
echo   MANUAL TESTING CHECKLIST
echo ========================================
echo.
echo [ ] Sub-Admins load without errors
echo [ ] Branches section visible below Sub-Admins
echo [ ] Can create new branch
echo [ ] Reports branch dropdown populated
echo [ ] Can filter reports by branch
echo [ ] Super admin panel opens at :5173
echo.
echo ========================================
pause
