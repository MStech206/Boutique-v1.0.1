@echo off
echo.
echo ========================================
echo   FIXING TASK ASSIGNMENT
echo ========================================
echo.
echo Assigning staff_001 to see tasks...
node fix-staff-001.js
echo.
echo Reassigning existing tasks...
node reassign-tasks.js
echo.
echo ========================================
echo   DONE!
echo ========================================
echo.
echo Now refresh staff portal: http://localhost:3000/staff
echo Login: staff_001 / 1234
echo.
pause
