# Deploy Kaizen to Vercel

Use two Vercel projects from the same GitHub repository. Import `apps/web` as Next.js and `apps/api` as Express. Enable **Include source files outside of the Root Directory** for both projects because they import `packages/contracts` from the pnpm workspace. Use Node.js 24.x and set `ENABLE_EXPERIMENTAL_COREPACK=1` in both projects to pick up the root `packageManager` pin. Keep automatic dependency installation. Use the web package's default `pnpm build`, which uses webpack. Let Vercel detect the Express entrypoint from `apps/api/src/app.js`.

## 1. Set up PostgreSQL

Create a hosted PostgreSQL database (for example, via the Neon integration). Keep it separate from your local database and from disposable tests. Choose a database region near the API. Keep connection strings and signing secrets in environment settings.

Use the direct migration connection with a role that can create application tables and the `btree_gist` extension. From the repo root, export the migration URL into your shell using your secret manager or an ignored environment file, then run:

```sh
pnpm --filter @kaizen/api db:migrate
```

Set `DATABASE_URL` on the API project to the runtime connection string. Use a connection pool suitable for serverless invocations and limit privileges to the application schema. Apply migrations before testing a deployment with real accounts. For databases with existing accounts, check that their bcrypt cost factors are represented by the configured current and legacy costs.

## 2. Connect the projects

Reserve the stable web domain first, then configure both projects and redeploy.

| Project | Environment variable | Value |
| --- | --- | --- |
| API | `DATABASE_URL` | Runtime PostgreSQL connection string |
| API | `APP_ORIGIN` | Exact public web origin, such as `https://your-kaizen-web.vercel.app`, without a trailing slash |
| API | `SESSION_SECRET` | Server-only random value, generated with `openssl rand -hex 32` |
| Web | `API_INTERNAL_ORIGIN` | Reachable API origin, such as `https://your-kaizen-api.vercel.app`, without a path |
| Web | `NEXT_PUBLIC_API_BASE_PATH` | `/api/v1` |
| Web | `NEXT_PUBLIC_REQUIRE_ACCOUNT_API` | `1` |

Keep the API in production mode. The browser calls `/api/v1` on the web origin, and Next rewrites those requests to Express. This keeps browser cookies first-party. The Next route guard uses the same API origin to verify sessions. The web project does not receive database or signing credentials. The API origin must be reachable from Vercel for both calls. Kaizen still validates the session, the exact app origin, and the CSRF proof for authenticated writes. Configure a matching origin and separate databases if you add full-stack preview environments.

## 3. Verify the hosted account flow

1. Check the API project's `/health/live` and `/health/ready` endpoints for HTTP 200.
2. On the web domain, create a disposable account and verify that Today loads.
3. Add a quest, sign out, and sign back in. Verify that the quest is still present and that a rejected login produces an error instead of entering guest mode.
4. For scheduled maintenance, run the existing finalize-days and cleanup-sessions commands from a scheduler with access to the runtime database. A web deployment does not start these one-shot commands automatically.

Vercel's Express support runs the handler as a function, so the standalone HTTP listener and its SIGTERM lifecycle are specific to a dedicated Node host. The existing in-memory auth rate limits apply per process; assess per-client limits before operating a public production service at scale.
