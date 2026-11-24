# progress-read-models Specification

## Purpose

Provides private, bounded views of scheduled habits, progression history, and current character state.

## Requirements

### Requirement: Read an owned habit week
The system SHALL return seven local dates from the requested week start, using historical schedules and occurrence snapshots.

#### Scenario: Zero scheduled occurrences
- **WHEN** no occurrences were scheduled in the elapsed part of the week
- **THEN** compliance is unavailable and the seven dates remain present

### Requirement: Read owned progress
The system SHALL return bounded date aggregates, a 365-day heatmap, a cursor-paginated ledger, seals, rank, and pillar totals.

#### Scenario: Paginate tied timestamps
- **WHEN** ledger events share a timestamp
- **THEN** pagination uses the owner's event sequence and returns each event once

### Requirement: Read the authenticated profile
The system SHALL return public account fields and committed character state for the authenticated owner.

#### Scenario: Foreign account supplied
- **WHEN** a caller attempts to select a different account
- **THEN** no foreign account fields or progression records are returned
