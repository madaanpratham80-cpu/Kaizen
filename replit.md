# Kaizen

Kaizen is a gamified discipline tracker for quests, habits, and personal progress. Guest mode keeps its data in the browser; registered accounts use PostgreSQL.

## Run and verify

- Start the managed **Kaizen** and **API Server** workflows. The web preview is at `/`; its Express API is routed under `/api/v1` on the same origin.
- `pnpm test` runs the web, API, and shared contract suites.
- `pnpm test:db` applies and tests the original Prisma migrations. Run it only with `DATABASE_URL` pointed at a fresh, disposable PostgreSQL database whose name contains `test`. Never run this suite against the preview or production database.
- `pnpm --filter @workspace/kaizen run test:browser` tests the running development preview with Chromium. It creates and removes its own test account. Set `CHROMIUM_PATH` if Chromium isn't on `PATH`, and `KAIZEN_TEST_SCREENSHOTS` to save screenshots.
- `/health/live` is API liveness. `/health/ready` and `/api/healthz` also check database readiness.

## Layout and operating decisions

- `artifacts/kaizen` contains the imported screens and theme, mounted by Vite and Wouter. Express verifies registered sessions and protects account data; the browser route guard only controls navigation.
- `artifacts/api-server` contains the original Express routes, Prisma schema, migrations, and jobs. `lib/contracts` is the shared Zod contract used by both services.
- Prisma owns the imported database schema and applies the existing migration history at API startup and after task merges. The history includes PostgreSQL constraints and the `btree_gist` extension. Do not run the unused scaffold's Drizzle push against Kaizen's database.
- Keep `SESSION_SECRET` server-only. Replit supplies `DATABASE_URL` and the allowed preview/published domains. For a separately hosted environment, configure `APP_ORIGIN` with the canonical web origin. Keep the browser API on the same origin for secure cookies and mutation checks.
- `pnpm --filter @workspace/api-server run job:finalize-days` and `pnpm --filter @workspace/api-server run job:cleanup-sessions` are the existing maintenance commands. An external scheduler is not configured by the import.
- `.migration-backup` retains the original import. No external account or activity data was moved into the Replit development database.
