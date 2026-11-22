# Tasks

## 1. Migration and contract

- [x] 1.1 Add nullable UUID `Quest.clientId` and owner-scoped uniqueness in a new migration. Verify the migration applies to a fresh empty PostgreSQL database and inspect the unique index, multiple null IDs, and schedule counts before and after replay.
- [x] 1.2 Accept an optional UUID `clientId` on create only, preserving the edit contract and existing response fields. Verify contract tests cover valid and invalid IDs, omitted IDs, unchanged edit behavior, and strict response parsing.

## 2. Create service and routes

- [x] 2.1 Resolve an existing owner and client ID inside the create transaction before date eligibility. Verify PostgreSQL tests cover repeated creates, a lost response, replay after the date opens, 409 `CLIENT_ID_REUSED` for a different valid payload, no-ID creates, and quest and schedule counts before and after replay.
- [x] 2.2 Preserve isolation across two accounts using the same ID. Verify the second account creates its own quest with a distinct quest ID, cannot receive the first account's quest, and receives no indication that the ID existed. Count both owners' schedule rows before and after each replay.
- [x] 2.3 Verify two genuinely overlapping create requests with the same owner and client ID return the same quest with HTTP 201 and produce exactly one quest and schedule. Verify the unique constraint prevents duplicates independently of the application lock.
- [x] 2.4 Run `pnpm test`, `pnpm test:db` against an empty disposable PostgreSQL database, `pnpm lint`, and `pnpm build`. Review the migration and commit this follow-up separately from Onboarding.

Verification: `pnpm test` passed 153 tests. `pnpm test:db` passed 85 tests after all seven migrations on a fresh disposable database. `pnpm lint` and `pnpm build` passed. The first database run failed because the new test fixture omitted its required plan status; the corrected run passed. A migration upgrade over a populated pre-existing database was not separately exercised.
