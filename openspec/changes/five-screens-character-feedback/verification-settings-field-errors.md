# Settings validation errors

API commit 71ac21f returns structured validation details. Before the fix, a search for details in the Settings screen returned no matches. The screen now parses the shared Settings validation envelope and links each recognised path to the corresponding input. The regression test “shows a field-level error beside the input for each API detail path” passed.

In Chrome against the production web build and a fresh local database, the harness submitted a valid draft, then changed the outbound PATCH body through DevTools to an empty display name, Mars/Olympus timezone, one empty goal and an extra key. This exercised the actual API behind the browser's normal client-side validation. Exactly one PATCH reached Express and returned HTTP 400. The resulting DOM showed:

| API path | Location | Visible text |
| --- | --- | --- |
| displayName | Display name input | Enter a display name of 1 to 80 characters. |
| timezone | Timezone input | Enter a valid IANA timezone. |
| goals.0 | First goal input | Enter a goal of 1 to 80 characters. |
| Empty | Form alert | Invalid request input. |

All three inputs set aria-invalid and referenced their own alert via aria-describedby. Two earlier harness attempts stopped before sending a PATCH while the form refreshed or client validation rejected the empty goal. The measured run waited for the inputs to enable and supplied the draft before submit.

Checks: pnpm test passed (15 contracts, 108 web, 49 API). pnpm test:db passed (85 on fresh PostgreSQL). pnpm lint passed all three packages. pnpm build passed with webpack (12/12 static pages).
