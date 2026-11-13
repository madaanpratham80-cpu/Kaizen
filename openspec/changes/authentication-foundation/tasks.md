# Tasks

## 1. Persistence and contracts

- [ ] 1.1 Add `User` and `Session` Prisma models, indexes, and the reviewed additive migration; verify `prisma validate` and migration application on a test PostgreSQL database.
- [ ] 1.2 Add shared Zod request and public response contracts for register, login, logout, and session; verify strict typecheck and contract validation cases, including IANA timezone and password UTF-8 byte limits.
- [ ] 1.3 Add bcrypt, its types, and restrictive CORS dependencies with major versions pinned; verify installation and document each dependency's purpose and rough size in the implementation summary.

## 2. Account and session services

- [ ] 2.1 Implement registration with normalized unique email, exact password handling, async bcrypt cost configuration, and atomic user/session creation; verify valid, duplicate, concurrent duplicate, short, and over-72-byte cases against PostgreSQL.
- [ ] 2.2 Implement login with generic failures, a dummy bcrypt comparison for unknown users, and new opaque session creation; verify correct, wrong, unknown, expired, and revoked credentials without leaking secrets.
- [ ] 2.3 Implement digest-only token storage, seven-day absolute expiry, session lookup, and presented-session revocation; verify database rows contain no raw token and logout cannot revoke another account's session.

## 3. HTTP protection and endpoints

- [ ] 3.1 Add request ID, bounded body parsing, session lookup, exact Origin/CSRF checks, validation, serialization, and central error handling in the required order; verify success/error envelopes and rejected malformed or cross-origin requests with Supertest.
- [ ] 3.2 Add separate per-instance account and IP rate limits for auth attempts and explicit proxy-trust configuration; verify both limits and generic login failures with Supertest.
- [ ] 3.3 Wire all four `/api/v1/auth` routes and secure cookie issuance/clearing; verify `GET /session` is private/no-store, logout rejects missing CSRF, and two-account tests show no cross-owner data or revocation.
- [ ] 3.4 Update API `.env.example` and README for allowed origin, CSRF secret, bcrypt cost, database migration, and secure local cookie setup; verify every documented command and the browser cookie flow.

## 4. Minimal web entry

- [ ] 4.1 Add `/login` and `/register` pages with typed API calls, labelled controls, and pending/error states; verify both flows in a browser without persisting credentials or session data in localStorage.
- [ ] 4.2 Run root `typecheck`, `lint`, `test`, `test:db`, and `build` scripts and record actual results; verify the integration suite uses real PostgreSQL and includes two distinct account identities.
