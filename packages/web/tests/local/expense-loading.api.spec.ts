import type { APIResponse } from '@playwright/test';
import { test, expect, type LocalBackend, type SeededExpense, type TestGroup } from './fixtures';
// The select and paging helper of the app itself, so these are its requests against real PostgREST.
import { EXPENSE_SELECT, fetchAllPages, type Page } from '../../../shared/src/api/pagination';

interface NestedExpense {
  id: string;
  group_id: string;
  total_amount: number;
  expense_date: string;
  expense_payers: Array<{ expense_id: string; member_id: string; amount: number }>;
  expense_splits: Array<{ expense_id: string; member_id: string; share: number; share_type: string }>;
}

/** One page of the app's expense read: inclusive offsets and the exact total. */
function requestPage(backend: LocalBackend, group: TestGroup, token: string | undefined, from: number, to: number) {
  const query = new URLSearchParams({
    select: EXPENSE_SELECT.replace(/\s/g, ''),
    group_id: `eq.${group.id}`,
    order: 'expense_date.desc,id.desc',
    offset: String(from),
    limit: String(to - from + 1),
  });
  return backend.send('GET', `expenses?${query}`, token, undefined, { Prefer: 'count=exact' });
}

async function toPage(response: APIResponse): Promise<Page<NestedExpense>> {
  expect(response.ok(), await response.text()).toBe(true);
  const total = /\/(\d+)$/.exec(response.headers()['content-range'] ?? '')?.[1];
  return { rows: await response.json(), total: total === undefined ? null : Number(total) };
}

/** Newest date first; the id decides between expenses of the same date. */
const inReadOrder = (expenses: SeededExpense[]) => [...expenses]
  .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
  .map(expense => expense.id);

for (const access of ['reader', 'writer'] as const) {
  test(`${access} pages through every expense with its payers and splits`, async ({ backend, group, members }) => {
    const seeded = await backend.expenses(group, members, 5);
    const token = access === 'reader' ? group.readToken : group.writeToken;
    const responses: string[] = [];
    const rows = await fetchAllPages(async (from, to) => {
      const response = await requestPage(backend, group, token, from, to);
      responses.push(`${response.status()} ${response.headers()['content-range']}`);
      return toPage(response);
    }, 2);

    expect(responses).toEqual(['206 0-1/5', '206 2-3/5', '206 4-4/5']);
    expect(rows.map(row => row.id)).toEqual(inReadOrder(seeded));
    for (const row of rows) {
      const expense = seeded.find(candidate => candidate.id === row.id)!;
      expect(row).toMatchObject({ group_id: group.id, total_amount: 30 });
      expect(new Date(row.expense_date).toISOString()).toBe(expense.date);
      expect(row.expense_payers).toEqual([expect.objectContaining({ expense_id: row.id, member_id: expense.payerId, amount: 30 })]);
      expect(row.expense_splits).toHaveLength(members.length);
      expect(row.expense_splits.map(split => split.member_id).sort()).toEqual(members.map(member => member.id).sort());
      for (const split of row.expense_splits) expect(split).toMatchObject({ expense_id: row.id, share: 1, share_type: 'ratio' });
    }

    // A page that holds everything is complete, and the row policies alone confine the read to this group.
    const whole = await requestPage(backend, group, token, 0, 199);
    expect(`${whole.status()} ${whole.headers()['content-range']}`).toBe('200 0-4/5');
    const unfiltered = await backend.rows<NestedExpense>('GET',
      `expenses?select=${EXPENSE_SELECT.replace(/\s/g, '')}`, token);
    expect(unfiltered.map(row => row.id).sort()).toEqual(seeded.map(expense => expense.id).sort());

    // PostgREST answers the offset that equals the total with an empty page and rejects any beyond it.
    const atEnd = await requestPage(backend, group, token, 5, 6);
    expect(`${atEnd.status()} ${atEnd.headers()['content-range']}`).toBe('206 */5');
    expect(await atEnd.json()).toEqual([]);
    const beyond = await requestPage(backend, group, token, 6, 7);
    expect(beyond.status()).toBe(416);
    expect(await beyond.json()).toMatchObject({ code: 'PGRST103' });
  });
}

for (const access of ['missing', 'wrong', 'other-group'] as const) {
  test(`${access} capability reads no expenses, payers or splits`, async ({ backend, group, members }) => {
    const seeded = await backend.expenses(group, members, 3);
    const other = await backend.createGroup();
    const token = { missing: undefined, wrong: 'invalid'.repeat(8), 'other-group': other.writeToken }[access];

    const first = await requestPage(backend, group, token, 0, 199);
    expect(`${first.status()} ${first.headers()['content-range']}`).toBe('200 */0');
    expect(await first.json()).toEqual([]);
    expect(await fetchAllPages(async (from, to) => toPage(await requestPage(backend, group, token, from, to)))).toEqual([]);

    const ids = seeded.map(expense => expense.id).join(',');
    for (const table of ['expense_payers', 'expense_splits']) {
      expect(await backend.rows('GET', `${table}?expense_id=in.(${ids})`, token)).toEqual([]);
      expect(await backend.rows('GET', `${table}?expense_id=in.(${ids})`, group.readToken)).not.toEqual([]);
    }
  });
}

test('the row cap truncates a flat split read but not the nested read', async ({ backend, group }) => {
  // 11 expenses shared by 100 members: 1,100 split rows, above max_rows = 1000 in supabase/config.toml.
  const members = await backend.members(group, 100);
  const seeded = await backend.expenses(group, members, 11, 100);

  const flat = await backend.send('GET', `expense_splits?expense_id=in.(${seeded.map(expense => expense.id).join(',')})`,
    group.readToken, undefined, { Prefer: 'count=exact' });
  expect(`${flat.status()} ${flat.headers()['content-range']}`).toBe('206 0-999/1100');
  expect(await flat.json()).toHaveLength(1000);

  const rows = await fetchAllPages(async (from, to) => toPage(await requestPage(backend, group, group.readToken, from, to)));
  expect(rows.map(row => row.id)).toEqual(inReadOrder(seeded));
  for (const row of rows) {
    expect(row.expense_payers).toHaveLength(1);
    expect(new Set(row.expense_splits.map(split => split.member_id)).size).toBe(100);
  }
  expect(rows.flatMap(row => row.expense_splits)).toHaveLength(1100);
});
