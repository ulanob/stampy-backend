# Stampy
A personal finance companion for tracking gift cards and stamp cards - and notifying you when you're near a vendor where you have rewards waiting.

## The Problem
Gift cards get forgotten in wallets. Stamp cards get lost. Rewards go unused and stamps are missed - not because people don't want to use them, but because they don't remember they have them until they're already somewhere else.

Stampy solves this with a simple idea: track your cards in one place, and get notified when you're physically close to a vendor where you have something to redeem.

---

## Status & Roadmap
> 🚧 Active development - learning project

**Done:**
- [x] Database schema design
- [x] CRUD API (users, businesses, locations, stamp cards, gift cards)
- [x] Event-sourced business logic layer (stamp progression via `stamp_card_events`, gift card balance via `gift_card_events`)
- [x] Idempotent, transactional event processing (request-id based replay safety)
- [x] Derive gift card `current_balance` from the event log (SUM-based, no cached column)
- [x] Derive stamp card `stamps_acquired` from the event log (same pattern; `reward_redeemed` resolved as a status-only event — see Design Decisions)
- [x] `users.timezone` column, model, and DAO support (create + update)

**In progress / not started:**
- [ ] Client-side timezone capture at signup (`Intl.DateTimeFormat().resolvedOptions().timeZone`) and lazy drift-correction wiring at geofence check-in (`geo-tz`) — column and DAO exist, the capture/correction call sites don't yet
- [ ] Location-based notification eligibility pipeline — checks scaffolded (`NotificationsEnabledCheck`, `QuietHoursCheck`, `DailyCapCheck`, `CardWindowCheck`, `CooldownCheck`, `ExpirationCheck`), pipeline wiring + tests pending
- [ ] Wire `notificationService` to the eligibility pipeline; synchronous geofence check-in evaluation (`POST /locations/:id/check-in`)
- [ ] Location-based notifications end-to-end (geofence check-in → eligibility → send)
- [ ] Shared transaction/idempotency helper (deferred — revisit if a third event-creation flow emerges; currently held at two call sites)
- [ ] Authentication - evaluating Amazon Cognito
- [ ] React web app
- [ ] React Native (Expo) mobile app (iOS + Android)
- [ ] Docker Compose refinements for local dev
- [ ] AWS deployment pipeline (RDS, EventBridge, Lambda, SNS)

---

## Tech Stack

### Backend
- **Next.js** (App Router) - REST API with file-based routing (`src/app/api/v1/...`)
- **PostgreSQL** - Raw SQL via `pg`, no ORM. Deliberate choice to build foundational understanding before abstracting it away
- **TypeScript** throughout
- **Docker Compose** - separate local dev and test database containers
- **Vitest** - unit tests; **Supertest** - integration tests against a running dev server

### Infrastructure (planned)
- **Amazon RDS** - Managed PostgreSQL hosting
- **Amazon Cognito** - Authentication
- **EventBridge + Lambda + SNS** - Scheduled push notifications to APNs/FCM
- **Docker** - Containerisation for local dev and deployment consistency

### Frontend (planned)
- **React** - browser-based web app
- **React Native (Expo)** - iOS and Android mobile app, from a single codebase

Both deferred until the backend is complete.

---

## Architecture

Layered architecture: thin route handlers → services (validation + business logic) → DAOs (raw SQL) → PostgreSQL.

```
src/
├── app/
│   └── api/
│       └── v1/
│           ├── businesses/
│           │   ├── [id]/route.ts
│           │   └── route.ts
│           ├── gift-cards/
│           │   ├── [id]/
│           │   │   ├── route.ts
│           │   │   └── gift-card-events/route.ts
│           │   └── route.ts
│           ├── locations/
│           │   ├── [id]/route.ts
│           │   └── route.ts
│           ├── notifications/
│           │   ├── [id]/route.ts
│           │   └── route.ts
│           ├── stamp-cards/
│           │   ├── [id]/
│           │   │   ├── route.ts
│           │   │   └── stamp-card-events/route.ts
│           │   └── route.ts
│           └── users/
│               ├── [userId]/
│               │   ├── gift-cards/route.ts
│               │   ├── notifications/route.ts
│               │   ├── preferences/route.ts
│               │   ├── stamp-cards/
│               │   │   ├── [cardId]/route.ts
│               │   │   └── route.ts
│               │   └── stamp-events/route.ts
│               └── route.ts
├── composition.ts          # wires DAOs → services, exported as singletons
├── dao/
│   ├── business.dao.ts
│   ├── gift-card-event.dao.ts
│   ├── gift-card.dao.ts
│   ├── location.dao.ts
│   ├── notification.dao.ts
│   ├── stamp-card-event.dao.ts
│   ├── stamp-card.dao.ts
│   ├── user-notification-preferences.dao.ts
│   ├── user.dao.ts
│   ├── types.ts             # shared Executor type (Pool | PoolClient)
│   └── index.ts             # barrel export
├── services/
│   ├── business.service.ts
│   ├── giftCard.service.ts
│   ├── giftCardEvent.service.ts
│   ├── helpers.service.ts   # requireFields, assertExists, validateCoordinates, validateRadius
│   ├── location.service.ts
│   ├── notification.service.ts
│   ├── stampCard.service.ts
│   ├── stampCardEvent.service.ts
│   ├── user.service.ts
│   ├── userNotificationPreferences.service.ts
│   └── notification-eligibility/     # Chain of Responsibility pipeline (in progress)
│       ├── checks/
│       ├── utils/
│       ├── pipeline.ts
│       └── index.ts
├── models/
│   ├── business.model.ts
│   ├── gift-card-event.model.ts
│   ├── gift-card.model.ts
│   ├── location.model.ts
│   ├── notification.model.ts
│   ├── shared.types.ts
│   ├── stamp-card-event.model.ts
│   ├── stamp-card.model.ts
│   ├── user-notification-preferences.model.ts
│   ├── user.model.ts
│   └── index.model.ts       # barrel export
├── lib/
│   └── db.ts                 # Pool + NUMERIC type parser + withTransaction helper
├── sql/
│   └── init.sql
├── scripts/
│   ├── seed.ts               # random-UUID dev seed
│   └── testSeed.ts           # fixed-UUID test seed (TEST_IDS)
├── docs/
│   └── stampy_erd.mmd
├── utils/
│   └── validators.ts          # error classes, validateUUID, handleRouteError
└── __tests__/
    ├── integration/           # Supertest, real DB, one file per resource + events
    ├── unit/                  # Vitest, mocked DAOs, one file per service
    └── smoke.test.ts
```

