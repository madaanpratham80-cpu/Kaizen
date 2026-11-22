# Design

## Context

Quest creation currently serializes through the owner PlayerState lock and returns a 201 response with a strict public quest object. The create schema is also used to build the edit schema. A retry must be resolved before the date eligibility check because the original future date can have passed by the time a client retries.

## Goals / Non-Goals

**Goals:** Support safe repeat creates for one account, including concurrent requests and lost responses.

**Non-goals:** Change edit or archive requests, add client IDs to public quest responses, implement the Onboarding screen, or change the behavior of ID-free creates.

## Decisions

- Add nullable `Quest.clientId` as a UUID with a unique `(userId, clientId)` index in a new Prisma migration. PostgreSQL's null uniqueness semantics allow existing rows and repeated creates without an ID. Preserve existing migrations.
- Extend only the create request contract. Keep edit and archive schemas unchanged even though the edit schema currently extends the create schema. Validate UUIDs using the shared contract and normalize their representation consistently.
- Within the existing owner-locked transaction, query by `userId` and `clientId` before checking the requested effective date. Return the existing quest if found. Otherwise validate the future date and create the quest with its initial schedule atomically. The response remains the existing strict public quest shape with HTTP 201.
- Compare normalized submitted fields with the immutable initial schedule snapshot, including the original effective date, title, category, difficulty, target and normalized recurrence. Reusing an ID with different valid fields returns 409 `CLIENT_ID_REUSED`, without modifying the quest or its schedules. A matching replay returns the current owned quest and status 201, including after later edits.
- Use a database unique constraint as the final concurrent-write safeguard. Exercise two genuinely overlapping requests and assert both results and the database row counts. If a unique violation can occur outside the owner lock, resolve it only after the failed transaction has rolled back, using an owner-scoped lookup. Never return a foreign quest.

## Risks / Trade-offs

- Client IDs are generated once per create attempt and persisted on quests, so retention and deletion follow the existing account and quest lifecycle. A UUID collision between different accounts is treated as a new create. Account B receives a distinct quest ID, without an error or disclosure about account A.
- A client must retain the same ID across uncertain retries. The Onboarding change will generate one ID per attempt and reuse it on retry. Persistence across a page reload is outside this follow-up.
- Existing `Quest` return values gain a database property. Explicitly project or serialize the existing response fields and verify every strict response consumer.
