# Firebase Cloud Functions (sapthala-functions)

Usage (dev):
1. Install firebase-tools: `npm i -g firebase-tools`
2. From this folder, run `npm install` to install dependencies.
3. Use `firebase emulators:start --only functions,firestore,auth` for local testing.
5. Run integration tests (requires running emulators + backend): From repo root run `.
un-integration-tests.ps1` (Windows PowerShell) which will start emulators, backend and run the Node integration test.

6. Deploy with `firebase deploy --only functions` when ready.

This function listens to `orders/{orderId}` document creations and sends FCM notifications and a small analytics record.