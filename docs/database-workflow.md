# Schema-first database development

Application database definitions live in `supabase/schemas/`. Edit these files
first, then generate and review an incremental migration. Existing migrations
`000`–`006` remain unchanged and are still required for installation and upgrades.
The declarations are exported from a local replay of that history, not production.

Prerequisites: Node/pnpm from the root package, Docker, and installed dependencies.
The pinned Supabase CLI is installed by `pnpm install`.

```sh
pnpm db:start
# Edit supabase/schemas/ to express the desired final database state.
pnpm db:diff --file describe_the_change
# Review the new SQL under supabase/migrations/ before applying it.
pnpm exec supabase migration up --local
pnpm db:check
pnpm test:security:db
```

The project enables Supabase's `pg-delta` engine. `db:diff` uses
`db schema declarative sync --no-apply`; it compares declarations to migration
history and does not capture changes made through Studio or a SQL editor.
Commit the schema edits and generated migration together. Data backfills belong
in reviewed handwritten migrations; fixture rows belong in test setup, not schema
files. Review grants, function security, and RLS in every generated change.

`pnpm db:check` runs generation in a temporary copy without hosted-project
linkage, fails on differences, and leaves the working tree unchanged.
It includes both `public` and `private`. Keep `private` out of `[api].schemas`:
the access-check helper is used by RLS and must not become a public RPC.

```sh
pnpm db:reset  # Destructive only to this project's LOCAL database.
pnpm db:stop   # Stop this project's stack, retaining local development data.
```

Local configuration uses ports 55320–55323 and project ID `teilfair-local`.
It does not alter hosted Supabase configuration. Production deployment remains a
separate operation; this testing setup never pushes migrations to a hosted project.
Before deploying the first future migration to an existing installation, reconcile
the hosted migration ledger with the already-applied `001`–`006` SQL. Do not replay
initial table creation on an existing database or rewrite applied migration IDs.

Reference: [Supabase declarative database schemas](https://supabase.com/docs/guides/local-development/declarative-database-schemas).
