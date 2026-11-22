# Demo limitations

## Quests Total Yield

The Stitch Quests export shows +450 XP at line 101 of its code.html. A case-insensitive search for “+450” or “total yield” across the Quests screen and apps/api/src returned zero matches. The live screen lists individual quest rewards. The STIX check for +450 used a browser fixture, as recorded in the Quests serif verification.

Gap 2 checks: pnpm test passed (171). pnpm test:db passed (85 on fresh PostgreSQL). pnpm lint passed all three packages. pnpm build passed with webpack (12/12 static pages).
