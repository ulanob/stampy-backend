# Stampy

A personal finance companion for tracking gift cards and stamp cards - and notifying you when you're near a vendor where you have rewards waiting.

## The Problem

Gift cards get forgotten in wallets. Stamp cards get lost. Rewards go unused and stamps are missed - not because people don't want to use them, but because they don't remember they have them until they're already somewhere else.

Stampy solves this with a simple idea: track your cards in one place, and get notified when you're physically close to a vendor where you have something to redeem.

---

## Status

> 🚧 Active development - learning project

- [x] Database schema design
- [x] CRUD API (users, vendors, cards)
- [ ] Business logic layer (balance tracking, stamp progression)
- [ ] Location-based notifications
- [ ] Authentication
- [ ] React web app
- [ ] React Native mobile app (iOS + Android)
- [ ] Docker + AWS deployment

---

## Tech Stack

### Backend
- **Next.js** (App Router) - REST API with file-based routing (`src/api/v1/...`)
- **PostgreSQL** - Raw SQL, no ORM. Deliberate choice to build foundational understanding before abstracting it away
- **TypeScript** throughout

### Infrastructure (planned)
- **Amazon RDS** - Managed PostgreSQL hosting
- **AWS** - Deployment, storage, and notification services
- **Docker** - Containerisation for local dev and deployment consistency

### Frontend (planned)
- **React** - Browser-based web app
- **React Native** - iOS and Android mobile app

---

## Architecture

The API follows a layered architecture:

```
src/
└── api/
    └── v1/
        ├── users/
        ├── businesses/
        └── notifications/
```

Each route is kept thin - request validation and response shaping only. Business logic lives in a dedicated service layer, keeping concerns separated and the codebase testable.

---

## Learning Goals

This project is intentionally a learning vehicle:

- **REST API design** - versioning, resource naming, consistent response patterns
- **Clean code practices** - separation of concerns, meaningful naming, small focused functions
- **Testing** - building the habit of writing tests alongside features
- **Docker** - containerising the app for reproducible environments
- **AWS** - hands-on experience toward the AWS Cloud Architect Associate certification

---

## Why Raw SQL?

Deliberately skipping an ORM for now. Writing raw SQL builds a real understanding of what's happening at the database layer - joins, transactions, constraints - before reaching for an abstraction. An ORM will come later once the fundamentals are solid.

---

## Running Locally

> Setup instructions coming as the project stabilises.

---

## Roadmap

- Business logic layer - stamp progression, gift card balance tracking
- Authentication - evaluating options including Amazon Cognito
- Location-based vendor proximity notifications
- React web frontend
- React Native mobile app
- Docker Compose setup for local dev
- AWS deployment pipeline
