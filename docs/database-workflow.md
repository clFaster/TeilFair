# Declarative database development

`supabase/schemas/` is the source of truth for application DDL: tables, indexes,
functions, triggers, permissions, and RLS policies. The migration directory starts
with one generated baseline, `20261108112650_initial_schema.sql`, replacing the
previous sequential and timestamped history. It creates the current schema
without replaying superseded definitions or history-repair steps.

Prerequisites: Node/pnpm from the root package, Docker, and installed dependencies.
Supabase CLI 3.0.0 is pinned and installed by `pnpm install`.

## Changing the schema

```sh
pnpm db:start
# Edit supabase/schemas/ to express the desired final database state.
pnpm db:diff --file describe_the_change
# Review the generated SQL under supabase/migrations/.
pnpm exec supabase migration up
pnpm db:check
pnpm test:security:db
```

`db:diff` runs `supabase db schema declarative sync --no-apply` using pg-delta.
It compares declarations against migration history and writes an incremental
migration without applying it. Commit the schema edits and generated migration
together. Future migrations accumulate as deployment artifacts; edit the
declarations instead of writing DDL migrations manually. Do not rewrite the
initial baseline after adopting it on an existing database.

Changes made directly through Studio or a SQL editor are not captured by this
workflow. The engine orders schema dependencies automatically; `schema_paths`
is unnecessary. Review grants, function security, RLS, and destructive statements
in every generated migration.

`pnpm db:check` generates in a temporary copy without hosted-project linkage and
leaves the working tree unchanged. It fails on schema differences, except for
known pg-delta routine re-emissions whose full definitions exactly match both
the latest migration and the declaration. `pnpm test:security:db` replays all
migrations in a disposable PostgreSQL database and exercises the current controls.

Both `public` and `private` belong in the declarations. Keep `private` out of
`[api].schemas`: internal access and quota helpers must not become public RPCs.

## Required data

Declarative schema diffs do not capture `INSERT`, `UPDATE`, or `DELETE`. The initial
migration therefore also initializes `private.write_limits` and the five zeroed
`private.write_totals` counters. These rows are required for writes to work and
must be installed in every environment, including hosted projects. They are not
optional development seeds; `[db.seed]` remains disabled.

Future data backfills or quota-default changes require an explicit reviewed data
migration. Keep fixture rows in test setup, outside the declarative schema tree.

## Fresh and existing databases

For a fresh local database, `pnpm db:start` applies the baseline. A local database
using the retired history needs a one-time reset if its data is disposable:

```sh
pnpm db:reset  # Deletes this project's LOCAL development data.
pnpm db:stop   # Stops the local stack, retaining its data.
```

Local configuration uses ports 55320–55323 and project ID `teilfair-local`.
It does not alter hosted configuration. Database commands target local Supabase
by default in CLI v3; hosted commands require an explicit `--remote`.

For a **new, empty hosted project**, link it, review the initial migration, then
deploy it:

```sh
pnpm exec supabase link
pnpm exec supabase db push --dry-run --remote
pnpm exec supabase db push --remote
```

For an **existing database**, do not run the initial migration or reset its data.
The baseline changes the recorded history, not the intended application schema.
Before deploying another migration:

1. Back up application data, private quota settings/counters, and the existing
   `supabase_migrations.schema_migrations` ledger.
2. Verify that the database matches the declarations, including grants, RLS,
   routines, triggers, and quota initialization. A database missing any of the
   retired changes must be upgraded from the pre-squash Git revision first.
3. Run `pnpm exec supabase migration list --remote` and identify the retired
   versions actually recorded there. The retired versions are `000`–`009`,
   `20261104181342`, `20261104192300`, `20261104192500`, `20261104192600`,
   `20261108100024`, `20261108100531`, and `20261108105627`.
4. Use `supabase migration repair --status reverted <retired-versions> --remote`
   through `pnpm exec` for those recorded versions, then
   `pnpm exec supabase migration repair --status applied 20261108112650 --remote`.
   These are ledger repairs only: they neither undo SQL nor execute the baseline.
   Preserve any versions outside the retired list and reconcile their changes
   separately before proceeding.
5. Check `migration list --remote` again and run
   `pnpm exec supabase db push --dry-run --remote`. The baseline must not be pending.

This repository cleanup does not repair any existing local or hosted ledger.
Hosted mutations prompt for confirmation; unattended deployments require `--yes`.
CI runs local database commands only. See the
[Supabase declarative schema guide](https://supabase.com/docs/guides/local-development/declarative-database-schemas)
and [CLI v3 migration guide](https://supabase.com/docs/guides/local-development/cli/migrating-to-v3).

## Database security controls

The baseline retains token rotation, cross-group participant checks, atomic
expense writes, text/date constraints, and quotas from the retired history.
Only the current write capability can rotate both links through
`public.rotate_group_tokens`; replacement tokens must be fresh, distinct,
32-character alphanumeric strings. Old links then stop working.

| Limit | Default |
| --- | --- |
| Group creation, across the whole service | 10/minute and 100/hour |
| Inserted/updated rows per group, including payers and splits | 600/minute |
| Members / expenses per group | 100 / 1,000 |
| Total groups / members / expenses | 2,000 / 20,000 / 50,000 |
| Total payer / split rows | 100,000 / 250,000 |

These are fixed-window resource budgets, not per-person or per-IP fairness or
DDoS protection. Administrators can tune `private.write_limits`. Rejected writes,
rollbacks, and `ON CONFLICT DO NOTHING` do not consume stored row capacity;
deletions release it. Private quota tables and helpers are inaccessible to clients.

The local Playwright suite temporarily raises the two creation budgets and the
group-writes-per-minute budget so parallel fixtures do not exhaust them;
teardown restores the previous settings. Other production quotas, authorization,
and row caps stay active.
