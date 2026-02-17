@echo off
setlocal enabledelayedexpansion

color 0A
title SAPTHALA System Test Suite

echo.
echo ========================================================
echo   SAPTHALA SYSTEM COMPREHENSIVE TEST
echo ========================================================
echo.

REM Count passed/failed tests
set passed=0
set failed=0

REM Test 1: Admin Panel
echo [TEST 1/4] Admin Panel (http://localhost:3000)
curl -s -o nul -w "Status: %%{http_code}\n" http://localhost:3000 | findstr "200" >nul
if errorlevel 1 (
    echo ✗ FAILED - Admin Panel not responding
    set /a failed+=1
) else (
    echo ✓ PASSED - Admin Panel responding (200)
    set /a passed+=1
)

REM Test 2: Super Admin Panel
echo.
echo [TEST 2/4] Super Admin Panel (http://localhost:3000/super-admin)
curl -s -o nul -w "Status: %%{http_code}\n" http://localhost:3000/super-admin | findstr "200" >nul
if errorlevel 1 (
    echo ✗ FAILED - Super Admin Panel not responding
    set /a failed+=1
) else (
    echo ✓ PASSED - Super Admin Panel responding (200)
    set /a passed+=1
)

REM Test 3: Staff Portal
echo.
echo [TEST 3/4] Staff Portal (http://localhost:3000/staff)
curl -s -o nul -w "Status: %%{http_code}\n" http://localhost:3000/staff | findstr "200" >nul
if errorlevel 1 (
    echo ✗ FAILED - Staff Portal not responding
    set /a failed+=1
) else (
    echo ✓ PASSED - Staff Portal responding (200)
    set /a passed+=1
)

REM Test 4: API
echo.
echo [TEST 4/4] API Connectivity (http://localhost:3000/api/settings)
curl -s -o nul -w "Status: %%{http_code}\n" http://localhost:3000/api/settings | findstr "200" >nul
if errorlevel 1 (
    echo ✗ FAILED - API not responding
    set /a failed+=1
) else (
    echo ✓ PASSED - API responding (200)
    set /a passed+=1
)

REM Summary
echo.
echo ========================================================
echo   TEST SUMMARY
echo ========================================================
echo Passed: !passed!/4
echo Failed: !failed!/4
echo.

if !failed! equ 0 (
    echo ✓ ALL TESTS PASSED - SYSTEM IS FULLY OPERATIONAL
) else (
    echo ⚠ SOME TESTS FAILED - CHECK THE SYSTEM
)

echo ========================================================
pause
