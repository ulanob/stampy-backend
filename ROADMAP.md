# Stampy Roadmap

The full picture, from the current branch through to a deployed v1. Phases are sequential; items inside a phase are roughly ordered. Anything not in the current phase goes to the Backlog, not into the branch.

_Last updated: 2026-11-26_

**v1 goal:** walk near a saved vendor on an Android phone and receive a push notification about the cards you have there, backed by a deployed AWS stack.

**Sequence:** finish check-in, then auth, then push delivery (backend), then the mobile app, then AWS deployment.

---

## Done

- Schema, CRUD API (users, businesses, locations, stamp cards, gift cards)
- Event-sourced stamp and gift card state, derived via `SUM()`; idempotent, transactional event processing (`request_id`); overflow card creation
- `users.timezone` (column, model, DAO, validation)
- Notification eligibility pipeline: 8 checks (Chain of Responsibility), unit tests per check
- Notification service: get by id, list by user, `POST /notifications/:id/read`
- Concurrency primitives in the DAOs: `claimNotification` (compare-and-swap), `FOR UPDATE` on preferences, `recordNotificationsSent`, executor support on `createNotification`; 437 tests passing

---

## Phase 1: Check-in and notification core (done)

Branch: `feat/check-in`

- [x] **Notify transaction.** One `withTransaction`:
  1. Lock the user's preferences row (`FOR UPDATE`).
  2. Resolve the location's business and load the user's stamp and gift cards for it.
  3. Run `evaluateEligibility` per card.
  4. `claimNotification` per eligible card; on a win, include it in the message.
  5. `createNotification` (one per business per check-in), then `recordNotificationsSent`.
- [x] Pure `buildCheckInMessage` listing only eligible cards (e.g. "1 stamp card ready to be redeemed / 1 gift card with $2.54")
- [x] `POST /locations/:id/check-in`: location from the path, `user_id` from the body (until auth)
- [x] Remove `notification_time_sent` from `safeUpdates` in the stamp and gift card services, plus a test that `PATCH` ignores it
- [x] Lazy drift correction at check-in with `geo-tz`

**Decisions to hold to**

