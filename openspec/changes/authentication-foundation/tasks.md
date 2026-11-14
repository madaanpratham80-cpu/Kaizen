# Tasks

## 1. Persistence and contracts

- [x] 1.1 Add `User` and `Session` Prisma models, indexes, and the reviewed first migration. Test `auth-migration-empty-db` applies it to a fresh PostgreSQL database and checks the unique keys, foreign key, and expiry index.
- [x] 1.2 Pin `@prisma/client` and the Prisma CLI to version 6.19.3 and wire `prisma generate` into setup/build. Test `prisma-client-generation` generates a client and compiles the API from a clean install.
- [x] 1.3 Add shared Zod request and public response contracts, including required display name and IANA timezone validation at the registration boundary. Test `auth-contract-validation` covers email, display name, invalid timezone, required fields, and the 72-byte UTF-8 password boundary.
- [x] 1.4 Add bcrypt, its types, `cors`, its types, Testing Library, and jsdom with pinned major versions. Enable `cors` only when `NODE_ENV` is explicitly `development` or `test`, allowing only the configured local web origin. Production and unset values must send no CORS headers. Test `auth-dependency-install` completes a clean install; test `auth-production-no-cors` confirms cross-origin requests in production and with `NODE_ENV` unset have no `Access-Control-Allow-Origin` header. Record each dependency's purpose and rough size in the implementation summary.

## 2. Account and session services

- [x] 2.1 Implement registration with normalized unique email, exact password handling, async bcrypt cost 12 from configuration, and atomic user/session creation. Test `auth-register-postgres` covers valid, duplicate, concurrent duplicate, and short submissions; `auth-password-byte-boundary` accepts exactly 72 UTF-8 bytes using 24 three-byte characters and rejects that password plus one ASCII byte as 73 bytes without truncation. The registration test must prove bcrypt hashes the exact submitted password with leading and trailing spaces: comparing the stored hash with that string succeeds, while comparing it with the trimmed string fails.
- [x] 2.2 Implement login with generic failures, dummy bcrypt comparison for unknown users, and new session creation. Test `auth-login-credentials` covers correct, wrong, and unknown credentials with identical public failure responses; a password with leading and trailing spaces succeeds only when those spaces are submitted, and the trimmed version fails.
- [x] 2.3 Implement digest-only token storage, `expiresAt` set from the server clock to a seven-day absolute lifetime, session lookup, and presented-session revocation. Test `auth-session-lifecycle-postgres` uses a controlled clock to prove the expiry boundary, no raw token storage, and rejection of expired or revoked tokens.

## 3. HTTP protection and endpoints

- [ ] 3.1 Add request ID, bounded body parsing, session lookup, exact Origin/CSRF checks, validation, serialization, and central error handling in the required order. Test `auth-http-boundary` with Supertest for response envelopes, malformed bodies, and disallowed origins.
- [ ] 3.2 Add separate per-instance account and IP rate limits for auth attempts and explicit proxy-trust configuration. Test `auth-rate-limits` with Supertest for both keys and the 429 response.
- [ ] 3.3 Wire register, login, logout, and session routes with secure cookie issuance and clearing. Replace the `test:db` placeholder with a real PostgreSQL suite targeting the disposable database in `DATABASE_URL`; before any database operation, `auth-test-db-url-guard` must make it exit non-zero when `DATABASE_URL` is unset or its database name lacks `test`. It must run `auth-migration-empty-db`, `auth-register-postgres`, `auth-session-lifecycle-postgres`, and `auth-routes-two-accounts` with two users for session ownership, `private, no-store`, missing CSRF, and logout isolation, and no longer exit 1 by design.
- [ ] 3.4 Update API `.env.example` and README for allowed origin, CSRF secret, bcrypt cost, migration, generation, and secure local cookie setup. Manually verify `auth-local-setup` by following the documented commands and exercising the browser cookie flow; record the steps and observed result.

## 4. Minimal web entry and integration

- [ ] 4.1 Add `/login` and `/register` pages with typed API calls, labelled controls, and pending/error states. Test `auth-web-form-component` with Vitest, Testing Library, and jsdom for both forms and absence of localStorage writes; record a manual browser check of the cookie flow in the implementation summary as part of `auth-local-setup`.
- [ ] 4.2 Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, and `pnpm build`. Test `auth-root-script-check` records all five results; `pnpm test` and the real `pnpm test:db` suite must pass. The build gate is `pnpm build` using `next build --webpack` from `apps/web/package.json`; the Turbopack build path is not required.
