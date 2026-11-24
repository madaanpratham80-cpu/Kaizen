# Spec Delta

## Purpose

Gives Settings and Onboarding structured feedback they can associate with invalid controls.

## ADDED Requirements

### Requirement: Identify invalid settings fields

An authenticated `PATCH /api/v1/settings` body validation failure SHALL retain HTTP 400, `INVALID_INPUT`, its message and request ID, and add a nonempty `error.details` array of `{ path, code }` objects. Each path SHALL identify a public settings field, optionally followed by a goal index, or be empty for an issue at form level. Details SHALL exclude submitted values.

#### Scenario: One field is invalid

- **WHEN** an authenticated owner submits only an invalid timezone
- **THEN** the response contains a single detail with path `["timezone"]`.

#### Scenario: Multiple fields are invalid

- **WHEN** an authenticated owner submits a blank display name and an invalid timezone with valid origin and CSRF proof
- **THEN** the response includes details for both `["displayName"]` and `["timezone"]`, and no settings are saved.

#### Scenario: A goal is invalid

- **WHEN** an authenticated owner submits an invalid goal entry
- **THEN** its detail identifies its zero-based index, such as `["goals", 0]`.

#### Scenario: No field can be identified

- **WHEN** the settings schema rejects an empty patch or an unknown property
- **THEN** the response uses an empty path for the form-level issue and does not echo unknown property names or values.

### Requirement: Preserve Settings response and authorization boundaries

The system SHALL continue to derive the owner from the authenticated session and apply existing origin and CSRF checks. Successful saves, authentication and authorization failures, and other routes SHALL keep their existing response shapes.

#### Scenario: An owner override is submitted

- **WHEN** an authenticated user includes another account's identifier as an extra request property
- **THEN** validation rejects the request and neither account is changed.

#### Scenario: A request is unauthorized

- **WHEN** a request lacks an authenticated session or fails the existing origin or CSRF check
- **THEN** the request receives the existing rejection without settings validation details.
