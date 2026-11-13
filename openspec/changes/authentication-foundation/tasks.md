# Tasks

## 1. Persistence and contracts

- [ ] 1.1 Add `User` and `Session` Prisma models, indexes, and the reviewed first migration. Test `auth-migration-empty-db` applies it to a fresh PostgreSQL database and checks the unique keys, foreign key, and expiry index.
- [ ] 1.2 Pin `@prisma/client` and the Prisma CLI to version 6.19.3 and wire `prisma generate` into setup/build. Test `prisma-client-generation` generates a client and compiles the API from a clean install.
- [ ] 1.3 Add shared Zod request and public response contracts. Test `auth-contract-validation` covers email, IANA timezone, required fields, and the 72-byte UTF-8 password boundary.
- [ ] 1.4 Add bcrypt, its types, `cors`, its types, Testing Library, and jsdom with pinned major versions. `cors` permits only the configured local web origin while development uses separate ports; production remains same-origin with no cross-origin credentialed access. Test `auth-dependency-install` completes a clean install and records each dependency's purpose and rough size in the implementation summary.

## 2. Account and session services

- [ ] 2.1 Implement registration with normalized unique email, exact password handling, async bcrypt cost 12 from configuration, and atomic user/session creation. Test `auth-register-postgres` covers valid, duplicate, concurrent duplicate, and short submissions; `auth-password-byte-boundary` accepts exactly 72 UTF-8 bytes using 24 three-byte characters and rejects that password plus one ASCII byte as 73 bytes without truncation.
- [ ] 2.2 Implement login with generic failures, dummy bcrypt comparison for unknown users, and new session creation. Test `auth-login-credentials` covers correct, wrong, and unknown credentials with identical public failure responses.
- [ ] 2.3 Implement digest-only token storage, `expiresAt` set from the server clock to a seven-day absolute lifetime, session lookup, and presented-session revocation. Test `auth-session-lifecycle-postgres` uses a controlled clock to prove the expiry boundary, no raw token storage, and rejection of expired or revoked tokens.

## 3. HTTP protection and endpoints

- [ ] 3.1 Add request ID, bounded body parsing, session lookup, exact Origin/CSRF checks, validation, serialization, and central error handling in the required order. Test `auth-http-boundary` with Supertest for response envelopes, malformed bodies, and disallowed origins.
- [ ] 3.2 Add separate per-instance account and IP rate limits for auth attempts and explicit proxy-trust configuration. Test `auth-rate-limits` with Supertest for both keys and the 429 response.
- [ ] 3.3 Wire register, login, logout, and session routes with secure cookie issuance and clearing. Replace the `test:db` placeholder with a real PostgreSQL suite targeting the disposable database in `DATABASE_URL`; it must run `auth-migration-empty-db`, `auth-register-postgres`, `auth-session-lifecycle-postgres`, and `auth-routes-two-accounts` with two users for session ownership, `private, no-store`, missing CSRF, and logout isolation, and no longer exit 1 by design.
- [ ] 3.4 Update API `.env.example` and README for allowed origin, CSRF secret, bcrypt cost, migration, generation, and secure local cookie setup. Manually verify `auth-local-setup` by following the documented commands and exercising the browser cookie flow; record the steps and observed result.

## 4. Minimal web entry and integration

- [ ] 4.1 Add `/login` and `/register` pages with typed API calls, labelled controls, and pending/error states. Test `auth-web-form-component` with Vitest, Testing Library, and jsdom for both forms and absence of localStorage writes; manually verify the browser cookie flow as part of `auth-local-setup`.
- [ ] 4.2 Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build`. Test `auth-root-script-check` records all five results; `pnpm test` and the real `pnpm test:db` suite must pass. The build gate is `pnpm build`, whose web script uses webpack; the Turbopack build path is outside this slice.
