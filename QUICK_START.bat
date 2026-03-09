@echo off
color 0A
title SAPTHALA - Quick Start Guide

echo.
echo ============================================================
echo   SAPTHALA BOUTIQUE - QUICK START GUIDE
echo ============================================================
echo.
echo   ALL ISSUES FIXED! System is ready to use.
echo.
echo   WHAT WAS FIXED:
echo   1. Batch files no longer get stuck (removed pause)
echo   2. WhatsApp opens automatically after order creation
echo   3. PDF preview works from order form
echo   4. WhatsApp sharing includes PDF link
echo   5. Dashboard shows correct revenue
echo   6. Full admin access to all features
echo.
echo ============================================================
echo.
echo   QUICK START (Choose an option):
echo.
echo   [1] Start System Now
echo   [2] View Documentation
echo   [3] Test WhatsApp Feature
echo   [4] Exit
echo.
echo ============================================================
set /p choice="Enter choice (1-4): "

if "%choice%"=="1" goto START
if "%choice%"=="2" goto DOCS
if "%choice%"=="3" goto TEST
if "%choice%"=="4" exit /b 0
goto END

:START
echo.
echo Starting SAPTHALA system...
call LAUNCH_SYSTEM.bat
goto END

:DOCS
echo.
echo Opening documentation...
start "" "ALL_ISSUES_FIXED_SUMMARY.md"
start "" "ADMIN_PANEL_COMPLETE_FIX.md"
start "" "WHATSAPP_FEATURE_COMPLETE.md"
echo.
echo Documentation opened in your default editor!
timeout /t 3 /nobreak >nul
goto END

:TEST
echo.
echo Opening WhatsApp test guide...
start "" "TEST_WHATSAPP_REDIRECT.bat"
goto END

:END
echo.
echo ============================================================
echo   Thank you for using SAPTHALA Boutique System!
echo ============================================================
echo.
timeout /t 2 /nobreak >nul
exit /b 0
