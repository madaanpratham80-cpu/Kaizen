# Demo limitations

## Quests Total Yield

The Stitch Quests export shows +450 XP at line 101 of its code.html. A case-insensitive search for “+450” or “total yield” across the Quests screen and apps/api/src returned zero matches. The live screen lists individual quest rewards. The STIX check for +450 used a browser fixture, as recorded in the Quests serif verification.

Gap 2 checks: pnpm test passed (171). pnpm test:db passed (85 on fresh PostgreSQL). pnpm lint passed all three packages. pnpm build passed with webpack (12/12 static pages).

## Two Settings tabs can overwrite the same field

Reproduced with two Chrome tabs sharing one disposable account. Both loaded Settings with display name “Motion browser fixture”. Tab B drafted “Second tab name”. Tab A drafted and saved “First tab name” and displayed its save confirmation. Tab B then saved its existing draft and displayed “Second tab name”. After a full reload of each tab, both showed “Second tab name”. The second save persisted with no conflict notice. The first harness attempt stopped before saving when a focus refresh left the submit control disabled. The measured run waited for editable controls.

Gap 5 checks: pnpm test passed (172). pnpm test:db passed (85 on fresh PostgreSQL). pnpm lint passed all three packages. pnpm build passed with webpack (12/12 static pages).

## Quests restyle

The existing Quests layout is the demo layout. Chrome loaded the authenticated /quests document with HTTP 200 and rendered “Quests” and the New quest control. Chrome attributed all six heading glyphs to the custom STIXTwoText-Bold face. The [four-key edit check](../five-screens-character-feedback/verification-quest-edit-keyboard.md) also created a quest in setup, reached its editor and exercised Save validation. A successful rename using only the four permitted keys remains open.

The visual restyle is a separate post-demo change. Gap 6 checks: pnpm test passed (172). pnpm test:db passed (85 on fresh PostgreSQL). pnpm lint passed all three packages. pnpm build passed with webpack (12/12 static pages).
