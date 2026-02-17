# Orchestrates local integration test using Firebase emulators and backend.
# Usage:
# 1) Ensure firebase-tools (npm i -g firebase-tools) and Java/Maven are installed.
# 2) Update the project id used by the emulators in firebase.json if necessary.
# 3) Run: .\run-integration-tests.ps1
# This will:
# - Start Firebase emulator (firestore + functions) in a new window
# - Start backend (Spring Boot) in a new window
# - Wait for services to be ready and then run the Node integration test

# Check for firebase CLI
if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: 'firebase' CLI not found in PATH. Install via 'npm i -g firebase-tools' and try again." -ForegroundColor Red
    exit 1
}

Write-Host "Starting Firebase emulators (functions + firestore)..."
$firebaseProc = Start-Process -FilePath "firebase" -ArgumentList "emulators:start --only firestore,functions --project=sapthala-test" -NoNewWindow -PassThru

Start-Sleep -Seconds 6
Write-Host "Starting backend (Spring Boot)..."
# Resolve actual backend folder (supports Boutique-backend)
$backendPath = Resolve-Path "..\Boutique-backend" -ErrorAction SilentlyContinue
if (-not $backendPath) {
    $backendPath = Resolve-Path "..\sapthala-backend" -ErrorAction SilentlyContinue
}
if (-not $backendPath) {
    Write-Host "ERROR: backend folder not found (tested ../Boutique-backend and ../sapthala-backend)." -ForegroundColor Red
    exit 1
}
$backendProc = Start-Process -FilePath "mvn" -ArgumentList "-Dspring-boot.run.profiles=dev spring-boot:run" -WorkingDirectory $backendPath -NoNewWindow -PassThru

Write-Host "Waiting for services to be ready (polling /health)..."
$maxWait = 30
$wait = 0
while ($wait -lt $maxWait) {
    try {
        $resp = Invoke-WebRequest -UseBasicParsing -Uri http://localhost:8080/health -TimeoutSec 3 -ErrorAction Stop
        if ($resp.StatusCode -eq 200) { Write-Host "Backend healthy."; break }
    }
    catch { }
    Start-Sleep -Seconds 2
    $wait += 2
}
if ($wait -ge $maxWait) { Write-Host "Warning: backend /health did not respond within timeout." -ForegroundColor Yellow }


Write-Host "Running integration test (functions/integration_test.js)..."
Push-Location "functions"
npm install
npm run integration-test
$exitCode = $LASTEXITCODE
Pop-Location

if ($exitCode -eq 0) {
    Write-Host "Integration tests passed"
}
else {
    Write-Host ("Integration tests failed (exit code: {0})" -f $exitCode)
}

Write-Host "Note: Firebase emulator and backend processes are still running in separate windows. Stop them manually when done."
















