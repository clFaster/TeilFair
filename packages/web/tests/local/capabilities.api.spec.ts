import { randomUUID } from 'node:crypto';
import { test, expect } from './fixtures';

test('anonymous creation returns metadata; reader RPC redacts write capability', async ({ backend, group }) => {
  const [reader] = await backend.rows('POST', 'rpc/get_group', group.readToken, { requested_group_id: group.id });
  expect(reader).toMatchObject({ id: group.id, name: group.name, read_token: group.readToken, write_token: '' });
  const [writer] = await backend.rows('POST', 'rpc/get_group', group.writeToken, { requested_group_id: group.id });
  expect(writer.write_token).toBe(group.writeToken);
  for (const token of [undefined, 'invalid-token']) {
    expect(await backend.rows('POST', 'rpc/get_group', token, { requested_group_id: group.id })).toEqual([]);
  }
  const direct = await backend.send('GET', `groups?id=eq.${group.id}&select=write_token`, group.readToken);
  expect(direct.status()).toBe(401);
  expect(await direct.json()).toMatchObject({ code: '42501' });
  const privateRpc = await backend.send('POST', 'rpc/check_group_access', group.writeToken, { group_id: group.id });
  expect(privateRpc.status()).toBe(404);
});

for (const access of ['missing', 'wrong', 'other-group', 'reader'] as const) {
  test(`${access} capability cannot mutate protected rows`, async ({ backend, group, members }) => {
    const expense = await backend.expense(group, members);
    const other = await backend.createGroup();
    const token = { missing: undefined, wrong: 'invalid-token', 'other-group': other.writeToken,
      reader: group.readToken }[access];
    const targets = [
      { table: 'groups', id: group.id, patch: { name: 'unauthorized' } },
      { table: 'members', id: members[0].id, patch: { name: 'unauthorized' } },
      { table: 'expenses', id: expense.id, patch: { description: 'unauthorized' } },
      { table: 'expense_payers', id: expense.payers[0].id, patch: { amount: 99 } },
      { table: 'expense_splits', id: expense.splits[0].id, patch: { share: 99 } },
    ];
    for (const target of targets) {
      const path = `${target.table}?id=eq.${target.id}&select=id`;
      expect(await backend.rows('PATCH', path, token, target.patch)).toEqual([]);
      expect(await backend.rows('DELETE', path, token)).toEqual([]);
      const visible = await backend.rows('GET', path, token);
      expect(visible).toHaveLength(access === 'reader' ? 1 : 0);
      expect(await backend.rows('GET', path, group.writeToken)).toHaveLength(1);
    }
    const insert = await backend.send('POST', 'members', token, { group_id: group.id, name: 'Unauthorized member' });
    expect(insert.status()).toBe(401);
    expect(await insert.json()).toMatchObject({ code: '42501' });
    const [unchanged] = await backend.rows('GET', `members?id=eq.${members[0].id}`, group.writeToken);
    expect(unchanged.name).toBe('Anna');
  });
}

test('writer CRUD persists and deleted expense data is no longer visible', async ({ backend, group, members }) => {
  const expense = await backend.expense(group, members);
  const [updated] = await backend.rows('PATCH', `expenses?id=eq.${expense.id}`, group.writeToken,
    { description: 'Updated dinner', total_amount: 40 });
  expect(updated).toMatchObject({ description: 'Updated dinner', total_amount: 40 });
  await backend.rows('PATCH', `expense_payers?id=eq.${expense.payers[0].id}`, group.writeToken, { amount: 40 });
  expect(await backend.rows('GET', `expenses?id=eq.${expense.id}`, group.readToken)).toHaveLength(1);
  await backend.rows('DELETE', `expenses?id=eq.${expense.id}`, group.writeToken);
  // Physical cascade deletion is checked without RLS in supabase/tests/expense_cascade.sql.
  for (const table of ['expense_payers', 'expense_splits']) {
    expect(await backend.rows('GET', `${table}?expense_id=eq.${expense.id}`, group.writeToken)).toEqual([]);
  }
  const [member] = await backend.rows('PATCH', `members?id=eq.${members[0].id}`, group.writeToken, { name: 'Anna updated' });
  expect(member.name).toBe('Anna updated');
  await backend.rows('DELETE', `members?id=eq.${members[0].id}`, group.writeToken);
  expect(await backend.rows('GET', `members?id=eq.${members[0].id}`, group.writeToken)).toEqual([]);
});

test('moving a member into another group is denied by RLS', async ({ backend, group, members }) => {
  const other = await backend.createGroup();
  const result = await backend.send('PATCH', `members?id=eq.${members[0].id}`, group.writeToken, { group_id: other.id });
  expect(result.status()).toBe(401);
  expect(await result.json()).toMatchObject({ code: '42501' });
  const [member] = await backend.rows('GET', `members?id=eq.${members[0].id}`, group.writeToken);
  expect(member.group_id).toBe(group.id);
});

test('invalid group tokens and expense amounts fail database constraints', async ({ backend, group }) => {
  const badGroup = await backend.send('POST', 'groups?select=id', 'short', {
    id: randomUUID(), name: 'Invalid', read_token: 'short', write_token: 'short',
  });
  expect(badGroup.ok()).toBe(false);
  const badExpense = await backend.send('POST', 'expenses', group.writeToken,
    { group_id: group.id, description: 'Invalid', total_amount: 0 });
  expect(badExpense.status()).toBe(400);
  expect(await backend.rows('GET', `expenses?group_id=eq.${group.id}`, group.writeToken)).toEqual([]);
});
