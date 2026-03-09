@echo off
echo.
echo ========================================
echo   SAPTHALA Backend Server Restart
echo ========================================
echo.

echo [1/3] Killing existing server on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo Killing PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo [2/3] Waiting 2 seconds...
timeout /t 2 /nobreak >nul

echo [3/3] Starting server...
echo.
:: If the user provided a service account JSON in Downloads, copy it into the repo
set "DOWNLOAD_SA=%USERPROFILE%\Downloads\super-admin-auth.json.json"
if exist "%DOWNLOAD_SA%" (
    echo Found service account at %DOWNLOAD_SA% — copying into repo firebase folder
    copy /Y "%DOWNLOAD_SA%" "Boutique-app\super-admin-backend\src\main\resources\firebase\super-admin-auth.json" >nul 2>&1
    if exist "Boutique-app\super-admin-backend\src\main\resources\firebase\super-admin-auth.json" (
        set "GOOGLE_APPLICATION_CREDENTIALS=%CD%\Boutique-app\super-admin-backend\src\main\resources\firebase\super-admin-auth.json"
        echo Set GOOGLE_APPLICATION_CREDENTIALS to %GOOGLE_APPLICATION_CREDENTIALS%
    ) else (
        echo Failed to copy service account into repo — continuing without copying
    )
) else (
    :: If not present in Downloads, but repo has a service account, use that
    if exist "Boutique-app\super-admin-backend\src\main\resources\firebase\super-admin-auth.json" (
        set "GOOGLE_APPLICATION_CREDENTIALS=%CD%\Boutique-app\super-admin-backend\src\main\resources\firebase\super-admin-auth.json"
        echo Using existing repo service account: %GOOGLE_APPLICATION_CREDENTIALS%
    )
)
:: Optionally run in Firestore-only mode by skipping MongoDB
set "SKIP_MONGO=true"
echo SKIP_MONGO=%SKIP_MONGO%

node server.js
