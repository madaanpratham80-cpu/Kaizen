# Spec Delta

## Purpose

Preserves owned progression records, retry receipts, and achievement unlocks for consistent completion.

## ADDED Requirements

### Requirement: Enforce progression identity and ownership
The system SHALL scope event sequence numbers, award keys, receipt operation IDs, and achievement unlocks to the owning account. References to owned records SHALL preserve ownership.

#### Scenario: Duplicate or foreign write
- **WHEN** a write duplicates a key for the same owner or references another owner's day or occurrence
- **THEN** it is rejected without adding a record

#### Scenario: Independent accounts
- **WHEN** two accounts use the same owner-scoped key values for their own records
- **THEN** each account may retain its independent records

### Requirement: Preserve awards and counters across storage changes
The system SHALL retain award uniqueness independently of receipts and preserve existing PlayerState counter values across migration.

#### Scenario: Receipt removed
- **WHEN** a receipt is deleted and the same award key is written again for that account
- **THEN** the duplicate award remains rejected

#### Scenario: Upgrade existing player
- **WHEN** the completion storage migration runs on an existing account
- **THEN** it preserves existing state and initializes only missing counters

### Requirement: Calculate progression from eligible completions
The system SHALL use stored reward rules and apply bounded health, level, streak, and seal rules.

#### Scenario: Partial planned completion
- **WHEN** a plan with N planned occurrences has C completions
- **THEN** cumulative health gain is floor(5*C/N) and the close penalty is -ceil(5*(N-C)/N), with health clamped to 0–100 and the gain counted once

#### Scenario: Rest, empty, or unplanned work
- **WHEN** a plan is REST or EMPTY or the completed occurrence is unplanned
- **THEN** no planned health or streak reward is applied for that case, and REST or EMPTY preserves streak continuity and pending recovery

### Requirement: Commit completion exactly once
The system SHALL atomically apply eligible owned completion changes, rewards, unlocks and a replay receipt before returning the result.

#### Scenario: Replay or conflicting operation ID
- **WHEN** an owner reuses an operation ID
- **THEN** matching input returns the saved result even after the deadline or during a new catch-up backlog, and changed input returns 409 without writes

#### Scenario: Concurrent or failed completion
- **WHEN** completion is attempted concurrently for the same occurrence or a write fails before commit
- **THEN** at most one reward is committed per occurrence and a failed transaction leaves no partial changes

#### Scenario: Deadline passes while waiting
- **WHEN** a new completion acquires its lock at or after the deadline
- **THEN** it is rejected without awarding progression

#### Scenario: Day closure races with completion
- **WHEN** completion and finalization race on the same day
- **THEN** a valid completion ordered first is reflected once in the close, or a close ordered first prevents a new award

### Requirement: Submit owned completion through the API
The system SHALL require an operation ID on `POST /api/v1/occurrences/:id/complete` and return committed progression deltas, seals and stateVersion.

#### Scenario: Foreign occurrence
- **WHEN** an authenticated account attempts to complete another account's occurrence
- **THEN** the response matches a missing occurrence and no state changes
