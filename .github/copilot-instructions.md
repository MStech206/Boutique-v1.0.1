# Sapthala Boutique — AI Agent Instructions

## 🎯 System Overview

**Sapthala Boutique** is a complete e-commerce platform for custom garment tailoring. It's a **three-tier monorepo** with:
- **Flutter** frontend (mobile + web) — customer & admin interfaces
- **Spring Boot** backend (Java) — REST APIs, Firebase integration
- **Express.js** optional service layer — JSON-based order management
- **Firebase** — auth, Firestore real-time database, Cloud Functions
- **Docker** — containerized local development

**Key insight**: This is NOT a typical microservices app. It's a purpose-built boutique system where orders flow from customers → admin → staff → delivery. Understand the **order lifecycle** first before making changes.

---

## 🏗️ Architecture Essentials

### Core Data Flow (Customer Journey)

```
Customer (Flutter App)
  ↓ POST /api/orders → {customer, items, notes}
Express Backend (orders-data.json)
  ↓ Generates Order ID (ORD-XXXXX)
Admin Panel (React + Vite)
  ↓ Admin marks payment received & confirms
Backend → Firebase Firestore
  ↓ Creates tasks for staff (Dye, Cutting, QC, Delivery)
Staff (Flutter or SMS/WhatsApp via baileys)
  ↓ Updates task status with photos
Customer (Flutter App)
  ↓ Sees real-time progress
```

**Critical file**: [ARCHITECTURE.md](../ARCHITECTURE.md) — read this for detailed diagrams and workflow stages.

### Multi-Brand Architecture

The system supports **SAPTHALA Main** (production boutique) and **SAPTHALA Tailoring** (demonstration). See [BRAND_SEPARATION_GUIDE.md](../BRAND_SEPARATION_GUIDE.md) for tenant isolation patterns.

---

## 📁 Project Structure & Component Roles

### Frontend: Boutique-flutter/ (Dart + Flutter)
**Purpose**: Mobile/web app for customers and admin staff  
**State Management**: Riverpod (StateNotifier + Provider pattern)  
**Key directories**:
- `lib/src/features/` — Feature modules (orders, products, auth, measurements)
- `lib/src/data/` — Riverpod providers and data models
- `lib/src/core/` — Theme, navigation, utilities

**Key pattern**: Every feature uses providers like `ref.watch(cartProvider)` and `ref.read(cartProvider.notifier).update(...)`.

### Backend: Boutique-backend/ (Spring Boot 3.1 + Java 17)
**Purpose**: REST API layer, Firebase integration, JWT auth  
**Key directories**:
- `src/main/java/com/sapthala/controller/` — REST endpoints (@RestController)
- `src/main/java/com/sapthala/service/` — Business logic (@Service)
- `src/main/java/com/sapthala/model/` — Domain entities
- `src/main/java/com/sapthala/security/` — JWT, Firebase verification

**Key endpoints**:
- `/auth/*` — Login/logout, token validation
- `/api/orders/*` — Order CRUD
- `/api/products/*` — Product catalog
- `/admin/users/*` — User management (role-based)