> Note: file naming is mixed between kebab-case (DAOs and models, e.g. `stamp-card.dao.ts`) and camelCase (services, e.g. `stampCardEvent.service.ts`). Worth standardizing in a future cleanup pass — not urgent, but easy to lose track of which convention applies where.

---

## Design Decisions

A few decisions worth explaining, since they shape a lot of the codebase:

**Event sourcing for card state.** Stamp counts and gift card balances aren't stored as mutable columns — every change (`stamp_added`, `balance_redeemed`, `card_expired`, etc.) is written as an immutable row in `stamp_card_events` / `gift_card_events`, and the card's current value is derived by summing its event log on every read (`COALESCE(SUM(...), 0)` over a `LEFT JOIN`), rather than cached and incrementally updated. Combined with a `request_id` idempotency key on every event, this makes retried requests safe — a dropped connection and a client retry won't double-charge a stamp or double-deduct a balance — and removes cache-drift risk entirely, since there's no stored value that could ever disagree with the log.

> Both gift cards (`current_balance`) and stamp cards (`stamps_acquired`) are now fully derived. Stamp cards were the more recent migration, since `reward_redeemed`'s semantics needed resolving first — see below.

**Stamp card redemption doesn't clear stamps.** A gift card's `balance_redeemed` event reduces the derived sum, same as a real gift card losing value when spent. A stamp card's `reward_redeemed` event doesn't — it's excluded from the `SUM()` entirely and only flips `status` to `redeemed`. Real stamp cards don't erase their stamp history when the reward is claimed; only eligibility for another reward changes. One consequence: `reward_redeemed` now requires the card to already be `status: 'completed'`, a guard that wasn't needed before this decision — the old zero-reset behavior had accidentally been absorbing that job (a stray or duplicate redemption call was harmless because it just re-zeroed an already-zero value), and removing the reset meant that safety net needed replacing with an explicit check.

**Notification eligibility as Chain of Responsibility.** Rather than one large conditional, notification eligibility is a sequence of independent, individually testable checks (`NotificationsEnabledCheck`, `QuietHoursCheck`, `DailyCapCheck`, `CardWindowCheck`, `CooldownCheck`, `ExpirationCheck`), each implementing a shared `EligibilityCheck` interface. A card is only notified if it passes every check in order.

**Cooldown stored in seconds.** `notification_cooldown_seconds` (not minutes) keeps the unit unambiguous and avoids a conversion step in the eligibility check math, even though the UI will likely present it in coarser units.

**Timezone handling.** `users.timezone` (IANA string, e.g. `America/Vancouver`) is set client-side at signup via `Intl.DateTimeFormat().resolvedOptions().timeZone` — no location permission required. It's lazily corrected at geofence check-in using `geo-tz` to resolve lat/lng drift.

**Server-controlled status.** Card `status` (`active`/`completed`/`redeemed`/`expired`/`cancelled` for stamp cards; `active`/`expired`/`cancelled` for gift cards) is never client-settable via the generic `PATCH` route — it only changes as a side effect of processing an event. This keeps the event log the single source of truth for *why* a card reached a given state.

**Raw SQL, no ORM.** Deliberately skipping an ORM for now. Writing raw SQL builds real understanding of the database layer — joins, transactions, constraints — before reaching for an abstraction.

---

## Learning Goals

This project is intentionally a learning vehicle:
- **REST API design** - versioning, resource naming, consistent response patterns
- **Clean code & design patterns** - separation of concerns, SOLID principles, Chain of Responsibility (notification eligibility), meaningful naming, small focused functions
- **Event-driven data modeling** - append-only logs, idempotency, transactional consistency
- **Testing** - unit tests (mocked DAOs) alongside integration tests (real DB, real HTTP)
- **Docker** - containerising the app for reproducible environments
- **AWS** - hands-on experience toward the AWS Cloud Architect Associate certification

---

## Running Locally
> Setup instructions coming as the project stabilises.