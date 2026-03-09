@echo off
echo ========================================
echo MONGODB CONNECTION TEST
echo ========================================
echo.

echo Checking if MongoDB is running...
sc query MongoDB | find "RUNNING" >nul
if %errorlevel% == 0 (
    echo [32m✓ MongoDB service is running[0m
) else (
    echo [33m! MongoDB service is not running[0m
    echo.
    echo Starting MongoDB service...
    net start MongoDB
    if %errorlevel% == 0 (
        echo [32m✓ MongoDB started successfully[0m
    ) else (
        echo [31m✗ Failed to start MongoDB[0m
        echo.
        echo Please install MongoDB from:
        echo https://www.mongodb.com/try/download/community
        echo.
        pause
        exit /b 1
    )
)

echo.
echo Testing MongoDB connection...
node test-mongodb.js

echo.
pause
