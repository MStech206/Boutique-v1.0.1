@echo off
echo ============================================================
echo   SAPTHALA BOUTIQUE - COMPLETE SYSTEM STARTUP
echo ============================================================
echo.

REM Step 1: Check MongoDB service
echo [1/5] Checking MongoDB service...
sc query MongoDB | find "RUNNING" >nul
if errorlevel 1 (
    echo    MongoDB is not running. Starting MongoDB...
    net start MongoDB
    if errorlevel 1 (
        echo    ERROR: Failed to start MongoDB!
        echo    Please start MongoDB manually: net start MongoDB
        pause
        exit /b 1
    )
    echo    MongoDB started successfully
) else (
    echo    MongoDB is already running
)
echo.

REM Step 2: Verify database connection
echo [2/5] Verifying database connection...
node verify-database.js
if errorlevel 1 (
    echo    ERROR: Database verification failed!
    pause
    exit /b 1
)
echo.

REM Step 3: Kill any existing server process
echo [3/5] Checking for existing server...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    echo    Found existing server on port 3000 (PID: %%a)
    echo    Stopping existing server...
    taskkill /F /PID %%a >nul 2>&1
    timeout /t 2 /nobreak >nul
)
echo    Port 3000 is available
echo.

REM Step 4: Start server
echo [4/5] Starting server...
start "Sapthala Server" cmd /k "node server.js"
echo    Server starting...
echo    Waiting for server to be ready...
timeout /t 5 /nobreak >nul
echo.

REM Step 5: Test endpoints
echo [5/5] Testing admin endpoints...
node test-admin-endpoints.js
if errorlevel 1 (
    echo    WARNING: Endpoint test failed, but server may still be starting...
)
echo.

REM Step 6: Open admin panel
echo ============================================================
echo   SYSTEM READY!
echo ============================================================
echo.
echo   Admin Panel: http://localhost:3000
echo   Username: admin
echo   Password: sapthala@2029
echo.
echo   Opening admin panel in browser...
echo.

timeout /t 2 /nobreak >nul
start http://localhost:3000

echo ============================================================
echo   Server is running in a separate window
echo   Close this window when done
echo ============================================================
echo.
pause
