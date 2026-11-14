# user-auth Specification

## Purpose
Provides account identity and secure browser sessions so each user's private Kaizen records can be accessed only by that user.

## Requirements

### Requirement: Register an account
The system SHALL accept `POST /api/v1/auth/register` with a display name, valid email, password, and IANA timezone; normalize email for unique identity; and create the user and initial session.

#### Scenario: Valid registration
- **WHEN** a display name, unused email, valid timezone, and password of at least 12 characters and at most 72 UTF-8 bytes are submitted from the allowed origin
- **THEN** the system creates one user, sets a session cookie, and returns `{ data, requestId }` without a password hash or token

#### Scenario: Duplicate or invalid registration
- **WHEN** a duplicate normalized email, invalid timezone, malformed input, or password over 72 UTF-8 bytes is submitted
- **THEN** the system rejects the request without creating a user or session

### Requirement: Verify credentials
The system SHALL authenticate `POST /api/v1/auth/login` using the submitted password exactly as provided and SHALL use generic failure responses.

#### Scenario: Valid login
- **WHEN** an existing account's email and exact password are submitted from the allowed origin
- **THEN** the system issues a new session and returns the authenticated account summary

#### Scenario: Invalid credentials
- **WHEN** an unknown email or wrong password is submitted
- **THEN** the response has the same public status and message for either case and creates no session

### Requirement: Protect session credentials
The system SHALL use an opaque token of at least 32 random bytes, persist only its digest, and set `__Host-kaizen_session` with `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, and no `Domain`.

#### Scenario: Session created
- **WHEN** registration or login succeeds
- **THEN** the browser receives the prescribed cookie and the database stores only its token digest, user ID, creation time, and expiration time

#### Scenario: Session expires
- **WHEN** an expired or revoked token is presented
- **THEN** the system treats the request as unauthenticated and does not return private account data

### Requirement: Read the current session
The system SHALL expose `GET /api/v1/auth/session` for the authenticated account and SHALL return private responses with `Cache-Control: private, no-store`.

#### Scenario: Authenticated request
- **WHEN** a valid session cookie is presented
- **THEN** the response contains only that session's user summary and a CSRF token for authenticated mutations

#### Scenario: Missing session
- **WHEN** no valid session cookie is presented
- **THEN** the response returns an authentication error with `requestId` and no account data

### Requirement: Log out
The system SHALL expose `POST /api/v1/auth/logout` to revoke the current session and clear its cookie.

#### Scenario: Successful logout
- **WHEN** an authenticated user submits logout with valid origin and CSRF proof
- **THEN** only the presented session is revoked, its cookie is cleared, and reuse of that token fails

### Requirement: Reject cross-site mutations
The system SHALL require an allowed Origin on registration and login and both an allowed Origin and session-bound CSRF proof on authenticated mutations.

#### Scenario: Cross-site registration or login
- **WHEN** a request has a missing or disallowed Origin
- **THEN** the system rejects it before account or session changes

#### Scenario: Forged logout
- **WHEN** logout lacks matching session-bound CSRF proof
- **THEN** the session remains active and the mutation is rejected

### Requirement: Limit authentication abuse
The system SHALL bound request bodies and rate-limit authentication attempts by both account identifier and IP, without disclosing credentials in logs.

#### Scenario: Repeated login attempts
- **WHEN** an account identifier or IP exceeds its configured limit
- **THEN** further attempts are rejected without a credential check during the limit window

### Requirement: Keep account access owner-scoped
The system SHALL derive user identity from the validated session and SHALL constrain each private account query to that user.

#### Scenario: Two accounts
- **WHEN** account A presents its session and requests current-session data
- **THEN** the response contains account A's data and no data belonging to account B
