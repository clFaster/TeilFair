# Security review fixes

Follow-up to the [4 November review](security-review-2026-11-04.md). Account-free
sharing and persistent browser capabilities remain intentional requirements.
The review and its reproduction script describe the original commit; use the
regression tests for the current implementation.

## F2 Group boundaries

Payer/split inserts and updates now require an accessible member in the expense's
group. Database triggers also prevent moving members or expenses between groups,
including privileged moves that could invalidate a previously checked link.
This keeps the client API compatible and closes both insertion and reassignment
paths without adding accounts or changing stored capabilities.

The migration refuses to install over existing cross-group references. Resolve
those records explicitly before retrying; it does not delete or silently rewrite
accounting data. Apply the incremental migration to the hosted database through
the existing schema deployment process.

Validation: isolated PostgreSQL tests cover both public API roles, valid edits,
foreign-member inserts/updates, and privileged parent reassignment. Real API
regressions are included in the local Playwright suite.

The CLI's comma-separated schema filter silently missed these changes. Generation
and consistency checks now inspect the complete declaration tree without that
filter; the generated migration was inspected before use.

## F3 Active group authorization

Every group load clears active data and write authority, while preserving saved
links. Superseded requests and mutations cannot reinstall an earlier group's
state. Both clients render only the group/token matching the current route, and
the store rejects writes while loading or in read-only mode. Forgetting an active
or pending group invalidates that load. A failed attempt to reopen a recent group
no longer deletes its saved token, including during network outages.

Validation includes failed navigation, out-of-order loads, late mutation results,
reader write attempts, deliberate forgetting, and persistence after reload.

## F4 Atomic expense writes

Expense creation and replacement now use the `save_expense` database function,
which checks the write token and validates the complete payload before writing.
Each call inserts or replaces the expense, payers, and splits in one transaction;
invalid totals, foreign-group participants, and failed child inserts cannot leave
partial accounting data. Split coverage allows the same one-cent tolerance as the
client validator, while payer totals and percentage/fixed limits remain enforced.

Updates include the expense's current revision. A stale revision returns SQLSTATE
`40001` instead of overwriting newer edits, and each successful update advances the
revision. Direct expense inserts/updates and payer/split mutations are revoked for
the API roles; deleting an expense remains supported. Member references now use
`ON DELETE NO ACTION`, so members with accounting rows must be unlinked before
they can be deleted.

Validation: `expense_writes.sql` covers invalid totals, the one-cent split boundary,
atomic rollback after a failed replacement, revision conflicts, and denied direct
writes for both API roles. Local API and browser tests exercise the RPC payload and
the clients' revision handling.

## F5 Least-privilege table and function defaults

The `anon` and `authenticated` roles no longer have `TRUNCATE`, `REFERENCES`,
`TRIGGER`, or `MAINTAIN` on any application table. Existing CRUD grants and
restricted group-token column access remain in place. Broad automatic table and
function grants have been removed at both global and `public` schema default levels;
new RPCs must receive explicit execution grants.

Validation: `privileges.sql` asserts the four forbidden privileges are absent on
all five application tables, and that newly created tables and functions receive
no access for either API role.

## F6 Server-side text length limits

Database constraints now limit group and member names to 1–100 non-whitespace
characters, expense descriptions to 1–1000, and read/write tokens to 32–128
characters. The existing `save_expense` RPC continues to cap payer and split
batches at 200 items each; the new checks also cover direct database writes.

Validation: `length_limits.sql` accepts values at each upper boundary and rejects
oversized or blank names/descriptions and oversized tokens.

## F8 Dependency advisories

Expo SDK 58 packages were moved to the patch releases expected by `expo install
--check` (`expo` 58.0.23 and matching runtime, splash screen, safe-area, and
`react-dom` versions). The updated `@expo/cli` no longer depends on `zod` 3 or
`deepmerge`, which resolves the high `zod` and low `deepmerge` advisories without
overrides.

Two moderate advisories remain as temporary exceptions:

| Dependency | Advisory | Why not fixed now |
| --- | --- | --- |
| `glob@13.0.6` | [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4), fixed in 14.0.2 | The latest `@expo/fingerprint` and `@expo/cli` still require `glob ^13`. |
| `minimatch@10.2.6` | [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), fixed in 11.0.1 | Required as `^10` by Expo tooling and ESLint's `@eslint/config-array`. |

Both are reached only by developer and build tooling (Expo config/fingerprinting
and ESLint) with patterns from the repository, not by the web bundle, native
bundles, or any group request. Forcing the next major versions through overrides
was not applied, following the review's guidance against incompatible overrides.
Owner: the repository maintainer. Review again by 4 February 2027 or when
Dependabot offers Expo/ESLint releases that accept the fixed versions.

CI now runs `pnpm audit --audit-level high`, so any new high or critical advisory
fails the build while these documented moderate exceptions remain visible in the
audit output.

Validation: `pnpm audit` reports only the two moderate advisories above, and
`expo install --check` reports no outdated SDK packages.
