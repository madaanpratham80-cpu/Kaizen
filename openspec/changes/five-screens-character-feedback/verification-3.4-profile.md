# Profile committed-code browser verification

Verified commit `1ffcf9f5bdc241e5bf1ac59eedae2b048d71cde9` on 2026-11-19, Asia/Kolkata, using the Codex in-app browser through `cua_repl`. The working tree was clean during the browser check. The committed code was built with `pnpm build` before starting Express, Next.js and a same-origin local reverse proxy.

The setup command was `bash /private/tmp/kaizen-profile-browser/setup.sh`. It started an isolated PostgreSQL cluster with an empty `kaizen_profile_browser_test` database and applied all six migrations. The setup registered a disposable account and created a daily reading quest through the existing API. Its only direct fixture update moved that account's schedule effective date from tomorrow to today. Calendar sync materialized the plan, and the existing completion endpoint awarded 10 XP. The setup asserted that `/api/v1/profile` returned `[{ pillar: "Cognitive", xp: 10 }]`. It did not write progression state or ledger entries directly.

Browser actions and observed results:

```text
/profile anonymous: 307 -> /login; browser navigation showed the login form.
/profile authenticated: 200; after signing in through that form, direct navigation rendered Profile.
/profile rendered pillar: Cognitive: 10 XP; verified with the visible text locator and accessibility tree.
```

The reverse proxy recorded the two document responses as 307 with `Location: /login`, then 200. The page also showed the account display name, Level 1, rank Initiate, total XP 10, and labelled empty goals and achievement archive states. A full-page screenshot was captured and displayed during verification.

Validation: `pnpm test` passed 129 tests (including all 12 Profile tests); `pnpm lint` passed; the committed-code `pnpm build` passed using webpack. The preceding single-read verification's fresh `pnpm test:db` passed 78 tests with all six migrations. The later test-only additions explicitly asserted the rendered label/value pair `Level 17` and the empty/error button sets; no runtime code changed after that database run.

Only the Profile portion of task 3.4 is verified. Settings, Onboarding, the full seven-route sweep, account switching, keyboard navigation across all screens, and reduced motion on every animated component remain pending. The Profile component's two-render reduced-motion unit test passed; this browser check did not change the browser's motion preference.
