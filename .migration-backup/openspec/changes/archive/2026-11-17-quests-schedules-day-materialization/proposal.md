# Proposal

## Why

Kaizen can authenticate users. It needs a private quest catalog and historical schedule rules before it can open consistent day plans or award completion rewards.

## What Changes

- Add the player baseline, owned quest catalog, effective-dated schedules and rest preferences, day plans, and occurrence snapshots.
- Support creating, reading, editing, and archiving owned quests with optimistic version checks.
- Materialize day plans deterministically from historical rules and local calendar boundaries.
- Apply pending timezone changes at the next unopened boundary and expose calendar sync, Today, quests, Quick Quests, and priority through owned API routes.
- Initialize player state for existing users and atomically during future registration.

## Capabilities

### New Capabilities

- `quest-catalog`: Owned quests and effective-dated schedules.
- `day-materialization`: Historical rest preferences and deterministic day snapshots.

### Modified Capabilities

- `user-auth`: Successful registration also creates the initial player state.

## Impact

Adds Prisma migrations, API services and routes, shared Zod contracts, and tests. Completion, reward application, finalization and worker catch-up, settings routes, and web screens are outside this slice.
