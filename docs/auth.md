# Auth Design & Flow

1. User uses phone number on Flutter app; app calls Firebase Phone auth.
2. On successful sign-in, Flutter obtains Firebase ID token via `user.getIdToken()`.
3. Flutter posts ID token to the backend `/auth/exchange` endpoint.
4. Backend verifies Firebase ID token with firebase-admin and reads `roles` from custom claims.
5. Backend issues a short-lived JWT (HS256) containing uid and roles for REST API authentication.
6. For role assignment, Admin uses `/admin/users/{uid}/roles` endpoint which sets Firebase custom claims via firebase-admin SDK.
7. On successful login the app will obtain an FCM token and call `POST /api/users/{uid}/fcm-token` to register the device token for push notifications.

Security notes:
- Store `JWT_SECRET` and PayU credentials in Secrets Manager / environment variables.
- Enforce admin endpoints with additional server-side checks.
- Use HTTPS everywhere and CSP where applicable.
