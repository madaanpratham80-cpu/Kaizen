# Proposal

## Why

Calendar catch-up relies on browser traffic. The pilot needs hourly finalization and independent session retention.

## What Changes

- Add an hourly day-finalization CLI with bounded per-account catch-up.
- Add a separate CLI for batched deletion of expired sessions.
- Document scheduling and verify the jobs against PostgreSQL.

## Capabilities

### New Capabilities

- `scheduled-maintenance` — Restart-safe finalization and session retention.

### Modified Capabilities

None.

## Impact

Adds API job entry points and scheduling instructions. Reuses the calendar, progression ledger, and session tables. Deployment rollout and load benchmarks are outside these two steps.
