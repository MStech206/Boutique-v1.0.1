@echo off
echo ========================================
echo   SAPTHALA Staff Mobile App Launcher
echo ========================================
echo.

cd Boutique-flutter

echo [1/5] Checking Flutter installation...
flutter --version
if errorlevel 1 (
    echo ERROR: Flutter is not installed or not in PATH
    pause
    exit /b 1
)

echo.
echo [2/5] Getting Flutter dependencies...
call flutter pub get

echo.
echo [3/5] Checking for connected devices...
flutter devices

echo.
echo [4/5] Starting Android emulator (if not running)...
echo Please wait for emulator to start...
timeout /t 5 /nobreak >nul

echo.
echo [5/5] Launching app...
echo.
echo ========================================
echo   App will launch on Android emulator
echo   Default login PIN: 1234
echo ========================================
echo.

flutter run

pause
