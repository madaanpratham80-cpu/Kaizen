# Proposal

## Why

A quest create can commit while its response is lost. Retrying the request currently creates another quest, which makes the Onboarding starter-quest retry unsafe.

## What Changes

- Add a nullable owner-scoped client UUID to Quest through a new migration.
- Accept an optional `clientId` on quest creation. A replay for the same owner returns the existing quest with the original 201 status.
- Keep creates without `clientId` independent. A different account using the same UUID creates its own quest without revealing the first owner's quest.
- Enforce owner-scoped uniqueness in PostgreSQL and verify real concurrent creates and fresh-database migration.
- Return `409 CLIENT_ID_REUSED` when the same owner reuses an ID with different valid create fields.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `quest-catalog`: Allow an owner to retry a quest create safely using a client-generated ID.

## Impact

This changes the Quest schema, create contract and service, and requires compatibility and PostgreSQL tests. Onboarding will adopt the ID in its separate screen change after this follow-up is committed. No dependency is added.