- The counter moves once per check-in, not once per card. A different local day (user's timezone) starts it at 0, matching `dailyCapCheck`.
- The preferences lock serializes check-ins but doesn't dedupe them. Dedupe comes from the card cooldown seeing the committed `notification_time_sent`, so a card with no cooldown notifies on every check-in.
- The notification row's card ids are set only when exactly one card is included.
- Write `notification_time_sent` from the JS `Date` used as `now`, never SQL `NOW()` (ms vs. µs precision breaks the compare-and-swap).
- Check-in stays synchronous for now (no EventBridge).
- Check-in resolves the timezone first, from the location's coordinates, and uses that single value for both eligibility and the daily counter's same-day check. Reading user.timezone after that point reintroduces the stale-zone bug a test caught earlier.

**Tests:** unit tests with mocked DAOs (cap stops the loop, ineligible cards skipped, lost claim adds nothing); an integration test with `Promise.all` of parallel check-ins proving one notification set and one counter increment.

---

## Phase 2: Authentication (current)

Branches: `feat/auth-jwt` first, then one branch per remaining step.

- [x] **Stampy AWS account:** dedicated `stampy-dev` account, region `ca-central-1`. <!-- confirm root MFA, budget alert, CLI are all done -->
- [x] **Cognito user pool:** email sign-in, public app client (SRP/refresh, `USER_PASSWORD_AUTH` dev only, code grant + PKCE).
  - [x] `COGNITO_REGION`, `COGNITO_USER_POOL_ID`, `COGNITO_APP_CLIENT_ID` are in `.env.example` (`cognitoConfig` reads only the pool ID and client ID; the region is read by the test helper)
- [x] **JWT verification** (`aws-jwt-verify`, access tokens, verifier injected so tests can fake it)
  - `token-verifier.ts` maps only token errors to 401 (allowlist). Infra failures (e.g. JWKS fetch) surface as 500s.
- [x] **Lazy user creation:** `getOrCreateUserByAuthId(sub)`, race-safe, rejects soft-deleted users with 403. `users.email` is nullable; `auth_provider_id` has a partial unique index.
- [x] **`requireAuth(request)` helper + `GET /api/v1/me`:** bearer parse, verify, get-or-create user, trimmed `UserResponse` (no `auth_provider_id`). Applied to `/me` only.
- [x] **Authenticated integration tests:** `authHeader()` in `src/__tests__/helpers/auth.ts` signs in a dedicated Cognito test user (`USER_PASSWORD_AUTH`) and caches the access token per test file. `testSeed` gives `user1` that user's `sub` as `auth_provider_id`.
- [ ] **Take `user_id` from the token, not the request body**, and scope every resource to the authenticated user. One commit per slice:
  - [ ] `POST /locations/:id/check-in` (newest route, clearest need)
  - [ ] `/users/:userId/...` routes (also fixes the `auth_provider_id` exposure)
  - [ ] Cards and events, then notifications
  - [ ] Businesses and locations: decide explicitly whether they're public or admin-only
- [ ] **Google federated login:** Google identity provider on the pool, plus a pre-sign-up Lambda that links a federated identity to an existing email/password user.

**Decisions to hold to**

- Verify access tokens only. The `sub` claim is the identity, never the email.
- One person has one `sub`. Federated sign-ins are linked to the existing user, not stored as duplicates.
- Token verification is local (cached JWKS), with no per-request call to Cognito.
- Auth is a `requireAuth` helper called from routes, not Next.js middleware (handlers need the resolved `User`, and auth is checked where data is accessed).
- 401 means a bad token; anything else the verifier hits (e.g. JWKS outage) is a 500, so clients don't log users out during an AWS incident.
- A soft-deleted user is rejected on login (403). Reactivation is a documented future option.
- API responses about a user go through `toUserResponse` (allowlist), so internal fields don't leak by default.
- Apple login is not in this phase. It waits for the Apple Developer account in Phase 4.
- Integration tests use a real Cognito token, not a fake verifier, so the real verification path (JWKS, client ID, token use) is exercised. The `TEST_COGNITO_*` values live only in `.env.test`.

**Backlog (from this phase)**

- Apply `toUserResponse` to existing `/users` routes (they still return `auth_provider_id` and are unauthenticated).
- `WWW-Authenticate: Bearer` header on 401 responses.
- 403 integration test (soft-deleted user): now possible with a second Cognito test user whose row is soft-deleted.
- `getOrCreateUserByAuthId` uses a placeholder `timezone: 'UTC'` and skips `validateTimezone`.
- `cognitoConfig` evaluates at import time. If `next build` fails on missing env vars, switch to a lazy `getCognitoConfig()`.
- `updateUserByID` with all-undefined updates surfaces a plain `Error` as a 500, not a 400.
- `lib/db.ts` still reads `process.env` directly (move it into config).
- Unify `seed.ts` (dev) and `testSeed.ts` into one seed. `seed()` also swallows errors, so it exits 0 on failure.
- No CI yet. Run `npm run check` (format, typecheck, lint, tests) before each commit.

## Phase 3: Push delivery (backend)

- [ ] `PushSender` interface with a fake implementation for tests
- [ ] `device_tokens` table and registration endpoint
- [ ] Status transitions: `pending` to `sent` or `failed`, set server-side
- [ ] Decide who sets `sent_at`
- [ ] Transition guards, including only allowing `sent` to `read`
- [ ] Real implementation on AWS SNS (not Expo's push service), wired up once the mobile app can receive pushes

---

## Phase 4: Mobile app (React Native, Expo)

- iOS and Android from one Expo codebase. The React web app is skipped: check-in depends on a phone's location services, so there is no web use case.
- Android is tested first, because it's the only device available. iOS needs a paid Apple Developer account and an iOS test device, so it follows once those exist. This is a testing constraint, not a scope cut.
- Estimate: about a month, planned as six weeks.

- [ ] **Geofence spike on the real phone before any screens**
- [ ] Geofence backend support: `geofenceService` (separate from the plain-CRUD `locationService`) for pooling multi-location businesses, filtering to valid geofences for the user, and diffing/syncing OS geofences (iOS and Android cap monitored regions at about 20, hence "closest 20")
- [ ] User-owned geofence radius; `user_location_preferences` (sparse: per-location opt-out and radius override only; opt-out affects geofencing and notifications, not stamp collection)
- [ ] Google Places API (New): resolve `place_id` at location creation, store our own data (address, hours, business, participation)
- [ ] Core screens: cards, events, notifications, preferences
- [ ] Timezone capture at signup (`Intl.DateTimeFormat().resolvedOptions().timeZone`)
- [ ] Expo OAuth redirect: register the app's custom scheme as a callback and sign-out URL on the Cognito app client
- [ ] Apple federated login (needs the Apple Developer account; ships with the iOS build)

---

## Phase 5: AWS deployment

- [ ] RDS PostgreSQL
- [ ] EventBridge, Lambda, SNS for async push
- [ ] Containerize the app (Docker) and set up a deployment pipeline
- [ ] Move check-in from synchronous to async if needed

---

## Backlog

Small and known, deliberately off the current branch.

- `init.sql`: add `DROP TABLE IF EXISTS gift_card_events;` before the `gift_cards` drop (re-running against a live DB fails)
- Allowlist request bodies in the business, location, and notification-preferences services (the DAOs build SQL column names from update keys)
- `read_at` timestamp column (split from the status enum)
- Direct unit tests for the remaining validators
- Standardize file naming (kebab-case DAOs and models vs. camelCase services)
- Reward field on `stamp_cards`; completion unlocks the reward but never auto-redeems it
- Docker Compose refinements for local dev
- README: replace the "Status & Roadmap" section with a link here; remove the React web app item
- Allowlist create bodies in the stamp and gift card services (POST currently forwards `notification_time_sent` to the INSERT)
- Switch Cognito's built-in email sender to SES before launch
- Disable `ALLOW_USER_PASSWORD_AUTH` on the Cognito app client before launch

## Deferred (revisit only with a trigger)

- Shared transaction/idempotency helper (Epic 4): wait for a third call site (Rule of Three)
- Check-in queue that collapses simultaneous check-ins into one notification listing nearby businesses
- Overlapping geofences: accepted for now (n overlapping geofences can send up to n notifications, bounded by the daily cap)
- Card combining, full event-sourcing for card metadata, route flattening

---

## Working agreements

- One branch per step, rebased on `main` (solo, so no merge commits).
- Single-line Conventional Commits (`feat:`, `refactor:`, `test:`, `docs:`).
- `npm run check` (typecheck, lint, tests) passes before every commit.
- YAGNI and Rule of Three: no abstraction until a real need or a third call site.
- The service layer owns validation; DAOs are pure data access.
- Gift cards and stamp cards mirror each other structurally.
- New ideas go to the Backlog first, not into the current branch.
