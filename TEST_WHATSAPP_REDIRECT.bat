@echo off
color 0A
title Test WhatsApp Redirect Feature

echo.
echo ============================================================
echo   TESTING WHATSAPP REDIRECT AFTER ORDER CREATION
echo ============================================================
echo.

echo [1/3] Checking if server is running...
curl -s http://localhost:3000/api/settings >nul 2>&1
if errorlevel 1 (
    echo       X Server not running!
    echo       Please run: LAUNCH_SYSTEM.bat first
    pause
    exit /b 1
)
echo       OK Server is running

echo [2/3] Opening admin panel...
timeout /t 2 /nobreak >nul
start "" "http://localhost:3000"

echo [3/3] Test Instructions:
echo.
echo ============================================================
echo   HOW TO TEST:
echo ============================================================
echo.
echo   1. Login to admin panel (admin / sapthala@2029)
echo   2. Go to "New Order" tab
echo   3. Fill in customer details with phone number
echo   4. Select garment and complete order form
echo   5. Click "Create Order"
echo.
echo   EXPECTED RESULT:
echo   - Success message appears
echo   - WhatsApp opens in NEW TAB automatically
echo   - Pre-filled message with order details
echo   - Ready to send to customer
echo.
echo ============================================================
echo.
echo Test complete! Check the results above.
timeout /t 2 /nobreak >nul
exit /b 0
