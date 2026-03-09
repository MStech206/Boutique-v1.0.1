@echo off
color 0A
echo ========================================
echo   SAPTHALA DATABASE FIX - ONE CLICK
echo ========================================
echo.

echo [Step 1/4] Checking MongoDB service...
sc query MongoDB | find "RUNNING" >nul
if %errorlevel% == 0 (
    echo [32m   ✓ MongoDB is running[0m
) else (
    echo [33m   ! MongoDB not running, starting...[0m
    net start MongoDB >nul 2>&1
    if %errorlevel% == 0 (
        echo [32m   ✓ MongoDB started successfully[0m
    ) else (
        echo [31m   ✗ Failed to start MongoDB[0m
        echo.
        echo   MongoDB is not installed!
        echo   Download from: https://www.mongodb.com/try/download/community
        echo.
        pause
        exit /b 1
    )
)

echo.
echo [Step 2/4] Testing MongoDB connection...
node test-mongodb.js >nul 2>&1
if %errorlevel% == 0 (
    echo [32m   ✓ MongoDB connection successful[0m
) else (
    echo [31m   ✗ MongoDB connection failed[0m
    echo.
    echo   Please check MongoDB installation
    pause
    exit /b 1
)

echo.
echo [Step 3/4] Starting server...
start "Sapthala Server" cmd /k "node server.js"
timeout /t 3 >nul
echo [32m   ✓ Server started[0m

echo.
echo [Step 4/4] Creating test orders...
timeout /t 2 >nul
node create-test-orders.js
if %errorlevel% == 0 (
    echo [32m   ✓ Test orders created successfully[0m
) else (
    echo [31m   ✗ Failed to create test orders[0m
)

echo.
echo ========================================
echo   DATABASE FIX COMPLETE!
echo ========================================
echo.
echo Opening admin panel...
timeout /t 2 >nul
start http://localhost:3000

echo.
echo [32mLogin with:[0m
echo   Username: admin
echo   Password: sapthala@2029
echo.
echo [32mCheck:[0m
echo   - Dashboard should show order count
echo   - Orders tab should show all orders
echo.
pause
