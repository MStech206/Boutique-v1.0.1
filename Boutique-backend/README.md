# Sapthala Backend (sapthala-backend)

Spring Boot service that provides REST APIs for orders, users, payments, tasks and admin operations.

Quickstart (dev):
1. Install JDK 17+, Maven 3.8+
2. Set `GOOGLE_APPLICATION_CREDENTIALS` env var to your Firebase service account JSON path.
3. Configure PayU sandbox keys in `application-dev.yml` or env vars.
4. Provide a Firebase service account JSON and set `GOOGLE_APPLICATION_CREDENTIALS` to its path, then run `mvn -Dspring-boot.run.profiles=dev spring-boot:run`.

Key packages:
- com.sapthala.controller
- com.sapthala.service
- com.sapthala.repository
- com.sapthala.model

Security: verify Firebase ID tokens on login and issue short-lived JWTs for backend auth.
