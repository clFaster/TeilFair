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
    const [expense] = await this.rows<{ id: string }>('POST', 'expenses', group.writeToken, {
      group_id: group.id, description: 'Seeded dinner', total_amount: 30,
      expense_date: '2026-10-01T18:30:00Z',
    });
    const payers = await this.rows<{ id: string }>('POST', 'expense_payers', group.writeToken,
      { expense_id: expense.id, member_id: members[0].id, amount: 30 });
    const shares = shareType === 'percentage' ? [25, 75] : shareType === 'fixed' ? [10, 20] : [1, 1];
    const splits = await this.rows<{ id: string }>('POST', 'expense_splits', group.writeToken,
      members.map((member, index) => ({ expense_id: expense.id, member_id: member.id,
        share: shares[index], share_type: shareType })));
    return { id: expense.id, payers, splits };
  }

  async dispose() {
    for (const group of this.groups) {
      await this.rows('DELETE', `groups?id=eq.${group.id}&select=id`, group.writeToken);
    }
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
