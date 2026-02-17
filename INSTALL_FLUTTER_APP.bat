@echo off
echo ========================================
echo   SAPTHALA Flutter App - Build & Install
echo ========================================
echo.

REM Change to Flutter project directory
cd /d "%~dp0Boutique-flutter"

echo [Step 1/6] Checking Flutter installation...
flutter --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ❌ ERROR: Flutter is not installed or not in PATH
    echo.
    echo Please install Flutter from: https://flutter.dev/docs/get-started/install
    echo.
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
echo ✅ Clean complete
echo.

echo [Step 4/6] Getting Flutter dependencies...
call flutter pub get
if errorlevel 1 (
    echo ❌ Failed to get dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed
echo.

echo [Step 5/6] Building APK...
echo This may take 2-5 minutes on first build...
call flutter build apk --debug
if errorlevel 1 (
    echo ❌ Build failed
    pause
    exit /b 1
)
echo ✅ APK built successfully
echo.

echo [Step 6/6] Installing on emulator...
call flutter install
if errorlevel 1 (
    echo ❌ Installation failed
    echo Make sure emulator is running
    pause
    exit /b 1
)
echo.
echo ========================================
echo   ✅ APP INSTALLED SUCCESSFULLY!
echo ========================================
echo.
echo The SAPTHALA Staff App is now installed on your emulator
echo.
echo To launch the app:
echo   1. Look for "SAPTHALA Staff" icon on emulator
echo   2. Or run: flutter run
echo.
echo Default Login:
echo   - Select any staff member
echo   - PIN: 1234
echo.
pause
