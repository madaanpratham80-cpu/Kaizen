# Spec Delta

## Purpose

Presents owned progression, quests, and achievement history consistently across the five signed-in screens.

## ADDED Requirements

### Requirement: Present progression accessibly
The system SHALL render health, XP, streaks, seals, and quests through shared components with visible labels and named percentages alongside color.

#### Scenario: Reduced motion or unavailable percentage
- **WHEN** reduced motion is requested or the underlying percentage is unavailable
- **THEN** values and labels remain readable without motion, and an unavailable percentage is identified explicitly

### Requirement: Present five owned screens
The system SHALL present Today, Quests, Habits, Progress, and Profile from the authenticated account's data and distinguish loading, empty, error, offline, expired-session, and catch-up states.

#### Scenario: Completion result
- **WHEN** a completion is committed and the response is current
- **THEN** the screens refresh from committed data and any seal feedback is shown at most once per event in that session

#### Scenario: Account changes
- **WHEN** a session expires or the active account changes
- **THEN** private data for the previous account is discarded before another account's data is displayed

### Requirement: Present committed character feedback
The system SHALL present distinct posture, expression, and color for Healthy, Tired, and Fading, and animate XP and health bars over 400 ms after a new committed completion when motion is enabled.

#### Scenario: A completion changes health bands
- **WHEN** a new committed completion changes the character's health band
- **THEN** character feedback reflects the new band and both bars settle at their committed values

#### Scenario: A person prefers reduced motion
- **WHEN** the reduced-motion preference is enabled, including while feedback is in progress
- **THEN** values, labels, character art, and earned seal information update immediately without movement

### Requirement: Reveal earned seals once
The system SHALL show the seal title and earned XP at most once per committed event ID in an authenticated session.

#### Scenario: Committed event reappears
- **WHEN** the same seal event is replayed or revisited after navigation or reload in the same session
- **THEN** the reveal is not shown again and the seal remains in the archive
