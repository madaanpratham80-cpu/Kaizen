# Reduced-motion health-band crossing

Passed in Chrome 157.0.8103.80 on the built app. DevTools emulated reduced motion and the page returned true for matchMedia('(prefers-reduced-motion: reduce)').matches immediately before completion.

On fresh PostgreSQL, the browser registered an account and created two daily quests. A disposable SQL fixture moved both schedules to yesterday, removed today's still-empty plan, backdated the account and set its health to 43. Calendar sync closed yesterday and opened today at 38. One real priority completion returned HTTP 200 and crossed the boundary.

| Sample after activation | Character feedback text | Health fill | Posture |
| --- | --- | --- | --- |
| Before | Fading Health 38% Level 1 · 0 XP XP toward next level 0% | 0.38 | Fading |
| First changed frame, 50 ms | Tired Health 40% Level 1 · 35 XP XP toward next level 35% Iron Will · 25 XP earned | 0.40 | Tired |
| Final sample, 1717 ms | Tired Health 40% Level 1 · 35 XP XP toward next level 35% Iron Will · 25 XP earned | 0.40 | Tired |

All 103 animation-frame samples and five DOM mutation samples contained feedback. Body and head transforms took only the two endpoint poses (body vertical translation 13 px and 6 px). Zero frames had intermediate meter scales. Every sampled reveal showed opacity 1, no transform and zero active animations. The 35 XP includes the 25 XP seal bonus.

Checks: pnpm test passed (171). pnpm test:db passed (85 on fresh PostgreSQL). pnpm lint passed all three packages. pnpm build passed with webpack (12/12 static pages).
