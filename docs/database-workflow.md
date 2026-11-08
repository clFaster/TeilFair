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
Before deploying the text-limit migration, reconcile existing data with the new
constraints: group/member names must be nonblank and at most 100 characters
including padding, currency must be three uppercase
ASCII letters, and expense descriptions must be nonblank and at most 250
characters including padding. Constraint installation rejects incompatible rows;
review and correct them explicitly rather than truncating financial descriptions.
The expense-date migration likewise rejects existing non-finite dates or dates
outside years 1–9999; correct those records explicitly before deployment.

Before deploying the first future migration to an existing installation, reconcile
the hosted migration ledger with the already-applied `001`–`006` SQL. Do not replay
initial table creation on an existing database or rewrite applied migration IDs.

Reference: [Supabase declarative database schemas](https://supabase.com/docs/guides/local-development/declarative-database-schemas).

## Recovered production migrations 007 and 008

These files were reconstructed from the statement lists in production's
`supabase_migrations.schema_migrations` ledger on 8 November 2026. They were
already deployed but missing from both this branch and `main`. Their deployed
statements are preserved; the corresponding tables, routines, policies, and
triggers now also live in `supabase/schemas/`.

`007_participant_integrity_and_token_rotation.sql` introduced participant group
checks and `public.rotate_group_tokens`. The later dated migrations strengthen
group boundaries and atomic writes, but do not replace token rotation. Only a
holder of the current write capability can rotate both links; replacement tokens
must be fresh, distinct, 32-character alphanumeric strings. Old links then stop
working. The RPC is available without accounts; the current clients do not offer
a rotation UI.

`008_database_abuse_limits.sql` adds private quota settings, counters, budgets,
and 15 triggers covering all five application tables. These controls also apply
to direct REST/RPC calls and privileged writes. Defaults are:

| Limit | Default |
| --- | --- |
| Group creation, across the whole service | 10/minute and 100/hour |
| Inserted/updated rows per group, including payers and splits | 600/minute |
| Members / expenses per group | 100 / 1,000 |
| Total groups / members / expenses | 2,000 / 20,000 / 50,000 |
| Total payer / split rows | 100,000 / 250,000 |

These are fixed-window resource budgets, not per-person or per-IP fairness or
DDoS protection. One caller can consume the shared creation budget. Replacing a
large expense consumes a budget unit for each inserted/updated accounting row.
Administrators can tune `private.write_limits`; reapplying 008 preserves settings
and reconciles row counters. Inserts that fail, roll back, or hit `ON CONFLICT DO
NOTHING` do not consume stored row capacity. Deleting rows releases that capacity.
Private quota tables and helper routines are not accessible to application roles.
The newer text/date constraints supersede 008's looser text guards.

### Replay compatibility

The recovered 007 and the already-applied dated group-boundary migration use the
same parent-trigger names. History-repair migration `009` therefore occupies the
last sequential slot before the dated files. On a fresh replay it renames only
the legacy `UPDATE OF group_id` triggers, keeping their protection active until
the newer migration installs its replacements. It leaves the newer triggers
untouched when run against an existing deployment. If a local database already
recorded the dated migration before 007 was restored, 009 restores that newer
helper and trigger directly.

The generated `20261108105627_preserve_legacy_security_controls.sql` migration
removes the legacy aliases only after checking the replacement triggers exist.
Its `IF EXISTS` guards make it safe on production, where the aliases were already
removed during the security deployment. No historical migration was rewritten.
Because 009 precedes production's latest recorded version, use
`supabase db push --linked --include-all --dry-run` to review an existing project's
pending history-repair and cleanup steps before applying them. Do not replay 007
or 008 on a project whose ledger already records them.

`pnpm test:security:db` replays the recovered history and covers link rotation,
both API roles, quotas, row counters, rollback, and replay compatibility in a
disposable database. `pnpm db:check` checks that declarations retain these controls.
The local Playwright suite temporarily raises only its two creation budgets so
parallel fixtures do not exhaust them; teardown restores the previous settings.
The setup verifies loopback-only CLI status and always uses `db query --local`.
Production quotas, authorization, row caps, and group-write budgets stay active.
