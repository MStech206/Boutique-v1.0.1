@echo off
echo Testing Branch Synchronization...
echo.
echo 1. Testing Backend API:
curl -s http://localhost:3000/api/public/branches
echo.
echo.
echo 2. If branches show above, they will appear in Flutter app
echo 3. Run: flutter run
echo 4. Select branch from dropdown
echo.
pause
