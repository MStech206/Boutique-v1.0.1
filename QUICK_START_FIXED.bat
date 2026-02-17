@echo off
color 0A
title SAPTHALA - Quick Start After Fixes
echo.
echo ========================================
echo   SAPTHALA BOUTIQUE - QUICK START
echo   After System Fixes
echo ========================================
echo.

REM Check MongoDB
echo [1/4] Checking MongoDB...
sc query MongoDB | find "RUNNING" >nul
if %errorlevel% equ 0 (
    echo [OK] MongoDB is running
) else (
    echo [STARTING] MongoDB...
    net start MongoDB
    timeout /t 2 >nul
)
echo.

REM Start Backend
echo [2/4] Starting Backend Server...
start "SAPTHALA Backend" cmd /k "cd /d %~dp0 && node server.js"
echo [OK] Backend starting in new window...
timeout /t 3 >nul
echo.

REM Test Backend
echo [3/4] Testing Backend Connection...
timeout /t 2 >nul
curl -s http://localhost:3000/api/public/branches >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Backend is responding
) else (
    echo [WAIT] Backend still starting... (this is normal)
)
echo.

REM Open Browser
echo [4/4] Opening Admin Panel...
timeout /t 2 >nul
start http://localhost:3000
echo [OK] Admin panel opened in browser
echo.

echo ========================================
echo   SYSTEM READY!
echo ========================================
echo.
echo Admin Panel: http://localhost:3000
echo Staff Portal: http://localhost:3000/staff
echo.
echo Default Login:
echo   Username: admin
echo   Password: sapthala@2029
echo.
echo Staff Portal PIN: 1234
echo.
echo ========================================
echo   TESTING CHECKLIST
echo ========================================
echo.
echo [ ] 1. Login to Admin Panel
echo [ ] 2. Check Sub-Admins section (should load without errors)
echo [ ] 3. Check Staff section (should show all staff)
echo [ ] 4. Create a new sub-admin with branch
echo [ ] 5. Open Staff Portal in new tab
echo [ ] 6. Verify new branch appears in dropdown
echo [ ] 7. Login as staff member
echo [ ] 8. Verify tasks load correctly
echo [ ] 9. Delete sub-admin in Admin Panel
echo [ ] 10. Refresh Staff Portal - branch should be removed
echo.
echo ========================================
echo.
echo Press any key to view system logs...
pause >nul

REM Show logs
echo.
echo Fetching system status...
echo.
echo === Branches ===
curl -s http://localhost:3000/api/public/branches
echo.
echo.
echo === Staff Count ===
curl -s http://localhost:3000/api/staff | find "staffId" /c
echo.
echo.
pause
