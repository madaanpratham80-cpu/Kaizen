# Spec Delta

## MODIFIED Requirements

### Requirement: Register an account
The system SHALL accept `POST /api/v1/auth/register` with a display name, valid email, password, and IANA timezone; normalize email for unique identity; and atomically create the user, initial session, and initial player state.

#### Scenario: Valid registration
- **WHEN** a display name, unused email, valid timezone, and password of at least 12 characters and at most 72 UTF-8 bytes are submitted from the allowed origin
- **THEN** the system creates one user with initial player state and session, sets a session cookie, and returns `{ data, requestId }` without a password hash or token

#### Scenario: Duplicate or invalid registration
- **WHEN** a duplicate normalized email, invalid timezone, malformed input, or password over 72 UTF-8 bytes is submitted
- **THEN** the system rejects the request without creating a user, session, or player state
