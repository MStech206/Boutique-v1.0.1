@echo off
echo ========================================
echo  FIXING FLUTTER DEPENDENCIES
echo ========================================
echo.

cd Boutique-flutter

echo [1/4] Cleaning Flutter cache...
flutter clean

echo.
echo [2/4] Removing old dependencies...
if exist pubspec.lock del pubspec.lock

echo.
echo [3/4] Getting compatible dependencies...
flutter pub get

echo.
echo [4/4] Verifying installation...
flutter doctor

echo.
echo ========================================
echo  DEPENDENCIES FIXED!
echo ========================================
echo.
echo Now run: RUN_FLUTTER_APP.bat
echo.
pause
