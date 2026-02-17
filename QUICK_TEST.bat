@echo off
color 0A
title SAPTHALA - Quick Test

echo ========================================
echo   TESTING ADMIN PANEL
echo ========================================
echo.

echo Starting backend...
start /min cmd /c "cd /d D:\Boutique && node server.js"
timeout /t 3 >nul

echo Opening admin panel...
start "" "http://localhost:3000"

echo.
echo ========================================
echo   TEST CHECKLIST
echo ========================================
echo.
echo [ ] Dashboard loads
echo [ ] Orders tab shows orders
echo [ ] Reports tab loads
echo [ ] Branch dropdown populated
echo [ ] Filter dropdown works
echo [ ] Search field works
echo [ ] Click order shows workflow
echo.
pause
