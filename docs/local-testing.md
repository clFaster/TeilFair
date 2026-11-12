# Local development and full-stack tests

Install the Node.js and pnpm versions specified in the root `package.json`, start
Docker Desktop (Linux containers on Windows), then run:

```sh
pnpm install --frozen-lockfile
pnpm --filter @teilfair/web exec playwright install chromium
pnpm aspire:start
```

Aspire and Supabase CLIs are pinned development dependencies. No global Aspire
installation, hosted Supabase project, production credentials, or application
.env file is needed. The first startup downloads containers and Aspire tooling.
The AppHost's generated SDK is ignored by Git and restored by the CLI.

Open the authenticated dashboard link printed by `aspire:start`, then follow the
`web` resource's HTTP endpoint. Its port is assigned by Aspire. The dashboard lists:

- `supabase-db`: PostgreSQL's TCP endpoint, with a live connectivity check.
- `supabase-api`: the API endpoint, with an HTTP RPC check that exercises PostgREST
  and its database connection.
- `supabase-studio`: a clickable Studio link and HTTP health check.
- `supabase-init`: the one-shot startup/migration task. **Finished, exit code 0**
  means initialization succeeded; it does not mean the database stopped.
- `web`: the frontend, which waits for initialization and backend health.

The database, API, Studio, and frontend should show **Running / Healthy** after
startup. TCP connectivity does not by itself verify SQL queries or migrations;
the API and startup RPC checks cover those separately. Backend services are
external resources monitored by Aspire; manage their containers through the
Supabase CLI or Docker. `pnpm local:stop` stops the whole local environment.

The dashboard captures launcher/frontend logs. The Supabase CLI owns the backend
containers; individual backend logs remain available through Docker and Studio at
`http://127.0.0.1:55323`. The local API is `http://127.0.0.1:55321`.
Container-level distributed traces are not automatically collected by this setup.

## Run tests

```sh
pnpm test:stack
```

This command starts/restarts this repository's AppHost with a production web build,
waits for readiness, discovers its frontend endpoint, and runs the real HTTP API
and desktop/mobile Chromium tests. It stops the AppHost and Supabase containers
after success or failure, preserving local development data. Restart development
with `pnpm aspire:start` afterward. It does not reset an existing database.

To run a subset, pass Playwright arguments:

```sh
pnpm test:stack --project api
pnpm test:stack --project mobile-chrome
pnpm test:stack --grep "read-only"
```

Without Aspire, or while debugging the test runner itself:

```sh
pnpm db:start
pnpm local:check
pnpm test:local
pnpm db:stop
```

`test:local` owns a production preview on port 4175 and stops it when done. It
requires Supabase to be running. `local:web` starts a Vite development server with
the same local backend; `local:preview` builds and serves the production assets.

Each test creates independent random groups/tokens. Fixture teardown deletes each
group and its child records even on assertion failure; no shared test group or
service-role key is used. Browser traffic is limited to the local frontend and
Supabase API. The preview adds only the validated local API origin to its CSP;
production deployment headers in `vercel.json` remain unchanged.

The local suite covers anonymous group creation, metadata/token permissions,
read/write/invalid/cross-group capabilities, RPC redaction, persisted CRUD and
cascades, RLS rejection of group reassignment, database constraints, paged expense
reads with embedded payers and splits, and browser
expense creation/editing/deletion, custom/ratio/fixed/percentage splits, balances,
settlement suggestions, reload persistence, and read-only controls. Mobile browser
emulation does not replace testing the native Expo app on devices.

One API test and one browser test seed a group with 100 members and 11 expenses.
Its 1,100 split rows exceed `max_rows` in `supabase/config.toml`, so these tests
fail if expense loading is cut off by the API row cap. Seeding such a group writes
more rows than the per-group budget of 600 writes per minute, so the test run
raises `group_writes_per_minute` together with the two group-creation budgets and
restores all three afterward. `supabase/tests/write_limits.sql` still checks the
budgets at their real values.

## Database changes

Edit `supabase/schemas/`, generate a reviewed incremental migration, and commit
both. See [the database workflow](database-workflow.md). `pnpm db:check` verifies
that schema declarations and migration history agree; the security suite replays
the initial baseline and subsequent generated migrations in a disposable database.
It checks authorization, group isolation, quotas, token rotation, and cascades.
Local databases using the retired history need the one-time reset or ledger
reconciliation described in that workflow before applying future migrations.

## CI and production monitoring

PR/push CI runs a separate **Local Supabase and Aspire E2E** job with the same
`test:stack` command and fresh runner-local containers. It also checks schema
consistency, target guards, and the AppHost's types/lint. Existing unit/coverage,
database security, mocked UI smoke, and mobile checks remain in the other job.

The scheduled **System Tests** workflow still targets production using the
repository's `BASE_URL` variable and its existing dedicated group/token secrets.
It requires an explicit hosted HTTPS origin and cannot fall back to a local web
server. Keep that small monitoring suite separate from the disposable tests.
Production reports continue to omit traces, screenshots, and live capabilities.

Local failures retain Playwright HTML reports, traces, and screenshots under
`packages/web/playwright-report-local/` and `packages/web/test-results-local/`.
`test:stack` additionally captures AppHost resource state and launcher logs in
`.local/test-diagnostics/` before shutdown. CI uploads these local-only diagnostics
on failure, retaining them for seven days.

## Stop, reset, and troubleshooting

```sh
pnpm local:stop  # Stop this AppHost AND its CLI-managed Supabase stack.
pnpm db:reset    # Reset only the configured local database; deletes local data.
pnpm aspire:restore
pnpm aspire:build
pnpm exec aspire describe --format Json
pnpm exec aspire logs web
```

Use the repository's `aspire:start`/`aspire:restore` launchers. Aspire 13.6.5 installs
its TypeScript tooling with `pnpm --ignore-workspace`, so the launcher supplies the
required esbuild-only build permission and enforces its separate lockfile. The
AppHost is an isolated tooling package, rather than an application workspace.
Its dependencies are tracked by Dependabot separately.
When upgrading Aspire, update the root CLI dependency and `sdk.version` in
`aspire.config.json` together, then restore and validate the generated SDK.

Aspire 13.6.5's generated transport still imports `vscode-jsonrpc/node.js`, so the
AppHost retains `vscode-jsonrpc` 8.2.1. Version 10 exports `/node` instead and fails
AppHost compilation. Dependabot major updates for this package are ignored until
Aspire's generator supports the new exports; do not patch the generated SDK.

One local Supabase stack uses the configured project ID and ports on a machine.
Parallel Playwright workers have isolated groups, but simultaneous checkouts need
distinct Supabase project IDs/ports; Aspire's own isolation flag does not isolate
CLI-managed Supabase containers. A port conflict fails rather than silently
reusing an unrelated frontend.
