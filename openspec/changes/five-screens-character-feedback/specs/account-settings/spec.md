# Spec Delta

## Purpose

Allows an authenticated owner to change account settings and delete account data with explicit confirmation of identity.

## ADDED Requirements

### Requirement: Update owned settings
The system SHALL validate settings fields and defer timezone changes to the effective calendar boundary defined by the calendar service.

#### Scenario: Timezone change
- **WHEN** an owner submits an eligible timezone change
- **THEN** the response identifies the pending timezone and effective date while previous plans stay unchanged

### Requirement: Delete the reauthenticated account
The system SHALL require recent reauthentication and atomically revoke all of the owner's sessions before deleting the user's dependent records and account.

#### Scenario: Deletion fails
- **WHEN** a deletion write fails before commit
- **THEN** account records and sessions remain unchanged

#### Scenario: Delete succeeds
- **WHEN** the reauthenticated owner confirms deletion
- **THEN** the account and its records are removed, its existing sessions cannot authenticate, and other accounts remain intact
