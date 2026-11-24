# Spec Delta

## Purpose

Runs calendar catch-up and session retention independently of browser requests.

## ADDED Requirements

### Requirement: Finalize days using a scheduled command

The system SHALL provide an hourly CLI that discovers overdue plans and accounts without a current plan. It SHALL use the completion lock, process at most 30 dates per owner per invocation, and commit elapsed dates and unique close events in order.

#### Scenario: Restart after interruption

- **WHEN** execution stops after some dates have committed
- **THEN** the next invocation resumes from the committed checkpoint without repeating close events

#### Scenario: Concurrent completion

- **WHEN** a completion and the worker contend for the same account
- **THEN** the shared lock serializes them and database time after acquiring the lock determines deadline eligibility

### Requirement: Clean up expired sessions independently

The system SHALL offer a separate CLI that removes expired sessions in bounded batches.

#### Scenario: Mixed expiry

- **WHEN** expired and active sessions coexist
- **THEN** cleanup removes eligible expired sessions and preserves active sessions

### Requirement: Operate the API behind hardened ingress

The deployment SHALL use HTTPS, bounded database readiness, structured redacted request logs, graceful shutdown, and distinct runtime and migration database credentials.

#### Scenario: The database is unavailable

- **WHEN** bounded database readiness fails
- **THEN** readiness reports 503 while liveness remains independent of the database

### Requirement: Verify pilot performance and recoverability

The pilot SHALL measure warm Today and annual heatmap latency with 20 concurrent sessions over a 100-account, 365-day dataset and rehearse database backup and restore with ledger reconciliation.

#### Scenario: Restore the seeded database

- **WHEN** a logical backup is restored into an isolated empty database
- **THEN** the restored ledger reconciles with PlayerState and matches the seeded database
