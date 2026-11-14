# Spec Delta

## Purpose

Preserves historical rest intent and opens consistent day plans from the rules that applied on each local date.

## ADDED Requirements

### Requirement: Preserve planned rest history
The system SHALL maintain non-overlapping, effective-dated rest preferences per owner and apply changes only to future unopened dates.

#### Scenario: Update rest preferences
- **WHEN** an owner changes when planned rest applies
- **THEN** earlier dates retain their original rules and already opened plans remain unchanged

### Requirement: Open deterministic day plans
The system SHALL materialize at most one plan per owner and local date, using IANA local midnight boundaries and the schedule and preference versions effective on that date. It SHALL preserve occurrence snapshots and select a stable default priority among planned occurrences.

#### Scenario: Repeated or concurrent materialization
- **WHEN** materialization is retried or requested concurrently for the same owner and date
- **THEN** all callers observe the same committed plan and each eligible quest appears at most once

#### Scenario: Rest and empty days
- **WHEN** the date is planned rest or contains no eligible quests
- **THEN** the system creates a REST plan for planned rest or an EMPTY plan otherwise, with no planned occurrences or priority

#### Scenario: Historical backlog
- **WHEN** dates are missing
- **THEN** the system materializes them oldest first using their historical rules, limits work per batch, and reports when more dates remain

#### Scenario: Foreign plan
- **WHEN** an account requests a plan belonging to another account
- **THEN** the system responds as for a missing plan

### Requirement: Apply pending timezone transitions
The system SHALL apply a pending timezone change at the next unopened boundary without reopening a materialized date or changing its snapshot.

#### Scenario: East or west transition
- **WHEN** the previous plan reaches its deadline and a timezone change is pending
- **THEN** the next plan uses the first eligible new-zone local date strictly after the last materialized date and starts no earlier than the previous deadline, with any transition gap durably excused and non-rewarding across retries, restarts, and catch-up batches

### Requirement: Sync calendar and read Today
The system SHALL offer owned calendar sync and a read-only Today view with the current plan, priority, committed health, XP, streak, and an applicable recovery hint.

#### Scenario: Backlog remains
- **WHEN** calendar sync reaches its batch limit before today is ready
- **THEN** it returns 202 with Retry-After and the next sync resumes without recreating or skipping eligible dates

#### Scenario: Current plan ready
- **WHEN** today's plan is ready
- **THEN** calendar sync returns 200 and a Today read returns existing data without opening a plan

### Requirement: Create a Quick Quest without awarding progression
The system SHALL create an owned unplanned occurrence using a client-generated resource ID while preserving the planned count, priority, XP, health and streak.

#### Scenario: Repeat creation
- **WHEN** an owner retries the same ID and creation input
- **THEN** the system returns the existing resource, and rejects reuse of that ID with changed input

### Requirement: Select unlocked priority
The system SHALL let the owner select a planned occurrence on the same day before priority lock and before the deadline.

#### Scenario: Ineligible priority
- **WHEN** the priority is locked or the occurrence is unplanned, foreign, or on another day
- **THEN** the system rejects the change and preserves the existing priority
