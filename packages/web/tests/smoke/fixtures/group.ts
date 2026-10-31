import type { Page, Route } from '@playwright/test';

/** Mock Supabase rows so the group page renders fully without a backend. */
export const GROUP_ID = '6f1c2b8e-4d3a-4f6b-9c1e-2a7b8c9d0e1f';
export const READ_TOKEN = 'smoke-read-token';
export const WRITE_TOKEN = 'smoke-write-token';

export const groupRow = {
  id: GROUP_ID,
  name: 'Weekend in Vienna',
  currency: 'EUR',
  read_token: READ_TOKEN,
  write_token: WRITE_TOKEN,
  created_at: '2026-10-01T10:00:00.000Z',
};

export const memberRows = [
  { id: 'm-anna', group_id: GROUP_ID, name: 'Anna', created_at: '2026-10-01T10:01:00.000Z' },
  { id: 'm-ben', group_id: GROUP_ID, name: 'Ben', created_at: '2026-10-01T10:02:00.000Z' },
  { id: 'm-cleo', group_id: GROUP_ID, name: 'Cleo', created_at: '2026-10-01T10:03:00.000Z' },
];

export const expenseRows = [
  {
    id: 'e-dinner',
    group_id: GROUP_ID,
    description: 'Dinner at Figlmüller',
    total_amount: 96.6,
    expense_date: '2026-10-03T19:30:00.000Z',
    created_at: '2026-10-03T19:31:00.000Z',
  },
  {
    id: 'e-tickets',
    group_id: GROUP_ID,
    description: 'Museum tickets',
    total_amount: 45,
    expense_date: '2026-10-02T11:00:00.000Z',
    created_at: '2026-10-02T11:01:00.000Z',
  },
];

export const payerRows = [
  { id: 'p-1', expense_id: 'e-dinner', member_id: 'm-anna', amount: 96.6 },
  { id: 'p-2', expense_id: 'e-tickets', member_id: 'm-ben', amount: 45 },
];

export const splitRows = memberRows.flatMap((member, index) => [
  { id: `s-d-${index}`, expense_id: 'e-dinner', member_id: member.id, share: 1, share_type: 'ratio' },
  { id: `s-t-${index}`, expense_id: 'e-tickets', member_id: member.id, share: 1, share_type: 'ratio' },
]);

const DESCRIPTIONS = ['Groceries', 'Train to Salzburg', 'Coffee & cake', 'Taxi home', 'Concert tickets', 'Breakfast'];

/**
 * `count` expenses on different days, payers rotating, split equally by everyone.
 * The first one costs `firstAmount` (e.g. a huge amount to stress the layout).
 */
export function manyExpenses(count: number, firstAmount = 42.5): Required<BackendOptions>['tables'] {
  const expenses = Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(2026, 9, 28 - Math.floor(i / 2), 18 - (i % 2) * 6, 15));
    return {
      id: `e-${i}`,
      group_id: GROUP_ID,
      description: `${DESCRIPTIONS[i % DESCRIPTIONS.length]} #${i + 1}`,
      total_amount: i === 0 ? firstAmount : 12 + i * 3.35,
      expense_date: date.toISOString(),
      created_at: date.toISOString(),
    };
  });
  return {
    expenses,
    expense_payers: expenses.map((e, i) => ({
      id: `p-${i}`,
      expense_id: e.id,
      member_id: memberRows[i % memberRows.length].id,
      amount: e.total_amount,
    })),
    expense_splits: expenses.flatMap((e, i) =>
      memberRows.map((m, j) => ({ id: `s-${i}-${j}`, expense_id: e.id, member_id: m.id, share: 1, share_type: 'ratio' }))
    ),
  };
}

/** The three fixture members followed by generated ones, `count` in total. */
export function manyMembers(count: number) {
  const extra = Array.from({ length: Math.max(0, count - memberRows.length) }, (_, i) => ({
    id: `m-extra-${i}`,
    group_id: GROUP_ID,
    name: `Member ${i + memberRows.length + 1}`,
    created_at: new Date(Date.UTC(2026, 9, 1, 11, i)).toISOString(),
  }));
  return [...memberRows, ...extra].slice(0, count);
}

/** Seeds persisted recent groups using the existing browser storage format. */
export async function seedRecentGroups(page: Page) {
  const now = Date.now();
  const recentGroups = [
    { id: GROUP_ID, name: 'Weekend in Vienna', token: WRITE_TOKEN, permission: 'write', lastAccessed: now, memberCount: 3 },
    {
      id: 'b1c2d3e4-0000-4000-8000-000000000002',
      name: 'Flat share Kreuzberg with a rather long name',
      token: READ_TOKEN,
      permission: 'read',
      lastAccessed: now - 86_400_000,
      memberCount: 1,
    },
  ];
  await page.addInitScript(
    `localStorage.setItem('teilfair-storage', ${JSON.stringify(JSON.stringify({ state: { recentGroups }, version: 0 }))});`
  );
}

