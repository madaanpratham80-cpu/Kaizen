# Proposal

## Why

The scaffold has no account or session persistence, so private Kaizen data cannot be tied to an authenticated owner. This slice establishes that boundary before quests and progression are implemented.

## What Changes

- Add `@prisma/client` as an API runtime dependency, generate the client, and add `User` and `Session` Prisma models with a first migration that applies to an empty PostgreSQL database.
- Add registration, login, logout, and current-session endpoints under `/api/v1/auth`.
- Hash passwords with asynchronous bcrypt, store only digests of opaque session tokens, and issue the prescribed host-only cookie.
- Enforce input limits, origin and CSRF protection, authentication rate limits, generic login failures, and owner-scoped session access.
- Add minimal login and registration pages and tests using two separate accounts.

## Capabilities

### New Capabilities

- `user-auth`: Account creation, credential verification, session lifecycle, and protection of authenticated requests.

### Modified Capabilities

None.

## Impact

Changes affect `apps/api`, `apps/api/prisma`, `packages/contracts`, and minimal `/login` and `/register` routes in `apps/web`. Add `@prisma/client`, bcrypt, and a restrictive CORS implementation with TypeScript types. PostgreSQL integration tests will need a test database. The first release is treated as a private pilot with direct registration in this slice; invitation and email verification remain outside scope. See `AGENTS.md` and `docs/architecture/system-architecture.md` pages 5–9 and 13 for governing constraints.
