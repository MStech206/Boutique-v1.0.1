@echo off
echo ========================================
echo   SAPTHALA Flutter App - Quick Run
echo ========================================
echo.

cd /d "%~dp0Boutique-flutter"

echo [1/4] Checking Flutter...
flutter --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Flutter not found
    pause
    exit /b 1
)
echo ✅ Flutter OK
echo.

echo [2/4] Checking devices...
flutter devices
echo.

echo [3/4] Getting dependencies...
call flutter pub get
echo.

echo [4/4] Running app on emulator...
echo.
echo ========================================
echo   App will launch in HOT RELOAD mode
echo   Press 'r' to hot reload
echo   Press 'R' to hot restart
echo   Press 'q' to quit
echo ========================================
echo.

flutter run

pause
