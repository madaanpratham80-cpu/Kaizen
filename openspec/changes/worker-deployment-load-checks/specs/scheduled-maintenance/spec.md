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
