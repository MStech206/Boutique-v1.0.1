@echo off
echo ========================================
echo   SAPTHALA Flutter App - Enhanced Launcher
echo ========================================
echo.

cd /d "%~dp0Boutique-flutter"

echo [Step 1/6] Checking Flutter installation...
flutter --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Flutter not found! Please install Flutter first.
    echo    Visit: https://flutter.dev/docs/get-started/install
    pause
    exit /b 1
)
echo ✅ Flutter is installed
echo.

echo [Step 2/6] Checking for connected devices...
flutter devices
echo.

echo [Step 3/6] Cleaning previous build...
call flutter clean
echo ✅ Clean completed
echo.

echo [Step 4/6] Getting dependencies...
call flutter pub get
echo ✅ Dependencies updated
echo.

echo [Step 5/6] Checking backend server...
echo    Backend should be running on http://localhost:3000
echo    If not running, press Ctrl+C and run START_ALL.bat first
timeout /t 3 >nul
echo.

echo [Step 6/6] Launching Flutter app...
echo.
echo ========================================
echo   🚀 Starting SAPTHALA Staff App
echo ========================================
echo.
echo   📱 Hot Reload: Press 'r'
echo   🔄 Hot Restart: Press 'R'
echo   🛑 Quit: Press 'q'
echo.
echo ========================================
echo.

flutter run

if errorlevel 1 (
    echo.
    echo ❌ Flutter run failed!
    echo.
    echo 💡 Troubleshooting:
    echo    1. Make sure Android emulator is running
    echo    2. Or connect a physical device with USB debugging
    echo    3. Check if backend is running on port 3000
    echo    4. Try: flutter doctor -v
    echo.
)

pause
