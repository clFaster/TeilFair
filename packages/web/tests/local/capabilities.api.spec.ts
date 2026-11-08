import { randomBytes, randomUUID } from 'node:crypto';
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
    ];
    for (const target of targets) {
      const path = `${target.table}?id=eq.${target.id}&select=id`;
      expect(await backend.rows('PATCH', path, token, target.patch)).toEqual([]);
      expect(await backend.rows('DELETE', path, token)).toEqual([]);
      const visible = await backend.rows('GET', path, token);
      expect(visible).toHaveLength(access === 'reader' ? 1 : 0);
      expect(await backend.rows('GET', path, group.writeToken)).toHaveLength(1);
    }
    const rpc = await backend.send('POST', 'rpc/save_expense', token, {
      requested_group_id: group.id,
      requested_expense_id: expense.id,
      expected_revision: 1,
      payload: {
        description: 'unauthorized', total_amount: 30, expense_date: '2026-10-01T18:30:00Z',
        payers: [{ member_id: members[0].id, amount: 30 }],
        splits: [{ member_id: members[0].id, share: 1, share_type: 'ratio' }],
      },
    });
    expect(rpc.status()).toBe(401);
    expect(await rpc.json()).toMatchObject({ code: '42501' });
    const directExpenseUpdate = await backend.send('PATCH', `expenses?id=eq.${expense.id}`, token,
      { description: 'unauthorized' });
    expect(directExpenseUpdate.status()).toBe(401);
    expect(await directExpenseUpdate.json()).toMatchObject({ code: '42501' });
    for (const table of ['expense_payers', 'expense_splits']) {
      const path = `${table}?id=eq.${table === 'expense_payers' ? expense.payers[0].id : expense.splits[0].id}`;
      for (const [method, body] of [
        ['PATCH', table === 'expense_payers' ? { amount: 99 } : { share: 99 }],
        ['DELETE', undefined],
      ] as const) {
        const response = await backend.send(method, path, token, body);
        expect(response.status()).toBe(401);
        expect(await response.json()).toMatchObject({ code: '42501' });
      }
    }
    const insert = await backend.send('POST', 'members', token, { group_id: group.id, name: 'Unauthorized member' });
    expect(insert.status()).toBe(401);
    expect(await insert.json()).toMatchObject({ code: '42501' });
    const [unchanged] = await backend.rows('GET', `members?id=eq.${members[0].id}`, group.writeToken);
    expect(unchanged.name).toBe('Anna');
  });
}

test('token rotation revokes old links and preserves the new permission split', async ({ backend, group }) => {
  const oldReader = group.readToken;
  const oldWriter = group.writeToken;
  const readToken = randomBytes(16).toString('hex');
  const writeToken = randomBytes(16).toString('hex');
  const payload = { requested_group_id: group.id, new_read_token: readToken, new_write_token: writeToken };
  const denied = await backend.send('POST', 'rpc/rotate_group_tokens', oldReader, payload);
  expect(denied.status()).toBe(401);
  expect(await denied.json()).toMatchObject({ code: '42501' });
  const response = await backend.send('POST', 'rpc/rotate_group_tokens', oldWriter, payload);
  expect(response.ok()).toBe(true);
  // The fixture retains the replacement capability for cleanup.
  group.readToken = readToken;
  group.writeToken = writeToken;
  expect(await response.json()).toMatchObject([{ id: group.id, read_token: readToken, write_token: writeToken }]);
  for (const token of [oldReader, oldWriter]) {
    expect(await backend.rows('POST', 'rpc/get_group', token, { requested_group_id: group.id })).toEqual([]);
  }
  const [reader] = await backend.rows('POST', 'rpc/get_group', readToken, { requested_group_id: group.id });
  expect(reader.write_token).toBe('');
  const [updated] = await backend.rows('PATCH', `groups?id=eq.${group.id}&select=id,name`, writeToken, { name: 'Rotated group' });
  expect(updated.name).toBe('Rotated group');
});

test('writer CRUD persists and deleted expense data is no longer visible', async ({ backend, group, members }) => {
  const expense = await backend.expense(group, members);
  const saved = await backend.saveExpense(group, expense.id, {
    description: 'Updated dinner',
    total_amount: 40,
    expense_date: '2026-10-01T18:30:00Z',
    payers: [{ member_id: members[0].id, amount: 40 }],
    splits: [{ member_id: members[0].id, share: 1, share_type: 'ratio' }],
  }, 1);
  expect(saved.ok()).toBe(true);
  expect(await saved.json()).toMatchObject({ expense: { description: 'Updated dinner', total_amount: 40, revision: 2 } });
  const directChildWrite = await backend.send('PATCH', `expense_payers?id=eq.${expense.payers[0].id}`,
    group.writeToken, { amount: 40 });
  expect(directChildWrite.status()).toBe(401);
  expect(await directChildWrite.json()).toMatchObject({ code: '42501' });
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

test('moving a member into another group is denied', async ({ backend, group, members }) => {
  const other = await backend.createGroup();
  const result = await backend.send('PATCH', `members?id=eq.${members[0].id}`, group.writeToken, { group_id: other.id });
  // The recovered quota trigger checks target-group authority before the
  // immutable-parent trigger runs, so this fails at authorization first.
  expect(result.status()).toBe(401);
  expect(await result.json()).toMatchObject({ code: '42501' });
  const [member] = await backend.rows('GET', `members?id=eq.${members[0].id}`, group.writeToken);
  expect(member.group_id).toBe(group.id);
});

test('expense participants must belong to the expense group', async ({ backend, group, members }) => {
  const expense = await backend.expense(group, members);
  const other = await backend.createGroup();
  const [foreign] = await backend.members(other);
  for (const table of ['expense_payers', 'expense_splits']) {
    const payload = {
      description: 'Foreign participant',
      total_amount: 30,
      expense_date: '2026-10-01T18:30:00Z',
      payers: [{ member_id: table === 'expense_payers' ? foreign.id : members[0].id, amount: 30 }],
      splits: [{ member_id: table === 'expense_splits' ? foreign.id : members[0].id, share: 1, share_type: 'ratio' }],
    };
    const response = await backend.saveExpense(group, randomUUID(), payload, 0);
    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({ code: '23514' });
    const update = await backend.saveExpense(group, expense.id, payload, 1);
    expect(update.status()).toBe(400);
    expect(await update.json()).toMatchObject({ code: '23514' });
  }
});

test('invalid group tokens and expense amounts fail database constraints', async ({ backend, group, members }) => {
  const badGroup = await backend.send('POST', 'groups?select=id', 'short', {
    id: randomUUID(), name: 'Invalid', read_token: 'short', write_token: 'short',
  });
  expect(badGroup.ok()).toBe(false);
  const badExpense = await backend.saveExpense(group, randomUUID(), {
    description: 'Invalid',
    total_amount: 0,
    expense_date: '2026-10-01T18:30:00Z',
    payers: [{ member_id: members[0].id, amount: 0 }],
    splits: [{ member_id: members[0].id, share: 1, share_type: 'ratio' }],
  }, 0);
  expect(badExpense.status()).toBe(400);
  expect(await badExpense.json()).toMatchObject({ code: '22023' });
  expect(await backend.rows('GET', `expenses?group_id=eq.${group.id}`, group.writeToken)).toEqual([]);
});
