@echo off
echo ========================================
echo  DELETING DEFAULT BRANCHES
echo ========================================
echo.
echo This will delete:
echo  - SAPTHALA.JNTU
echo  - SAPTHALA.KPHB
echo  - SAPTHALA.MAIN
echo.
pause

echo.
echo Deleting branches...

curl -X DELETE http://localhost:3000/api/admin/delete-default-branches -H "Content-Type: application/json"

echo.
echo.
echo ========================================
echo  BRANCHES DELETED!
echo ========================================
echo.
pause
