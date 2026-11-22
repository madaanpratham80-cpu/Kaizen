# Spec Delta

## ADDED Requirements

### Requirement: Retry an owned quest create

The system SHALL accept an optional client-generated UUID on quest creation and identify a previously created quest by the authenticated owner and that UUID. A repeat with the same normalized fields SHALL return the existing owned quest with HTTP 201 and SHALL create no additional quest or schedule.

#### Scenario: A response is lost after creation

- **WHEN** an owner repeats a valid create request with the same `clientId`
- **THEN** both responses identify the same quest, and exactly one quest and its initial schedule exist.

#### Scenario: Different owners choose the same UUID

- **WHEN** another authenticated owner creates a quest using the same `clientId`
- **THEN** the system creates a separate quest with a distinct quest ID owned by that account without disclosing the first owner's quest.

#### Scenario: Existing clients omit the ID

- **WHEN** an owner sends two valid create requests without `clientId`
- **THEN** the system creates two distinct quests as before.

#### Scenario: Concurrent creates use one ID

- **WHEN** two requests for the same owner and `clientId` create concurrently
- **THEN** both identify the same quest and only one quest and initial schedule exist.

#### Scenario: A replay is made after the start date

- **WHEN** a valid replay arrives after its original effective date has passed or its day has opened
- **THEN** the existing quest is returned without creating or changing a schedule.

#### Scenario: The same ID is reused with different valid fields

- **WHEN** the same owner sends a valid create request with an existing `clientId` and different quest fields
- **THEN** the system returns HTTP 409 with code `CLIENT_ID_REUSED` and changes neither the quest nor its schedules.
