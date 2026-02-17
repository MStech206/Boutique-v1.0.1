# Setup dev environment for Sapthala (Windows PowerShell)

Write-Host "1) Install Flutter: https://docs.flutter.dev/get-started/install/windows"
Write-Host "2) Install Firebase CLI: npm i -g firebase-tools"
Write-Host "3) Set GOOGLE_APPLICATION_CREDENTIALS env var to Firebase service account JSON"
Write-Host "4) Set PayU sandbox keys as env vars: PAYU_MERCHANT_KEY, PAYU_MERCHANT_SALT"
Write-Host "5) Start Firebase emulators: firebase emulators:start --only auth,firestore,storage"
Write-Host "6) In backend: mvn -Dspring-boot.run.profiles=dev spring-boot:run"
Write-Host "7) In frontend: flutter pub get && flutter run"
