# Stampy Roadmap

The full picture, from the current branch through to a deployed v1. Phases are sequential; items inside a phase are roughly ordered. Anything not in the current phase goes to the Backlog, not into the branch.

_Last updated: 2026-11-24_

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

## Phase 1: Check-in and notification core (current)

Branch: `feat/check-in`

- [ ] **Notify transaction (step 3).** One `withTransaction`:
  1. Lock the user's preferences row (`FOR UPDATE`).
  2. Resolve the location's business and load the user's stamp and gift cards for it.
  3. Run `evaluateEligibility` per card.
  4. `claimNotification` per eligible card; on a win, include it in the message.
  5. `createNotification` (one per business per check-in), then `recordNotificationsSent`.
- [ ] Pure `buildCheckInMessage` listing only eligible cards (e.g. "1 stamp card ready to be redeemed / 1 gift card with $2.54")
- [ ] `POST /locations/:id/check-in`: location from the path, `user_id` from the body (until auth)
- [ ] Remove `notification_time_sent` from `safeUpdates` in the stamp and gift card services, plus a test that `PATCH` ignores it
- [ ] Timezone capture at signup and lazy drift correction at check-in with `geo-tz`

**Decisions to hold to**

- Counter reset: a different local day (user's timezone) starts the counter at 0, matching `dailyCapCheck`.
- Cap within one run: track a running count in the loop so one check-in can't exceed the cap.
- Write `notification_time_sent` from the JS `Date` used as `now`, never SQL `NOW()` (ms vs. µs precision breaks the compare-and-swap).
- Check-in stays synchronous for now (no EventBridge).

**Tests:** unit tests with mocked DAOs (cap stops the loop, ineligible cards skipped, lost claim adds nothing); an integration test with `Promise.all` of parallel check-ins proving one notification set and one counter increment.

---

## Phase 2: Authentication

- [ ] AWS Cognito User Pools (email/password, built-in email verification) plus federated Google/Apple login
- [ ] JWT verification middleware (`aws-jwt-verify`) so services don't handle per-provider logic
- [ ] Take `user_id` from the token, not the request body
- [ ] Scope every resource to the authenticated user
- [ ] Replace the `// TODO: set from Cognito` placeholders (user creation)

---

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
- Plan first, then write the code yourself; Claude plans and reviews.
- YAGNI and Rule of Three: no abstraction until a real need or a third call site.
- The service layer owns validation; DAOs are pure data access.
- Gift cards and stamp cards mirror each other structurally.
- New ideas go to the Backlog first, not into the current branch.