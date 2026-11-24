# Spec Delta

## Purpose

Lets each account manage its own quests while preserving the schedule rules that governed past dates.

## ADDED Requirements

### Requirement: Manage owned quests
The system SHALL let an authenticated owner create, read, edit, and archive quests. Edits and archives SHALL require the current `expectedVersion`, and archival SHALL take effect on an eligible future local date.

#### Scenario: Concurrent edits
- **WHEN** two edits submit the same current version
- **THEN** exactly one commits and the other returns a version conflict without changing the quest or schedule history

#### Scenario: Foreign quest
- **WHEN** an account reads, edits, or archives a quest belonging to another account
- **THEN** the system responds as for a missing quest and leaves the foreign quest unchanged

#### Scenario: Effective archive
- **WHEN** an owner archives a quest for an eligible date
- **THEN** the quest and all schedule versions remain in history, and no rule for that quest is eligible on or after the cutoff, including queued future versions

#### Scenario: Stale or repeated archive
- **WHEN** an owner attempts to archive using a stale version or attempts to archive a quest that already has an archive cutoff
- **THEN** the system returns a conflict and leaves the cutoff, version, and schedule history unchanged

### Requirement: Preserve effective-dated schedules
The system SHALL maintain non-overlapping schedule intervals within each owned quest and SHALL apply edits only to future unopened dates.

#### Scenario: Edit a future rule
- **WHEN** an owner versions a quest schedule for an eligible date
- **THEN** the prior interval ends at that boundary and earlier plans and historical rule selection remain unchanged

#### Scenario: Invalid interval
- **WHEN** a proposed change creates overlapping, empty, or reversed intervals, changes today or an earlier date, changes an opened date, or attempts to insert at or before an already queued schedule boundary
- **THEN** the system rejects the entire change

#### Scenario: Independent schedules
- **WHEN** two distinct quests owned by the same account are scheduled for the same date
- **THEN** each quest can have an effective schedule for that date