### Admin Panel: Root directory (React + TypeScript + Vite + TailwindCSS)
**Purpose**: Web dashboard for order management and analytics  
**Build**: `npm run dev` → http://localhost:3000  
**Key files**: `index.html`, `admin-panel.html`, `order-management-system.html`  
**Pattern**: Vanilla JS + Tailwind — NO build step dependencies for HTML panels (they're pure HTML/CSS/JS).

### Express Backend: backend-server.js (Optional)
**Purpose**: Simple JSON-based order store for quick prototyping  
**Storage**: `orders-data.json` (file-based, no DB)  
**Startup**: `node backend-server.js` → http://localhost:8080  
**Use case**: Used when Spring Boot is not running; fallback for demos.

---

## 🔑 Critical Developer Workflows

### Local Development Setup
```bash
# 1. Install dependencies
npm install                    # Root admin panel
cd Boutique-flutter && flutter pub get
cd ../Boutique-backend && mvn clean install

# 2. Start Firebase emulators
npx firebase-tools emulators:start --only auth,firestore

# 3. (Option A) Start all containers
docker-compose up --build

# 4. (Option B) Run services separately
cd Boutique-backend && mvn -Dspring-boot.run.profiles=dev spring-boot:run
cd Boutique-flutter && flutter run -d web
node backend-server.js

# 5. Access applications
Admin Panel: http://localhost:3000
Flutter Web: http://localhost:3000 (or emulator port)
Backend API: http://localhost:8080 (or 8081 if Docker)
Firebase Emulator UI: http://localhost:4000
```

### Build & Run
```bash
# Frontend (Vite React admin)
npm run dev         # Development server
npm run build       # Production build

# Backend (Spring Boot)
mvn spring-boot:run -Dspring-boot.run.profiles=dev
mvn clean package   # Build JAR

# Flutter
flutter pub get
flutter run -d web  # Web
flutter run -d chrome  # Chrome device

# Express (fallback)
node backend-server.js
```

### Testing
```bash
npm run integration-test      # Run integration tests
npm run lint                  # ESLint check
npm run type-check            # TypeScript validation
```

### Key Environment Variables
- `GOOGLE_APPLICATION_CREDENTIALS` — Path to Firebase service account JSON
- `JWT_SECRET` — JWT signing key (dev: "change_me", prod: strong random)
- `PAYU_MERCHANT_KEY`, `PAYU_MERCHANT_SALT` — Payment gateway credentials
- `FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST` — Emulator connection strings (Docker Compose sets these)

---

## 🔐 Authentication & Authorization

### Authentication Flow
1. **Firebase Auth** — User sign-up/login via phone/OTP or email
2. **ID Token** → Backend validates with Firebase Admin SDK
3. **JWT Token** ← Backend issues short-lived JWT (used in subsequent requests)
4. **Authorization** — JWT verified on protected endpoints

### User Roles (Firebase Custom Claims)
```json
{
  "role": "customer",  // or admin, designer, cutter, tailor, delivery
  "brand": "SAPTHALA Main"  // Tenant isolation
}
```

**Pattern**: Backend controller methods check claims via `@PreAuthorize` or custom filters. Admin features gated by role checks.

---

## 📦 Key Dependencies & Patterns

### Frontend (Flutter)
- `flutter_riverpod` — State management (use Provider + StateNotifier)
- `firebase_core`, `firebase_auth`, `cloud_firestore` — Firebase integration
- `http` — HTTP client for backend API calls
- Pattern: Wrap providers in `ref.watch()` in widgets, update via `ref.read(...notifier).method()`

### Backend (Spring Boot)
- `spring-boot-starter-web` — REST framework
- `spring-boot-starter-security` — JWT + authentication
- `firebase-admin` — Firebase SDK
- `jakarta.servlet-api` — Servlet API (Spring Boot 3)
- Pattern: Controllers → Services → (Firestore/DB), security filters validate JWT

### Admin Panel (React)
- `react@18`, `react-dom` — UI framework
- `vite` — Build tool (dev server, bundling)
- `tailwindcss` — Utility-first CSS
- Pattern: NO complex state manager—use vanilla React hooks or localStorage

---

## 🎨 Code Conventions & Patterns

### Naming Conventions
- **Dart files**: snake_case (e.g., `checkout_page.dart`)
- **Java files**: PascalCase classes, camelCase methods (e.g., `OrderController.java`, `getOrderById()`)
- **TypeScript/JS**: camelCase functions/vars, PascalCase components (e.g., `AdminPanel.tsx`)
- **Database collections**: snake_case, plural (e.g., `orders`, `products`, `users`)

### API Endpoints Pattern
```
POST   /api/orders              — Create order
GET    /api/orders              — List (admin only)
GET    /api/orders/:id          — Get single
PUT    /api/orders/:id          — Update
DELETE /api/orders/:id          — Delete

/admin/users                     — Admin-only endpoints
/auth/*                          — Public auth endpoints
```

### Error Handling
- **Backend**: Return JSON with `error` field and appropriate HTTP status (400, 401, 403, 500)
- **Frontend**: Handle errors in providers with try-catch, show user-friendly toast/snackbar
- **Example**: 
  ```java
  if (order == null) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
      .body(Map.of("error", "Order not found"));
  }
  ```

### State Management (Riverpod)
```dart
// Define a provider
final cartProvider = StateNotifierProvider<CartNotifier, List<CartItem>>((ref) {
  return CartNotifier();
});

// Use in widget
final cart = ref.watch(cartProvider);
ref.read(cartProvider.notifier).add(item);

// Combine providers
final totalProvider = FutureProvider((ref) async {
  final cart = ref.watch(cartProvider);
  return cart.fold(0, (sum, item) => sum + item.price);
});
```

---

## 🚀 Deployment & CI/CD

### GitHub Actions (CI/CD)
- `.github/workflows/ci.yml` — Runs tests, lints, builds on push
- `.github/workflows/integration.yml` — Integration test pipeline

### Docker Deployment
- Backend: `Boutique-backend/Dockerfile` (Java Spring Boot)
- Frontend: `Boutique-flutter/Dockerfile.web` + `nginx.conf` (Flutter Web)
- Compose: `docker-compose.yml` for local development

**Key insight**: Docker Compose connects services via hostnames (e.g., `http://firebase:9000` for Firestore emulator from backend container).

### AWS/Production
- Spring Boot → AWS ECS/EKS
- Flutter Web → AWS S3 + CloudFront
- Database → Cloud Firestore (prod, not emulator)

---

## ⚠️ Common Pitfalls & Solutions

### Issue: Backend can't reach Firebase
**Solution**: Ensure `GOOGLE_APPLICATION_CREDENTIALS` is set and JSON is valid. In Docker, pass via env var in `docker-compose.yml`.

### Issue: Order data lost after restart
**Solution**: Express backend uses `orders-data.json` (file-based). Spring Boot uses Firestore. For persistence, use Firestore or add database layer.

### Issue: CORS errors in frontend
**Solution**: Backend must enable CORS. Spring Security config should allow requests. Check `application.yml`.

### Issue: JWT token expired
**Solution**: JWT lifetime is short by design. Frontend should refresh on 401. Implement token refresh logic.

### Issue: Firebase emulator not connecting
**Solution**: Ensure `docker-compose` is running or `firebase-tools emulators:start` is active. Check ports 9000 (Firestore), 9099 (Auth).

---

## 🔍 Where to Find Things

| Need | File/Directory |
|------|------------|
| **Overall architecture** | [ARCHITECTURE.md](../ARCHITECTURE.md) |
| **Order workflows** | [ORDER_MANAGEMENT_GUIDE.md](../ORDER_MANAGEMENT_GUIDE.md) |
| **Brand/tenant logic** | [BRAND_SEPARATION_GUIDE.md](../BRAND_SEPARATION_GUIDE.md) |
| **Admin panel UI** | `index.html`, `admin-panel.html`, `order-management-system.html` |
| **Backend config** | `Boutique-backend/src/main/resources/application*.yml` |
| **Frontend state** | `Boutique-flutter/lib/src/data/` |
| **Products data** | `products-catalog.json` |
| **Orders data (Express)** | `orders-data.json` |
| **Setup instructions** | [SETUP.md](../SETUP.md), [QUICK_START.md](../QUICK_START.md) |

---

## 💡 Tips for AI Agents

1. **Read ARCHITECTURE.md first** — Understand the order lifecycle before proposing changes.
2. **Check brand separation** — Changes affecting tenants? See [BRAND_SEPARATION_GUIDE.md](../BRAND_SEPARATION_GUIDE.md).
3. **Multi-tier changes** — If modifying an API, update frontend AND backend AND tests.
4. **Firebase schema** — Changes to collections/fields? Update Firestore rules and models.
5. **Use existing patterns** — New Riverpod provider? Look at `cartProvider` or `authProvider` for examples.
6. **Local dev first** — Always test with `docker-compose up` or local dev server before proposing production changes.
7. **Preserve order IDs** — `ORD-XXXXX` format is used in admin UI, staff apps, and customer notifications. Don't change format.
8. **Environment-specific** — Dev uses Firebase emulator, prod uses real Firestore. Avoid hardcoding endpoints.

---

## 📋 Quick Reference: Common Tasks

### Add a New API Endpoint
1. **Backend**: Create method in `OrderController` (or relevant controller), use `@PostMapping`, `@GetMapping`, etc.
2. **Frontend**: Call endpoint in Riverpod provider or directly via `http.get()`.
3. **Admin Panel**: Add UI button/form if needed in HTML.
4. **Test**: Add to integration test if critical path.

### Add a New Firestore Collection
1. **Backend**: Add model class in `model/` directory.
2. **Firestore Rules**: Update `firestore.rules` (if using real Firestore).
3. **Frontend**: Fetch in Riverpod provider using `FirebaseFirestore.instance.collection('...').get()`.
4. **Documentation**: Update [ARCHITECTURE.md](../ARCHITECTURE.md) schema section.

### Add a New Feature Module (Flutter)
1. Create folder: `lib/src/features/new_feature/`
2. Add pages: `new_feature_page.dart`
3. Add data: `lib/src/data/new_feature_provider.dart`
4. Add to navigation in `lib/src/core/navigation/` (if needed).
5. Test with `flutter run -d web`.

### Fix a Bug in Admin Panel
1. Open relevant HTML file (`admin-panel.html`, `order-management-system.html`).
2. Check browser console for errors (F12).
3. Locate issue in inline JavaScript or API call.
4. Update JavaScript logic, test via http://localhost:3000 (Vite dev server).
5. Commit change with clear message referencing the symptom.

---

## 📞 Support

For questions on architecture, data flow, or deployment, refer to:
- **README.md** — Project overview
- **ARCHITECTURE.md** — Detailed system design
- **ORDER_MANAGEMENT_GUIDE.md** — Workflow documentation
- **SYSTEM_SETUP_GUIDE.md** — Environment setup
