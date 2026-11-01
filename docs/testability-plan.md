# Local integration testing implementation plan

The local environment and PR workflow exercise the real Supabase API and database.
The scheduled system tests continue to exercise the production deployment.
Each stage is validated and committed separately using the repository's configured
Git identity.

## 1. Declarative database and local Supabase

- Keep migrations `000`–`006` unchanged for existing installations.
- Declare the current tables, indexes, functions, permissions, and RLS policies in
  `supabase/schemas/` as the starting point for future schema changes.
- Add local configuration and a documented schema-first migration workflow.
- Verify fresh migrations, upgrade/recovery checks, and schema consistency.

## 2. Repeatable local test environment

- Start the CLI-managed local stack without production credentials.
- Read local connection settings programmatically and validate local targets.
- Build the frontend with those settings and provide explicit cleanup commands.
- Use independent fixtures per test, rather than a shared production test group.

## 3. Real integration and browser tests

- Exercise anonymous group creation, capability authorization, RPC redaction,
  cross-group isolation, and persisted CRUD over the real HTTP API.
- Exercise group/member/expense flows, split modes, balances, read-only access,
  invalid links, and reload persistence in Playwright.
- Keep the existing fast unit, migration/security, and mocked UI suites.

## 4. TypeScript Aspire orchestration

- Add a small AppHost that coordinates Supabase readiness and frontend startup.
- Keep ownership of Supabase containers with the Supabase CLI.
- Support the same environment in local development and automated tests.
- Validate startup, resource readiness, endpoint discovery, and shutdown.

## 5. CI and developer workflow

- Add a separate PR job for the disposable full-stack environment.
- Check declarative schema consistency and run the real integration/E2E suite.
- Retain local failure diagnostics and always clean up resources.
- Keep scheduled production tests separate and require an explicit hosted target.
- Document prerequisites, commands, schema changes, and test isolation.

## Acceptance criteria

- A fresh checkout can start the local stack and run tests without hosted secrets.
- Schema declarations describe the same application database as migration replay.
- Tests run with public API credentials and capability tokens, exercising RLS.
- Tests can run independently and clean up their own records on failure.
- CI runs the built frontend against the local backend.
- No local reset or test command can silently target production.
- Scheduled E2E checks still target the production deployment.

## Progress

- [x] Inspect existing tests, migrations, workflows, and tooling; agree staged scope.
- [x] Stage 1: declarative database and local Supabase. Exported from local migration
  replay; `pnpm db:check` reports no differences, and existing database security,
  upgrade, recovery, and reapplication checks pass.
- [x] Stage 2: repeatable local test environment. Local RPC readiness and target
  guards pass; the web production build serves successfully with local settings.
  Independent API/browser fixtures are delivered with the tests in stage 3.
- [x] Stage 3: integration and browser tests. All 22 API/desktop/mobile checks pass
  against real Supabase and the production build; web lint and TypeScript checks
  pass. The local launcher adjusts preview CSP for its validated loopback API.
- [x] Stage 4: TypeScript Aspire orchestration. Pinned CLI and generated SDK restore,
  AppHost typecheck/lint, dependency ordering, dynamic endpoint discovery, all 22
  tests with CI settings, and explicit AppHost/container cleanup are validated.
- [ ] Stage 5: CI and documentation.
