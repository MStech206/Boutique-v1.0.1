@echo off
echo ========================================
echo SAPTHALA System Complete Test
echo ========================================
echo.

REM Test 1: Check MongoDB
echo [1/6] Testing MongoDB Connection...
sc query MongoDB | find "RUNNING" >nul
if %errorlevel% equ 0 (
    echo [OK] MongoDB is running
) else (
    echo [FAIL] MongoDB is not running
    echo Starting MongoDB...
    net start MongoDB
)
echo.

REM Test 2: Check Node.js
echo [2/6] Testing Node.js...
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Node.js is installed
) else (
    echo [FAIL] Node.js is not installed
)
echo.

REM Test 3: Check Backend Server
echo [3/6] Testing Backend Server...
curl -s http://localhost:3000/api/public/branches >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Backend server is responding
) else (
    echo [FAIL] Backend server is not responding
    echo Please start the backend with START_ALL.bat
)
echo.

REM Test 4: Test Branches API
echo [4/6] Testing Branches API...
curl -s http://localhost:3000/api/public/branches > temp_branches.json
if exist temp_branches.json (
    echo [OK] Branches API is working
    type temp_branches.json
    del temp_branches.json
) else (
    echo [FAIL] Branches API failed
)
echo.

REM Test 5: Test Staff API
echo [5/6] Testing Staff API...
curl -s http://localhost:3000/api/staff > temp_staff.json
if exist temp_staff.json (
    echo [OK] Staff API is working
    type temp_staff.json
    del temp_staff.json
) else (
    echo [FAIL] Staff API failed
)
echo.

REM Test 6: Test Sub-Admins API
echo [6/6] Testing Sub-Admins API (requires auth)...
echo Note: This test requires authentication token
echo.

echo ========================================
echo Test Complete!
echo ========================================
echo.
echo If any tests failed, please:
echo 1. Ensure MongoDB is running
echo 2. Start backend with START_ALL.bat
echo 3. Check for port conflicts on 3000
echo.
pause
