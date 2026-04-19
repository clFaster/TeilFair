# @teilfair/web

Web client for TeilFair. This package is a React + Vite frontend that creates and opens expense-sharing groups, manages members and expenses, and renders balances/settlement suggestions using shared business logic from `@teilfair/shared`.

## Architecture

### Tech stack

- React 19 + React Router 7 for SPA routing and page composition.
- Zustand store backed by shared state logic from `@teilfair/shared`.
- Supabase JS client for direct Postgres access via Row Level Security.
- i18next + react-i18next for localization (English and German).
- Vite 7 for local dev, bundling, and production output.
- Playwright for system-level browser tests.

### Runtime boundaries

- `@teilfair/web` owns UI, routing, browser behavior, and API adapter wiring.
- `@teilfair/shared` owns domain types, conversions, calculations, store core, and translations.
- Supabase owns persistence and authorization; every group-scoped request carries an `x-group-token` header.

### Request and data flow

1. Entry route `/g/:groupId?t=<token>` is parsed in `src/pages/GroupPage.tsx`.
2. `useGroupStore().loadGroup(groupId, token)` starts the load sequence.
3. Store actions come from `createGroupStoreState(...)` in `@teilfair/shared`.
4. Web-specific API functions in `src/lib/api.ts` perform Supabase calls.
5. Group-scoped clients are created by `createGroupClient(token)` in `src/lib/supabase.ts` and inject `x-group-token`.
6. Results map through shared row converters and are rendered by React components.

### Package structure

```text
packages/web/
  src/
    App.tsx                  # Router + providers + analytics hooks
    main.tsx                 # Application bootstrap
    pages/                   # Route-level pages (home, group, imprint, privacy)
    components/              # Reusable UI modules and dialogs
    store/groupStore.ts      # Zustand store wrapper around shared store logic
    lib/api.ts               # Supabase CRUD adapter
    lib/supabase.ts          # Supabase client and token header client
    i18n/index.ts            # i18next setup + shared i18n registration
    theme/                   # Theme provider, hooks, and CSS tokens
  tests/system/
    expense-flow.spec.ts     # End-to-end add/remove expense flow
  playwright.config.ts       # System test runner and webServer config
  vite.config.ts             # Build config + @teilfair/shared aliasing
```

### Security model in the web app

- Access is capability-token based (no user accounts in this package).
- The `t` query parameter is treated as the group capability token.
- Read/write permission is derived via `getTokenPermission` before mutating operations.
- Recent groups are persisted in browser storage through Zustand persist (`teilfair-storage`) and include the token for quick reopen; treat local browser profiles as sensitive.

## Runbook

### 1) Prerequisites

- Node.js and pnpm installed at repo level.
- A Supabase project with migrations applied (see repository-level `README.md`).

### 2) Environment setup

Create `packages/web/.env`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

You can copy from `packages/web/.env.example`.

### 3) Start local development

From repository root:

```bash
pnpm web
```

From `packages/web` directly:

```bash
pnpm dev
```

Default Vite URL: `http://localhost:5173`.

### 4) Lint and build

From repository root:

```bash
pnpm --filter @teilfair/web run lint
pnpm --filter @teilfair/web run build
```

Build runs TypeScript project build (`tsc -b`) and then `vite build`.

### 5) Run system tests (Playwright)

Create `packages/web/.env.systemtest.local` from `.env.systemtest.example` and set:

```bash
SYSTEM_TEST_GROUP_ID=<existing-group-id>
SYSTEM_TEST_TOKEN=<write-token-for-that-group>
```

Then run:

```bash
pnpm --filter @teilfair/web run test:system
```

Notes:

- If `SYSTEM_TEST_BASE_URL` is not set, Playwright starts a local dev server on `127.0.0.1:4173`.
- If `SYSTEM_TEST_BASE_URL` is set, tests run against that URL and skip local server startup.

### 6) Smoke-check checklist before merge

1. Create a group from home page.
2. Open group link with write token and add at least one member.
3. Add, edit, and delete an expense.
4. Verify balances tab updates.
5. Open same group with read token and confirm edits are blocked.
6. Switch language and theme to catch obvious UI regressions.

## Operational troubleshooting

### Missing Supabase environment variables

Symptom: app fails immediately with `Missing Supabase environment variables`.

Actions:

1. Confirm `packages/web/.env` exists.
2. Confirm keys are named exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Restart Vite after changing environment variables.

### Group opens as invalid or unauthorized

Actions:

1. Confirm URL includes `?t=<token>`.
2. Verify `groupId` and token belong to the same group.
3. Check Supabase RLS/migration state if valid tokens still fail.

### System tests fail before first step

Actions:

1. Confirm `SYSTEM_TEST_GROUP_ID` and `SYSTEM_TEST_TOKEN` are set.
2. Use a write token for system tests.
3. If running against hosted env, set `SYSTEM_TEST_BASE_URL` and verify the deployment is reachable.

### Local stale recent-group entries

Symptom: recent group cards point to groups that no longer exist or are no longer accessible.

Actions:

1. Remove the card from the UI (supported in home page).
2. If needed, clear browser storage for `teilfair-storage`.
