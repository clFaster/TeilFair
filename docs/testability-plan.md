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
- [ ] Stage 1: declarative database and local Supabase.
- [ ] Stage 2: repeatable local test environment.
- [ ] Stage 3: integration and browser tests.
- [ ] Stage 4: TypeScript Aspire orchestration.
- [ ] Stage 5: CI and documentation.
