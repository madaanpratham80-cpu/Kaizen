# Tasks

## 1. Quests font registration

- [x] 1.1 Record the selected bold serif, PNG comparison, and accepted heavier plus. Load normal STIX Two Text at 700 through `next/font/google` without an explicit fallback. Apply the class to the live heading. Reuse it for Total Yield once the restyle has a defined value.
- [x] 1.2 Test the 700 loader configuration, including the absence of a fallback. Verify only the live heading opts into the font.

## 2. Verification

- [x] 2.1 Run `pnpm test`, `pnpm test:db`, `pnpm lint`, and `pnpm build`. Check the production Quests styles for the scoped 700 face and app-served font URLs. Verify shared routes do not include the registration.
- [x] 2.2 Verify glyph rendering in Chrome using the signed-in production route, the two Stitch specimens, and a network-blocked font control. Keep browser evidence in this change.
- [ ] 2.3 Repeat the production glyph check on a machine without STIX Two Text installed. The commit records this gap. Complete the check before presenting the Quests restyle in the demo.

Verification on 2026-11-23: `pnpm test` passed 171 tests and `pnpm test:db` passed 85 after seven migrations to fresh PostgreSQL. Lint and the webpack build passed. The CSS registered normal STIX Two Text at 700 only on `/quests`. It contains a single-family value and no local font source. The other 11 prerendered pages did not register STIX. See the [browser evidence](verification.md) for the actual downloaded glyphs and the platform limit.
