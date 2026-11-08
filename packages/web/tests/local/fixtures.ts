import { randomBytes, randomUUID } from 'node:crypto';
import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { assertLocalUrl } from '../../../../scripts/lib/local-environment.mjs';

export interface TestGroup {
  id: string;
  name: string;
  readToken: string;
  writeToken: string;
}

export interface MemberRow { id: string; group_id: string; name: string }

export class LocalBackend {
  private readonly request: APIRequestContext;
  private readonly groups: TestGroup[] = [];
  private readonly url = assertLocalUrl(process.env.LOCAL_SUPABASE_URL ?? '');
  private readonly key = process.env.LOCAL_SUPABASE_ANON_KEY;

  constructor(request: APIRequestContext) {
    this.request = request;
    if (!this.key) throw new Error('Missing local public API key. Use playwright.local.config.ts.');
  }

  send(method: string, path: string, token?: string, data?: unknown) {
    return this.request.fetch(`${this.url}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: this.key!, Authorization: `Bearer ${this.key}`,
        Prefer: 'return=representation',
        ...(token ? { 'x-group-token': token } : {}),
      },
      data,
    });
  }

  saveExpense(group: TestGroup, expenseId: string, payload: unknown, expectedRevision: number) {
    return this.send('POST', 'rpc/save_expense', group.writeToken, {
      requested_group_id: group.id,
      requested_expense_id: expenseId,
      payload,
      expected_revision: expectedRevision,
    });
  }

  async rows<T = Record<string, unknown>>(method: string, path: string, token?: string, data?: unknown): Promise<T[]> {
    const response = await this.send(method, path, token, data);
    expect(response.ok(), `${method} ${path}: ${await response.text()}`).toBe(true);
    return response.json();
  }

  async createGroup(name = `Local test ${randomUUID()}`) {
    const group: TestGroup = { id: randomUUID(), name,
      readToken: randomBytes(32).toString('hex'), writeToken: randomBytes(32).toString('hex') };
    this.track(group);
    await this.rows('POST', 'groups?select=id,name,currency,created_at', group.writeToken, {
      id: group.id, name, currency: 'EUR', read_token: group.readToken, write_token: group.writeToken,
    });
    return group;
  }

  track(group: TestGroup) { this.groups.push(group); }

  async members(group: TestGroup) {
    return this.rows<MemberRow>('POST', 'members', group.writeToken,
      ['Anna', 'Ben'].map(name => ({ group_id: group.id, name })));
  }

  async expense(group: TestGroup, members: MemberRow[], shareType = 'ratio') {
    const expenseId = randomUUID();
    const shares = shareType === 'percentage' ? [25, 75] : shareType === 'fixed' ? [10, 20] : [1, 1];
    const response = await this.saveExpense(group, expenseId, {
        description: 'Seeded dinner',
        total_amount: 30,
        expense_date: '2026-10-01T18:30:00Z',
        payers: [{ member_id: members[0].id, amount: 30 }],
        splits: members.map((member, index) => ({ member_id: member.id,
          share: shares[index], share_type: shareType })),
      }, 0);
    expect(response.ok(), `save expense: ${await response.text()}`).toBe(true);
    const saved = await response.json();
    return { id: saved.expense.id, payers: saved.payers, splits: saved.splits };
  }

  async dispose() {
    const errors: unknown[] = [];
    for (const group of this.groups) {
      for (const path of [
        `expenses?group_id=eq.${group.id}&select=id`,
        `groups?id=eq.${group.id}&select=id`,
      ]) {
        try {
          await this.rows('DELETE', path, group.writeToken);
        } catch (error) {
          errors.push(error);
        }
      }
    }
    if (errors.length) throw new AggregateError(errors, 'Failed to clean up local test groups.');
  }
}

export const test = base.extend<{ backend: LocalBackend; group: TestGroup; members: MemberRow[] }>({
  page: async ({ page, baseURL }, provide) => {
    const allowed = new Set([new URL(baseURL!).origin, assertLocalUrl(process.env.LOCAL_SUPABASE_URL ?? '')]);
    await page.route('**/*', route => allowed.has(new URL(route.request().url()).origin)
      ? route.continue() : route.abort('blockedbyclient'));
    await provide(page);
  },
  backend: async ({ request }, provide) => {
    const backend = new LocalBackend(request);
    try { await provide(backend); } finally { await backend.dispose(); }
  },
  group: async ({ backend }, provide) => { await provide(await backend.createGroup()); },
  members: async ({ backend, group }, provide) => { await provide(await backend.members(group)); },
});

export { expect };
