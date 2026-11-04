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
