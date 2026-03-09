# MongoDB / Mongoose Usage Report

Summary of locations that still reference Mongo/Mongoose and recommended next steps for full removal. DataFlowService has been migrated to Firestore in this change — the rest in this list should be converted next.

## Already migrated in this PR
- `services/dataFlowService.js` — migrated from Mongoose → Firestore (auto-assign, notifications, staff tasks)
- `server.js` — now invokes `DataFlowService` when Firestore is available

## Files that still reference Mongoose / MongoDB (priority list)
- `server.js` — many endpoints still query Mongoose models (orders, staff, users, branches, reports, dashboard). These should be rewritten to use `firebaseIntegrationService` equivalents.
  - Examples: super-admin dashboard (countDocuments/aggregate), `/api/public/reports/last-orders` (Mongo fallback), reports endpoints that use `Order.aggregate`.

- `database.js` — defines Mongoose models and exports them. After migration this can be removed.
- `scripts/*` (migration, reconcile, verify, test-*.js) — numerous scripts use `mongoose` and `mongoose.connection`. Convert or retire as needed.
  - `scripts/reconcile-orders-firestore-mongo.js`
  - `sync-mongodb-to-firestore.js`, `migrate-to-firebase-complete.js`, `migrate.js`, `setup-firebase-comprehensive.js`, etc.
- `test-*.js` and `scripts/*-mongodb.js` — unit/integration tests referencing Mongo must be updated to use Firestore emulator or removed.
- `firebase-config.js` and startup helpers — contain optional Mongo fallback logic (safe to keep short-term but should be removed later).

## Recommended migration plan (short → medium term)
1. Replace critical read endpoints used by UI with Firestore (dashboard, reports, orders list).
2. Update server-side aggregations (revenue trend, order categories) to compute from Firestore documents (use server-side map/reduce or Firestore aggregation queries).
3. Replace remaining Mongoose-based services (auth/login audit, analytics scripts) one-by-one and add unit tests using Firestore emulator.
4. Remove `mongoose` dependency and delete `database.js` once all usages are migrated.

## Tests added in this change
- `test-data-flow-firestore.js` — unit test validating auto-assignment + notifications using Firestore
- NPM script `test:e2e-dataflow` (runs `scripts/e2e-with-staff.js`) to validate end-to-end staff assignment flow

## Notes / Observations
- Many scripts currently **fall back to Mongo** when Firestore is unavailable (legacy support). After migration, remove fallback code paths and simplify startup logic.
- Querying `workflowTasks` (array-of-objects) is not directly indexable in Firestore (no `$elemMatch` equivalent). Several endpoints currently rely on Mongo's `$elemMatch`; for Firestore we filter orders client-side after fetching a reasonable window (existing code already does that in some places).

---
If you'd like, I can now:
- Convert the dashboard/report endpoints (revenue trend & order categories) to use Firestore and add E2E tests for them ✅
- Replace remaining high-priority Mongo endpoints in `server.js` (orders/reporting/staff) ✅
- Create a PR that deletes `mongoose` and `database.js` after migration is complete

Tell me which of the next steps you want me to do first.