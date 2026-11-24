# Seven-route browser sweep

November 22, 2026, Asia/Kolkata. Tested committed app code at `c4a8e96`, using the Codex in-app browser, a fresh disposable PostgreSQL database, the built Next.js app, Express, and a same-origin HTTP proxy. A single disposable account was created through `/register`; no direct database seeding was used.

The anonymous checks used `curl` without a cookie and without following redirects. Authenticated statuses are the actual browser document responses logged by the local proxy; each browser action was a direct navigation (`tab.goto`) to the listed URL. Times are proxy response timestamps in Asia/Kolkata (UTC+05:30). Each page rendered its corresponding heading; Today, Quests and Habits showed appropriate empty states, Progress showed its heatmap, Profile showed the disposable account, and Settings and Onboarding showed their forms.

| Route         | Anonymous      | Authenticated | Browser step and time                                        |
| ------------- | -------------- | ------------- | ------------------------------------------------------------ |
| `/today`      | 307 → `/login` | 200           | Navigate to `http://localhost:3492/today`, 14:01:09.301      |
| `/quests`     | 307 → `/login` | 200           | Navigate to `http://localhost:3492/quests`, 14:01:12.179     |
| `/habits`     | 307 → `/login` | 200           | Navigate to `http://localhost:3492/habits`, 14:01:14.650     |
| `/progress`   | 307 → `/login` | 200           | Navigate to `http://localhost:3492/progress`, 14:01:17.399   |
| `/profile`    | 307 → `/login` | 200           | Navigate to `http://localhost:3492/profile`, 14:01:20.472    |
| `/settings`   | 307 → `/login` | 200           | Navigate to `http://localhost:3492/settings`, 14:01:23.132   |
| `/onboarding` | 307 → `/login` | 200           | Navigate to `http://localhost:3492/onboarding`, 14:01:25.842 |

Direct navigation verifies authenticated route loads; it does not verify the signed-in shell’s navigation links. Visible browser observations for the individual routes were:

- `/today`: the Today heading and “No priority scheduled.”
- `/quests`: the Quests heading and “New quest” button.
- `/habits`: the Habits heading and “Weekly completion rate: unavailable”.
- `/progress`: the Progress heading and “Activity over the last year” heatmap.
- `/profile`: the Profile heading and display name “Route sweep account”.
- `/settings`: the Settings heading and display name field containing “Route sweep account”.
- `/onboarding`: the Onboarding heading and the “Starter quest” form.

No route failed or was skipped. This is the route sweep only; account switching, keyboard-only navigation and reduced motion remain for the other parts of task 3.5.

## Commands and results

- `pnpm build` — passed; Next.js built using webpack.
- `bash /private/tmp/kaizen-35-routes/setup.sh` — started PostgreSQL on port 55435, created `kaizen_routes_test`, applied all seven migrations, and started Express on 3491, Next.js on 3493, and the same-origin proxy on 3492. The temporary setup and proxy scripts reproduce the procedure in the Settings evidence, without its fixture; the proxy logged only request path, response status, redirect location, request destination, and timestamp, not cookies or bodies.
- The setup script ran `initdb -D "$kaizen_pg" -A trust --no-instructions`, `pg_ctl -D "$kaizen_pg" -l "$kaizen_pg/server.log" -o "-h 127.0.0.1 -p 55435 -k $kaizen_pg" -w start`, `createdb -h 127.0.0.1 -p 55435 kaizen_routes_test`, and `pnpm --filter @kaizen/api db:migrate` with the new database supplied as both runtime and migration URLs. Migration output: `All migrations have been successfully applied.`
- For anonymous checks: `for route in today quests habits progress profile settings onboarding; do curl -sS -o /dev/null -w "/$route HTTP %{http_code} location %{redirect_url}\\n" "http://localhost:3492/$route"; done` — seven 307 responses to `http://localhost:3492/login`.
- The browser opened `http://localhost:3492/register`, submitted the disposable registration form, confirmed the signed-in account, then used `tab.goto` for each URL in the table. Proxy document-response logs supplied the status and timestamp for each navigation.
- Sent Ctrl-C to the setup process. Its cleanup trap sent SIGTERM to the proxy, Next.js and API, ran `pg_ctl -D "$kaizen_pg" -m fast -w stop`, and removed the disposable PostgreSQL cluster directory. Output: `server stopped` and `Disposable PostgreSQL cluster removed`.
