# Design

## Context

The Settings handler currently calls `settingsSchema.parse`. Its router maps all schema errors to a generic 400 and the central formatter writes the standard envelope. The owner, origin and CSRF checks already precede the body validation.

## Goals / Non-Goals

**Goals:** Preserve useful issue locations while keeping the response additive and machine-readable.

**Non-goals:** Changing UI behavior, successful save responses, settings validation rules, authorization or persistence.

## Decisions

- Run the existing settings schema in the PATCH handler and write the structured 400 there on body validation failure. Keep the existing response keys and add only `error.details`. All other errors keep using the shared error handler, whose implementation stays unchanged. The existing route authorization and service session check stay in place.
- Use array paths for the public fields `displayName`, `timezone` and `goals`, with an optional numeric index for a goal entry. Represent form-level errors with `[]`. Use the public codes `INVALID_TYPE`, `TOO_SMALL`, `TOO_BIG`, `UNKNOWN_FIELD` and `INVALID_VALUE` as the fallback. Collect details from safe metadata, leaving out raw input, validator messages and arbitrary keys.
- Export a dedicated strict Zod schema for the Settings 400 envelope with a UUID request ID. Retain `settingsSaveResponseSchema` for HTTP 200. Test the new schema independently and parse real PATCH responses in API tests.

## Risks / Trade-offs

Verify the route-local response keeps the standard code, message and request ID. Authentication, CSRF and unrelated input errors keep their current shape. Field details describe the rejected request only, so validation finishes before any settings write.
