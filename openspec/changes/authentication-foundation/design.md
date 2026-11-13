# Design

## Context

See `proposal.md` for motivation and `specs/user-auth/spec.md` for behavior. The repository has a Next.js and Express scaffold, an empty Prisma schema, shared contracts, and health routes. `docs/architecture/system-architecture.md` is the authoritative implementation blueprint, with page breaks from the source PDF preserved. `AGENTS.md` sections 1, 9, 10, and 12 govern this design.

## Goals / Non-Goals

**Goals:** Establish a durable owner identity, a revocable browser session, and a reusable middleware boundary for later private routes. Make security behavior verifiable against real PostgreSQL.

**Non-Goals:** PlayerState, quests, day plans, completion, account recovery, email verification, password change and its session-revocation policy, and private screen data. Login and registration pages only collect credentials and consume the auth API.

## Decisions

### Data model and migration

Add `User(id, normalizedEmail, displayName, passwordHash, timezone, createdAt)` and `Session(id, tokenHash, userId, expiresAt, createdAt)` with a foreign key, unique email and token digest, and indexes on `Session(userId)` and `Session(expiresAt)`. `displayName` is required by this change even though the architecture's important-column list does not name it. The shared Zod registration contract owns IANA timezone validation at the route boundary in task 1.3; the required database column has no default. No registration endpoint exists before that validation is installed. Pin `@prisma/client` and the Prisma CLI to 6.19.3, then run `prisma generate` as part of setup/build. Use Prisma default table and column names because the architecture does not require snake_case. Review the first generated migration and prove it applies to an empty PostgreSQL database. Account creation and initial session insertion share a transaction. `onDelete: Restrict` means a later account-deletion transaction must delete that user's sessions before deleting the user. The architecture suggests PlayerState creation with the account; this slice defers PlayerState and must update that invariant when progression lands.

### Password and session handling

Use asynchronous bcrypt with cost from validated server configuration, default 12. Measure the UTF-8 byte length before hashing; enforce the 12-character minimum without trimming or normalization. Normalize only email, then enforce uniqueness in PostgreSQL. For unknown accounts, compare against a fixed dummy bcrypt hash before returning the same generic credential error. Generate 32 random token bytes, encode for the cookie, store SHA-256 of the raw token, and set `expiresAt` from the server clock at creation for a seven-day absolute lifetime. A successful login issues a new session; logout removes only the presented row. Avoid logging headers, bodies, cookies, token digests, or passwords. A database uniqueness failure on concurrent registration becomes the same duplicate-account response as a sequential duplicate.

### HTTP boundary

Mount auth routes under `/api/v1/auth`. Add request IDs, bounded JSON parsing, session lookup, Origin/CSRF protection, Zod validation, service calls, response serialization, and one central error handler in the `AGENTS.md` order. Public register and login skip session lookup and use Origin validation. Express services own Prisma operations; routes contain no SQL. Define request and response schemas in `packages/contracts`. Return `{ data, requestId }` or `{ error: { code, message, details }, requestId }` and `private, no-store` on private responses. Apply `helmet`. Enable `cors` only when `NODE_ENV !== "production"`, allowing the configured local web origin for separate development processes. Production uses one origin and sends no CORS headers.

### CSRF and rate limits

Require exact configured Origin on all auth mutations. Derive a stable, session-bound CSRF token with HMAC-SHA-256 using a server-only secret and the validated session token digest. Return it from `GET /auth/session`; compare the request header in constant time for logout and later authenticated mutations. Keep the secret outside `NEXT_PUBLIC_*` and document it in the API env example without supplying a value. Apply separate per-instance rate limiters keyed by normalized account identifier and trusted client IP to register/login. Configure proxy trust explicitly for the deployment topology; do not trust arbitrary forwarded headers. Production cookies require HTTPS, and local development must provide a secure localhost path compatible with the `Secure` cookie.

### Web integration

Add minimal `/login` and `/register` Client Components using a typed auth client, credentials included, labelled fields, pending and error states. Use Vitest with Testing Library and jsdom for form behavior; verify the complete cookie flow manually in a browser. Do not store session data or CSRF tokens in localStorage. A shared cache or broader private-route shell can follow when private screens arrive.

## Risks / Trade-offs

- Direct registration in a private pilot can admit uninvited users → restrict exposure at deployment until an invitation or verification policy exists.
- Rate limits are per process → deploy a single API instance for the pilot, as the architecture assumes.
- A `Secure` host-only cookie complicates plain HTTP development → document a localhost HTTPS or supported secure-localhost setup and verify the actual browser flow.
- Leaving PlayerState out means later account creation must add it in the progression slice → document the temporary schema boundary and migrate existing users then.

## Migration Plan

Generate and review the first migration for `User` and `Session`; apply it to an empty test database before integration tests and to production before enabling auth routes. Replace the root `test:db` placeholder in task 3.3 with the real PostgreSQL suite targeting a disposable database supplied by `DATABASE_URL`. The script must fail before any database write when the URL is absent or its database name lacks `test`. Roll back application deployment to disable the routes if needed; retain the additive tables and use a later reviewed migration for schema reversal. Keep existing health behavior until database readiness is designed.
