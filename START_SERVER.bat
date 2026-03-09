@echo off
title SAPTHALA - Start Server
color 0A

echo.
echo Killing port 3000...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :3000') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul

echo Starting server...
node server.js

pause
