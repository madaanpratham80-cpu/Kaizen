# Tasks

## 1. Shared error contract

- [x] 1.1 Add and export the strict Settings validation error schema. Pin one path on a single-field rejection and two paths on a multi-field rejection. Verify indexed goal and form-level paths and reject malformed paths, codes, missing details and extra properties.

## 2. Settings API

- [x] 2.1 Attach structured details only to Settings PATCH body validation failures. Keep the shared error handler intact. Verify real PATCH responses return one path for a single-field rejection, two paths for a multi-field rejection, and an index for a nested goal issue. Check the existing message and request ID and verify rejected requests leave account settings unchanged.
- [x] 2.2 Verify with two authenticated accounts that owner overrides are rejected without a write or reflected input. Check that authorization failures, malformed JSON, unrelated validation errors and successful Settings saves retain their current shapes. Run the root verification commands in AGENTS.md.

Verification: `pnpm --filter @kaizen/contracts test --reporter=verbose` passed 14 tests. `pnpm test` passed 146 tests. `pnpm test:db` passed 81 tests against a fresh disposable PostgreSQL database. `pnpm lint` and `pnpm build` passed.
