@echo off
color 0A
title File Verification

echo.
echo ========================================================
echo   VERIFYING FILES ARE CLEAN
echo ========================================================
echo.

powershell -Command "$files = @('sapthala-admin-clean.html', 'super-admin.html', 'staff-portal.html', 'create-subadmin.html', 'public\js\branches-manager.js'); $allClean = $true; foreach ($f in $files) { if (Test-Path $f) { $content = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8); $hasBOM = $content.StartsWith([char]0xFEFF); $hasIllegal = $content -match '[\uF4C5\uFEFF]'; if ($hasBOM -or $hasIllegal) { Write-Host \"FAIL: $f has illegal characters\" -ForegroundColor Red; $allClean = $false } else { Write-Host \"PASS: $f is clean\" -ForegroundColor Green } } else { Write-Host \"MISSING: $f not found\" -ForegroundColor Yellow } }; if ($allClean) { Write-Host \"`nALL FILES ARE CLEAN!\" -ForegroundColor Green } else { Write-Host \"`nSOME FILES HAVE ISSUES!\" -ForegroundColor Red }"

echo.
echo ========================================================
pause
