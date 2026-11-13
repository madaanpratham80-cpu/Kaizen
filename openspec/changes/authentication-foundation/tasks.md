# Tasks

## 1. Persistence and contracts

- [ ] 1.1 Add `User` and `Session` Prisma models, indexes, and the reviewed first migration. Test `auth-migration-empty-db` applies it to a fresh PostgreSQL database and checks the unique keys, foreign key, and expiry index.
- [ ] 1.2 Add `@prisma/client` as an API runtime dependency at Prisma's major version and wire `prisma generate` into setup/build. Test `prisma-client-generation` generates a client and compiles the API from a clean install.
- [ ] 1.3 Add shared Zod request and public response contracts. Test `auth-contract-validation` covers email, IANA timezone, required fields, and the 72-byte UTF-8 password boundary.
- [ ] 1.4 Add bcrypt, its types, and restrictive CORS dependencies with pinned major versions. Test `auth-dependency-install` completes a clean install and records each dependency's purpose and rough size in the implementation summary.

## 2. Account and session services

- [ ] 2.1 Implement registration with normalized unique email, exact password handling, async bcrypt cost 12 from configuration, and atomic user/session creation. Test `auth-register-postgres` covers valid, duplicate, concurrent duplicate, short, and over-72-byte submissions.
- [ ] 2.2 Implement login with generic failures, dummy bcrypt comparison for unknown users, and new session creation. Test `auth-login-credentials` covers correct, wrong, and unknown credentials with identical public failure responses.
- [ ] 2.3 Implement digest-only token storage, seven-day absolute expiry, session lookup, and presented-session revocation. Test `auth-session-lifecycle-postgres` proves no raw token is stored and expired or revoked tokens fail.

## 3. HTTP protection and endpoints

- [ ] 3.1 Add request ID, bounded body parsing, session lookup, exact Origin/CSRF checks, validation, serialization, and central error handling in the required order. Test `auth-http-boundary` with Supertest for response envelopes, malformed bodies, and disallowed origins.
- [ ] 3.2 Add separate per-instance account and IP rate limits for auth attempts and explicit proxy-trust configuration. Test `auth-rate-limits` with Supertest for both keys and the 429 response.
- [ ] 3.3 Wire register, login, logout, and session routes with secure cookie issuance and clearing. Test `auth-routes-two-accounts` with Supertest and two real PostgreSQL users for session ownership, `private, no-store`, missing CSRF, and logout isolation.
- [ ] 3.4 Update API `.env.example` and README for allowed origin, CSRF secret, bcrypt cost, migration, generation, and secure local cookie setup. Test `auth-local-setup` by following the documented commands and exercising the browser cookie flow.

## 4. Minimal web entry and integration

- [ ] 4.1 Add `/login` and `/register` pages with typed API calls, labelled controls, and pending/error states. Test `auth-web-flow` in a browser for both forms and confirm credentials and session data are absent from localStorage.
- [ ] 4.2 Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`. Test `auth-root-script-check` records their real results and confirms `pnpm test:db` still exits non-zero with its explicit placeholder message until Slice 3.
