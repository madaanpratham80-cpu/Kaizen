
# Graphify

- Use Graphify (`graphifyy`, CLI `graphify`) as the first source of project context for Kaizen work, including planning, implementation, debugging, review, and documentation.
- Query `graphify-out/graph.json` when it exists. If it is missing, follow the Graphify skill to build the initial graph before using it for project investigation.
- Verify relevant findings against the source files. Refresh the graph after changing project files it indexes.

- Routes call services. Services call domain functions and Prisma. Domain code imports nothing from Express, Next.js or Prisma.
- Pass the transaction client to every write helper. Never write through the global client inside a transaction.
- Controllers, if used, stay thin. Business logic belongs in services.

## 7. Code quality

- TypeScript strict mode. No `any` without a comment explaining why.
- Small functions with one job. Descriptive names. No dead code, no commented-out code, no magic numbers; use named constants.
- Comments explain why, not what.
- ESLint and Prettier are the style source of truth. Do not disable rules to make code pass.
- No `console.log` in committed code. Use `pino` on the API.
- Validate every external input with `zod` at the route boundary, including IDs, enums, date ranges and body size. Never accept client-supplied XP, health, `userId` or completion timestamps as authority.
- Handle errors explicitly. The API uses one central error handler and returns `{ data, requestId }` or `{ error: { code, message, details }, requestId }`.

## 8. Time and dates

- Use IANA timezones (via a maintained library) for local dates. Never assume a day is 24 hours.
- Store deadlines as UTC instants. A day's deadline is fixed when its plan opens.
- Server time after acquiring the lock decides whether a completion is accepted. Client clocks never override it.
- Write tests for DST transitions (23- and 25-hour days), `UTC` and `Asia/Kolkata`, east and west timezone changes, and midnight race cases.

## 9. API and security (Express)

- Middleware order: request ID, body size limit, session lookup, origin/CSRF check, validation, owned-resource lookup, service, serializer, error handler.
- Session tokens: at least 32 random bytes, stored only as a SHA-256 digest, sent in `__Host-kaizen_session` with `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`. Never log tokens, passwords, cookies or authorization headers.
- Passwords: bcrypt with an async API, cost factor from config (start at 12), maximum 72 UTF-8 bytes, rejected when longer rather than truncated. Never trim or normalise passwords.
- Use `helmet`, a restrictive `cors` policy, body size limits, and `express-rate-limit` on authentication endpoints, keyed by account identifier and IP.
- Login failures return generic messages. Run a dummy bcrypt comparison for unknown accounts.
- Every query constrains ownership by the authenticated user ID.
- Expose `/health/live` and `/health/ready`. Neither returns secrets. Handle `SIGTERM` by draining requests and closing the Prisma pool.
- Rate limits are per-instance; this is fine for the single-instance pilot.

## 10. Database (Prisma and PostgreSQL)

- Schema changes go through reviewed migrations. Never edit a migration after it has been merged; add a new one.
- Use foreign keys on every relationship, `NOT NULL` where meaningful, and SQL check constraints for bounded values (health 0–100, non-negative XP and targets) when Prisma cannot express them.
- Use `SELECT ... FOR UPDATE` on `PlayerState` through a parameterised query for progression writes.
- Keep transactions short. Set finite transaction and lock-wait timeouts.
- Retry only deadlock or transient transaction failures, at most three times with jitter. Never retry validation failures.
- Use `snake_case` table and column names through Prisma mapping only if the architecture requires it; otherwise follow Prisma defaults and say so in the migration.
- Never write raw SQL in route handlers.

## 11. Web (Next.js)

- App Router. Use Server Components for static layout; use Client Components for private screen data, mutations, charts and animation. Do not fetch private data in Server Components in the pilot.
- One typed API client and one shared query cache. Never persist personal query data in `localStorage`.
- Every mutation disables its action while pending, reuses its operation ID on retry, and renders values only from the committed API response. Never award XP optimistically.
- Discard responses with an older `stateVersion`.
- Refetch Today, Habits, Profile and Progress together after a completion.
- Handle loading, empty, error, offline, expired-session and catch-up states on every async view.
- Accessibility: semantic HTML, labelled controls, keyboard support, visible focus, and text alongside colour. Health states always show a text label and percentage.
- GSAP animation lives behind one presentation component. Respect `prefers-reduced-motion` by replacing movement with immediate value and label updates.
- Do not add UI for a seal reveal more than once per event ID in a session.

## 12. Testing

- Domain tests: N=0, partial completion, health bounds, Quick Quest exclusion, level boundaries, priority lock, seal thresholds, REST and EMPTY between ACTIVE days, recovery after a miss.
- Integration tests on real PostgreSQL: two simultaneous completions of one occurrence yield one reward; failure after event insert rolls back; completion races with the finalizer; a reused operation ID with a different payload returns 409.
- Ownership tests with two accounts on every route.
- Never delete, skip, or weaken a concurrency or ownership test to make the suite pass. If a test is wrong, explain why and ask.
- Use `vitest` for unit and domain tests and `supertest` for API routes.

## 13. Dependencies

- Add a dependency only with a one-line justification in the task summary: purpose and rough size.
- Pin major versions. Do not add a dependency that duplicates an existing one.

## 14. Commits

- Small, scoped commits in the form `type(scope): message`, for example `feat(api): add completion transaction`.
- Each commit passes typecheck and tests.
- Reference the OpenSpec change name and task ID in the commit body.

## 15. Definition of done

- [ ] Behaviour matches the OpenSpec task and the architecture document
- [ ] Invariants in section 2 still hold, and relevant tests cover them
- [ ] Typecheck, lint, unit tests, database tests (where relevant) and build all ran and passed
- [ ] No unused code, imports or dependencies
- [ ] README and `.env.example` updated if setup, scripts or env vars changed
- [ ] Summary delivered in 10 lines or fewer, including commands run and their results

## 16. Never

- Never add a database, ORM or authentication library other than the approved stack in section 1.
- Never commit secrets, API keys, `.env` or cookie values.
- Never disable lint rules, skip tests or weaken concurrency and ownership tests to make something pass.
- Never award XP, health or streak changes outside the completion and finalization services.
- Never rewrite working code only for style.
- Never fabricate results. If a command was not run or failed, say so.
