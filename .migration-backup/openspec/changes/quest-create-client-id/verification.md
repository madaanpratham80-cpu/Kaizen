# Quest client ID verification

## Initial database fixture failure

The first fresh-database run failed in `quest client ID routes > replays a lost response without a second quest or schedule and rejects different fields`. Prisma reported `PrismaClientValidationError` with `Argument \`status\` is missing.`on the test's`prisma.dayPlan.create()`. The test fixture was corrected to supply `status: 'OPEN'`. The subsequent full fresh-database run passed 85 tests.

## Populated migration

On November 22, 2026, an isolated disposable PostgreSQL database named `kaizen_quest_upgrade_test` received the six migrations before `20261122000000_quest_client_id`. A user and a quest without a client ID were inserted. Prisma then applied the new migration using `prisma migrate deploy`. The migration succeeded, and a query confirmed that the original quest ID and title remained present with `clientId IS NULL`.

## Repeated concurrency test

On the same isolated database, the named test `quest client ID routes > races two same-client creates under the owner lock and creates exactly one quest` passed **10 of 10** separate runs. Each run held the owner lock until PostgreSQL showed both requests blocked, released it, and asserted two HTTP 201 responses with the same quest ID and exactly one quest and one schedule.

The temporary database cluster was stopped and removed. The earlier Settings focus-test failure remains unexplained; the subsequent guard and repeated test evidence are recorded in `../five-screens-character-feedback/verification-3.4-settings.md`.
