# Proposal

## Why

Settings validation currently returns a generic message even when the server knows which fields failed. Settings and Onboarding need field paths to show feedback beside the relevant controls.

## What Changes

- Add structured `error.details` to request body validation failures from `PATCH /api/v1/settings`.
- Preserve the existing status and `{ error: { code, message, details }, requestId }` envelope. Clients that read only `code` and `message` continue to receive the same values.
- Keep the Settings owner lookup and session check unchanged.
- Export a shared schema and test both single-field and multi-field rejections.

## Capabilities

### New Capabilities

- `settings-validation-errors`: Structured field feedback for invalid settings submissions.

### Modified Capabilities

None.

## Impact

The change affects only the Settings PATCH validation response and its shared contract. Settings and Onboarding can consume the details in their own changes. The shared error handler, Profile, Today, and successful Settings responses stay unchanged.