const TABLES: Record<string, unknown[]> = {
  groups: [groupRow],
  members: memberRows,
  expenses: expenseRows,
  expense_payers: payerRows,
  expense_splits: splitRows,
};

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'access-control-expose-headers': 'content-range',
};

export interface BackendOptions {
  /** Replaces the fixture rows of the given tables (e.g. `members: []`). */
  tables?: Record<string, unknown[]>;
  /** Tables that answer with an HTTP 500 instead of rows. */
  failTables?: string[];
}

/** A recorded POST / PATCH / DELETE call. */
export interface BackendWrite {
  method: string;
  table: string;
  /** PostgREST filters, e.g. `{ id: 'eq.e-dinner' }`. */
  query: Record<string, string>;
  body: unknown;
}

type Row = Record<string, unknown>;

/**
 * Writes echo their payload like PostgREST with `return=representation`.
 * `seq` keeps ids unique across several inserts in one test.
 */
function writeResult(write: BackendWrite, rows: unknown[], seq: number): Row[] {
  if (write.method === 'POST') {
    const items = (Array.isArray(write.body) ? write.body : [write.body]) as Row[];
    return items.map((item, index) => ({
      id: `${write.table}-new-${seq}-${index}`,
      ...(write.table === 'groups' ? { created_at: '2026-10-01T10:00:00.000Z' } : {}),
      ...item,
    }));
  }
  const matches = (rows as Row[]).filter((row) =>
    Object.entries(write.query).every(([column, filter]) => !filter.startsWith('eq.') || String(row[column]) === filter.slice(3))
  );
  return write.method === 'PATCH' ? matches.map((row) => ({ ...row, ...(write.body as Row) })) : matches;
}

async function fulfillSupabase(route: Route, options: BackendOptions, writes: BackendWrite[]) {
  const request = route.request();
  if (request.method() === 'OPTIONS') {
    return route.fulfill({ status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url());
  const isGroupRpc = url.pathname === '/rest/v1/rpc/get_group';
  const table = isGroupRpc ? 'groups' : url.pathname.replace(/^\/rest\/v1\//, '').split('/')[0];
  if (options.failTables?.includes(table)) {
    return route.fulfill({
      status: 500,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ code: 'XX000', message: 'Simulated backend failure', details: null, hint: null }),
    });
  }

  let rows = { ...TABLES, ...options.tables }[table] ?? [];
  if (isGroupRpc) {
    const requestedId = request.postDataJSON().requested_group_id;
    for (const [index, write] of writes.entries()) {
      if (write.table === 'groups' && write.method === 'POST') {
        const created = writeResult(write, [], index + 1).find(row => row.id === requestedId);
        if (created) rows = [created];
      }
    }
  }
  if (isGroupRpc && request.headers()['x-group-token'] === READ_TOKEN) {
    rows = (rows as Row[]).map(row => ({ ...row, write_token: '' }));
  }
  if (!isGroupRpc && request.method() !== 'GET' && request.method() !== 'HEAD') {
    const write: BackendWrite = {
      method: request.method(),
      table,
      query: Object.fromEntries(url.searchParams),
      body: request.postData() ? request.postDataJSON() : null,
    };
    writes.push(write);
    rows = writeResult(write, rows, writes.length);
  }
  const wantsObject = (request.headers()['accept'] ?? '').includes('vnd.pgrst.object');

  return route.fulfill({
    status: 200,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    body: JSON.stringify(wantsObject ? rows[0] ?? null : rows),
  });
}

/**
 * Serve the app from the local preview server, answer Supabase REST calls
 * with the fixture rows and block every other third-party request.
 * Returns the list of write requests, filled as they happen.
 */
export async function mockBackend(page: Page, options: BackendOptions = {}): Promise<BackendWrite[]> {
  const writes: BackendWrite[] = [];
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();
    if (url.hostname === 'smoke-test.supabase.co' && url.pathname.startsWith('/rest/v1/')) {
      return fulfillSupabase(route, options, writes);
    }
    return route.abort();
  });
  return writes;
}

/**
 * Fails the next `times` requests with this method on one table (HTTP 500); reads and
 * later writes fall through to `mockBackend`. Call it after `mockBackend` so it wins.
 */
export async function failWrites(page: Page, table: string, method: string, times = 1) {
  let remaining = times;
  await page.route(`**/rest/v1/${table}*`, (route) => {
    if (route.request().method() !== method || remaining <= 0) return route.fallback();
    remaining -= 1;
    return route.fulfill({
      status: 500,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ code: 'XX000', message: 'Simulated write failure', details: null, hint: null }),
    });
  });
}

export const groupUrl = (token: string = WRITE_TOKEN) => `/g/${GROUP_ID}#t=${token}`;
