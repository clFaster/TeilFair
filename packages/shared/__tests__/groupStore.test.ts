import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createGroupStoreState, partializeGroupState,
  type GroupState, type GroupStoreApi, type RecentGroup,
} from '../src/store/groupStore';
import { expense, expenseInput, group, members } from './fixtures';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((complete, fail) => { resolve = complete; reject = fail; });
  return { promise, resolve, reject };
}

function setup() {
  const api = {
    createGroup: vi.fn<GroupStoreApi['createGroup']>().mockResolvedValue(group),
    getGroup: vi.fn<GroupStoreApi['getGroup']>().mockResolvedValue(group),
    getTokenPermission: vi.fn<GroupStoreApi['getTokenPermission']>().mockResolvedValue('write'),
    updateGroup: vi.fn<GroupStoreApi['updateGroup']>().mockResolvedValue({ ...group, name: 'New trip', currency: 'USD' }),
    getMembers: vi.fn<GroupStoreApi['getMembers']>().mockResolvedValue(members),
    addMember: vi.fn<GroupStoreApi['addMember']>().mockResolvedValue({ ...members[0], id: 'dave', name: 'Dave' }),
    updateMember: vi.fn<GroupStoreApi['updateMember']>().mockResolvedValue({ ...members[0], name: 'Alicia' }),
    deleteMember: vi.fn<GroupStoreApi['deleteMember']>().mockResolvedValue(undefined),
    getExpenses: vi.fn<GroupStoreApi['getExpenses']>().mockResolvedValue([expense()]),
    createExpense: vi.fn<GroupStoreApi['createExpense']>().mockResolvedValue(expense('taxi', 30, [['bob', 30]])),
    updateExpense: vi.fn<GroupStoreApi['updateExpense']>().mockResolvedValue({ ...expense('dinner', 60), revision: 2 }),
    deleteExpense: vi.fn<GroupStoreApi['deleteExpense']>().mockResolvedValue(undefined),
  } satisfies GroupStoreApi;
  let state: GroupState;
  const set = (partial: Partial<GroupState> | ((value: GroupState) => Partial<GroupState>)) => {
    state = { ...state, ...(typeof partial === 'function' ? partial(state) : partial) };
  };
  state = createGroupStoreState(api, set, () => state);
  return { api, get: () => state, set };
}

function recent(id: string): RecentGroup {
  return { id, name: id, token: `token-${id}`, permission: 'read', lastAccessed: 1 };
}

function snapshot(state: GroupState) {
  return structuredClone(Object.fromEntries(
    Object.entries(state).filter(([, value]) => typeof value !== 'function'),
  ));
}

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
});
afterEach(() => vi.restoreAllMocks());

describe('loading groups', () => {
  it.each(['read', 'write'] as const)('loads data with %s access and computes balances and recent statistics', async permission => {
    const { api, get, set } = setup();
    api.getTokenPermission.mockResolvedValue(permission);
    set({ error: 'previous failure' });
    const pending = get().loadGroup(group.id, 'provided-token');
    expect(get()).toMatchObject({ loading: true, error: null });
    expect(await pending).toBe(true);
    expect(api.getTokenPermission).toHaveBeenCalledWith(group.id, 'provided-token');
    for (const method of [api.getGroup, api.getMembers, api.getExpenses]) {
      expect(method).toHaveBeenCalledExactlyOnceWith(group.id, 'provided-token');
    }
    expect(get()).toMatchObject({
      group, members, expenses: [expense()], token: 'provided-token', permission, loading: false, error: null,
      memberBalances: [
        { memberId: 'alice', totalPaid: 90, totalOwed: 30, netBalance: 60 },
        { memberId: 'bob', totalPaid: 0, totalOwed: 30, netBalance: -30 },
        { memberId: 'carol', totalPaid: 0, totalOwed: 30, netBalance: -30 },
      ],
      settlements: [
        { fromMemberId: 'bob', toMemberId: 'alice', amount: 30 },
        { fromMemberId: 'carol', toMemberId: 'alice', amount: 30 },
      ],
      recentGroups: [{ id: group.id, name: group.name, token: 'provided-token', permission,
        lastAccessed: Date.now(), memberCount: 3, expenseCount: 1, totalExpenses: 90, currency: 'EUR' }],
    });
  });

  it('moves an existing recent group to the front and limits history to ten', async () => {
    const { get, set } = setup();
    const history = Array.from({ length: 10 }, (_, i) => recent(`old-${i}`));
    set({ recentGroups: history });
    await get().loadGroup(group.id, 'first-token');
    expect(get().recentGroups.map(g => g.id)).toEqual([group.id, ...history.slice(0, 9).map(g => g.id)]);
    await get().loadGroup(group.id, 'replacement-token');
    expect(get().recentGroups).toHaveLength(10);
    expect(get().recentGroups[0].token).toBe('replacement-token');
    expect(get().recentGroups.filter(g => g.id === group.id)).toHaveLength(1);
    expect(history).toHaveLength(10);
  });

  it('stops before fetching data when permission cannot be established', async () => {
    const { api, get } = setup();
    api.getTokenPermission.mockResolvedValue(null);
    expect(await get().loadGroup(group.id, 'invalid')).toBe(false);
    expect(get()).toMatchObject({ group: null, loading: false, error: 'Invalid token or group not found', recentGroups: [] });
    expect(api.getGroup).not.toHaveBeenCalled();
    expect(api.getMembers).not.toHaveBeenCalled();
    expect(api.getExpenses).not.toHaveBeenCalled();
  });

  it('handles a group disappearing after permission lookup', async () => {
    const { api, get } = setup();
    api.getGroup.mockResolvedValue(null);
    expect(await get().loadGroup(group.id, group.readToken)).toBe(false);
    expect(get()).toMatchObject({ group: null, loading: false, error: 'Group not found', recentGroups: [] });
  });

  it('ignores a permission lookup superseded by a newer load', async () => {
    const { api, get } = setup();
    const permission = deferred<'read' | 'write' | null>();
    api.getTokenPermission.mockReturnValueOnce(permission.promise);
    const staleLoad = get().loadGroup('old-group', 'old-token');
    await vi.waitFor(() => expect(api.getTokenPermission).toHaveBeenCalledOnce());

    api.getGroup.mockResolvedValue({ ...group, id: 'new-group' });
    expect(await get().loadGroup('new-group', 'new-token')).toBe(true);
    const currentState = snapshot(get());
    permission.resolve('write');

    expect(await staleLoad).toBe(false);
    expect(snapshot(get())).toEqual(currentState);
  });

  it('ignores a permission lookup failure after a newer load supersedes it', async () => {
    const { api, get } = setup();
    const permission = deferred<'read' | 'write' | null>();
    api.getTokenPermission.mockReturnValueOnce(permission.promise);
    const staleLoad = get().loadGroup('old-group', 'old-token');
    await vi.waitFor(() => expect(api.getTokenPermission).toHaveBeenCalledOnce());

    api.getGroup.mockResolvedValue({ ...group, id: 'new-group' });
    expect(await get().loadGroup('new-group', 'new-token')).toBe(true);
    const currentState = snapshot(get());
    permission.reject(new Error('Stale permission lookup failed'));

    expect(await staleLoad).toBe(false);
    expect(snapshot(get())).toEqual(currentState);
  });

  it.each(['getTokenPermission', 'getGroup', 'getMembers', 'getExpenses'] as const)('handles %s failure without partially installing data', async method => {
    const { api, get } = setup();
    api[method].mockRejectedValue(new Error('Network unavailable'));
    expect(await get().loadGroup(group.id, group.readToken)).toBe(false);
    expect(get()).toMatchObject({ group: null, members: [], expenses: [], loading: false, error: 'Network unavailable', recentGroups: [] });
  });

  it('uses a fallback error message and can recover on retry', async () => {
    const { api, get } = setup();
    api.getGroup.mockRejectedValueOnce('offline');
    expect(await get().loadGroup(group.id, group.readToken)).toBe(false);
    expect(get().error).toBe('Failed to load group');
    expect(await get().loadGroup(group.id, group.writeToken)).toBe(true);
    expect(get()).toMatchObject({ error: null, loading: false, group });
  });
});

describe('creating and maintaining groups', () => {
  it.each([undefined, 'USD'])('creates a writable empty group with currency %s', async currency => {
    const { api, get } = setup();
    await get().loadGroup(group.id, group.readToken);
    api.createGroup.mockResolvedValue({ ...group, id: 'new-group', currency: currency ?? 'EUR' });
    const pending = get().createGroup('New group', currency);
    expect(get().loading).toBe(true);
    const created = await pending;
    expect(api.createGroup).toHaveBeenCalledExactlyOnceWith('New group', currency ?? 'EUR');
    expect(get()).toMatchObject({ group: created, token: created.writeToken, permission: 'write', loading: false,
      members: [], expenses: [], memberBalances: [], settlements: [] });
    expect(get().recentGroups[0]).toMatchObject({ id: created.id, token: created.writeToken, permission: 'write', memberCount: 0, expenseCount: 0, totalExpenses: 0 });
  });

  it.each([new Error('Creation failed'), 'offline'])('reports creation failure and rethrows it', async failure => {
    const { api, get } = setup();
    api.createGroup.mockRejectedValue(failure);
    await expect(get().createGroup('Trip')).rejects.toBe(failure);
    expect(get()).toMatchObject({ loading: false, group: null, recentGroups: [],
      error: failure instanceof Error ? failure.message : 'Failed to create group' });
  });

  it('retains a created group in recent history when creation is superseded', async () => {
    const { api, get } = setup();
    const pending = deferred<typeof group>();
    const created = { ...group, id: 'new-group', name: 'New group' };
    api.createGroup.mockReturnValueOnce(pending.promise);
    const creation = get().createGroup('New group');
    await vi.waitFor(() => expect(api.createGroup).toHaveBeenCalledOnce());
    get().clearGroup();
    const clearedState = snapshot(get());

    pending.resolve(created);

    expect(await creation).toEqual(created);
    expect(get()).toMatchObject({ group: null, members: [], expenses: [], permission: null, token: null,
      loading: false, recentGroups: [expect.objectContaining({ id: created.id, token: created.writeToken })] });
    expect(snapshot(get())).not.toEqual(clearedState);
  });

  it('does not set an error when superseded creation fails', async () => {
    const { api, get } = setup();
    const pending = deferred<typeof group>();
    const failure = new Error('Creation failed after cancellation');
    api.createGroup.mockReturnValueOnce(pending.promise);
    const creation = get().createGroup('New group');
    await vi.waitFor(() => expect(api.createGroup).toHaveBeenCalledOnce());
    get().clearGroup();
    const clearedState = snapshot(get());

    pending.reject(failure);

    await expect(creation).rejects.toBe(failure);
    expect(snapshot(get())).toEqual(clearedState);
  });

  it('updates group details and recent statistics while retaining other history', async () => {
    const { api, get, set } = setup();
    set({ recentGroups: [recent('other')] });
    await get().loadGroup(group.id, group.writeToken);
    await get().updateGroup({ name: 'New trip', currency: 'USD' });
    expect(api.updateGroup).toHaveBeenCalledExactlyOnceWith(group.id, group.writeToken, { name: 'New trip', currency: 'USD' });
    expect(get().group).toMatchObject({ name: 'New trip', currency: 'USD' });
    expect(get().recentGroups).toEqual([
      expect.objectContaining({ name: 'New trip', currency: 'USD', memberCount: 3, expenseCount: 1, totalExpenses: 90 }),
      recent('other'),
    ]);
  });

  it('adds, renames, and removes members and maintains the member count', async () => {
    const { api, get } = setup();
    await get().loadGroup(group.id, group.writeToken);
    const added = await get().addMember('Dave');
    expect(api.addMember).toHaveBeenCalledExactlyOnceWith(group.id, group.writeToken, 'Dave');
    expect(get().members).toEqual([...members, added]);
    expect(get().recentGroups[0].memberCount).toBe(4);
    await get().updateMember('alice', 'Alicia');
    expect(api.updateMember).toHaveBeenCalledExactlyOnceWith('alice', group.writeToken, 'Alicia');
    expect(get().members.map(m => m.name)).toEqual(['Alicia', 'bob', 'carol', 'Dave']);
    await get().deleteMember('dave');
    expect(api.deleteMember).toHaveBeenCalledExactlyOnceWith('dave', group.writeToken);
    expect(get().members.map(m => m.id)).toEqual(['alice', 'bob', 'carol']);
    expect(get().recentGroups[0].memberCount).toBe(3);
  });
});

describe('expense lifecycle', () => {
  it('recalculates balances, settlements, and recent totals after adding, updating, and deleting', async () => {
    const { api, get } = setup();
    await get().loadGroup(group.id, group.writeToken);
    const taxi = expense('taxi', 30, [['bob', 30]]);
    expect(await get().addExpense(expenseInput(taxi))).toEqual(taxi);
    expect(api.createExpense).toHaveBeenCalledExactlyOnceWith(group.id, group.writeToken, expenseInput(taxi));
    expect(get().expenses.map(e => e.id)).toEqual(['taxi', 'dinner']);
    expect(get().memberBalances.map(b => b.netBalance)).toEqual([-10, 50, -40]);
    expect(get().settlements).toEqual([
      { fromMemberId: 'carol', toMemberId: 'alice', amount: 40 },
      { fromMemberId: 'bob', toMemberId: 'alice', amount: 10 },
    ]);
    expect(get().recentGroups[0]).toMatchObject({ expenseCount: 2, totalExpenses: 120 });

    await get().updateExpense('dinner', expenseInput(expense('dinner', 60)));
    expect(api.updateExpense).toHaveBeenCalledExactlyOnceWith(group.id, 'dinner', group.writeToken, expenseInput(expense('dinner', 60)), 1);
    expect(get().expenses).toEqual([taxi, { ...expense('dinner', 60), revision: 2 }]);
    expect(get().memberBalances.map(b => b.netBalance)).toEqual([0, 30, -30]);
    expect(get().settlements).toEqual([{ fromMemberId: 'carol', toMemberId: 'alice', amount: 30 }]);
    expect(get().recentGroups[0]).toMatchObject({ expenseCount: 2, totalExpenses: 90 });

    await get().deleteExpense('dinner');
    expect(api.deleteExpense).toHaveBeenCalledExactlyOnceWith('dinner', group.writeToken);
    expect(get().expenses).toEqual([taxi]);
    expect(get().memberBalances.map(b => b.netBalance)).toEqual([20, -10, -10]);
    expect(get().settlements).toHaveLength(2);
    expect(get().recentGroups[0]).toMatchObject({ expenseCount: 1, totalExpenses: 30 });
    await get().deleteExpense('taxi');
    expect(get()).toMatchObject({ expenses: [], memberBalances: [], settlements: [] });
    expect(get().recentGroups[0]).toMatchObject({ expenseCount: 0, totalExpenses: 0 });
  });
});

const mutations = [
  { action: 'updateGroup', method: 'updateGroup', run: (s: GroupState) => s.updateGroup({ name: 'Renamed' }) },
  { action: 'addMember', method: 'addMember', run: (s: GroupState) => s.addMember('Dave') },
  { action: 'updateMember', method: 'updateMember', run: (s: GroupState) => s.updateMember('alice', 'Alicia') },
  { action: 'deleteMember', method: 'deleteMember', run: (s: GroupState) => s.deleteMember('alice') },
  { action: 'addExpense', method: 'createExpense', run: (s: GroupState) => s.addExpense(expenseInput(expense())) },
  { action: 'updateExpense', method: 'updateExpense', run: (s: GroupState) => s.updateExpense('dinner', expenseInput(expense())) },
  { action: 'deleteExpense', method: 'deleteExpense', run: (s: GroupState) => s.deleteExpense('dinner') },
] as const;

describe('mutation failure handling', () => {
  it.each(mutations)('$action rejects read-only access before calling the API', async ({ method, run }) => {
    const { api, get } = setup();
    api.getTokenPermission.mockResolvedValue('read');
    await get().loadGroup(group.id, group.readToken);
    await expect(run(get())).rejects.toThrow('Write access required');
    expect(api[method]).not.toHaveBeenCalled();
  });
  it.each(mutations)('$action requires a loaded group before calling the API', async ({ method, run }) => {
    const { api, get } = setup();
    await expect(run(get())).rejects.toThrow('No group loaded');
    expect(api[method]).not.toHaveBeenCalled();
  });

  it.each(mutations)('$action rejects while group state is loading', async ({ method, run }) => {
    const { api, get, set } = setup();
    await get().loadGroup(group.id, group.writeToken);
    set({ loading: true });
    await expect(run(get())).rejects.toThrow('Write access required');
    expect(api[method]).not.toHaveBeenCalled();
  });

  it.each(mutations)('$action preserves state if its API request fails', async ({ method, run }) => {
    const { api, get } = setup();
    await get().loadGroup(group.id, group.writeToken);
    const before = snapshot(get());
    api[method].mockRejectedValue(new Error('Write rejected'));
    await expect(run(get())).rejects.toThrow('Write rejected');
    expect(snapshot(get())).toEqual(before);
  });
});

describe('authorization transitions', () => {
  it('clears active authority immediately and retains saved links after a failed load', async () => {
    const { api, get } = setup();
    await get().loadGroup(group.id, group.writeToken);
    const history = structuredClone(get().recentGroups);
    api.getTokenPermission.mockResolvedValue(null);
    const loading = get().loadGroup('other', 'invalid');
    expect(get()).toMatchObject({ group: null, token: null, permission: null, members: [], expenses: [], loading: true });
    await expect(get().addMember('Wrong group')).rejects.toThrow('No group loaded');
    expect(await loading).toBe(false);
    expect(get().recentGroups).toEqual(history);
    expect(api.addMember).not.toHaveBeenCalled();
  });

  it('discards a late writer load after a newer reader load', async () => {
    const { api, get } = setup();
    const old = deferred<typeof group | null>();
    api.getGroup.mockReturnValueOnce(old.promise);
    const first = get().loadGroup(group.id, group.writeToken);
    await vi.waitFor(() => expect(api.getGroup).toHaveBeenCalledTimes(1));
    api.getTokenPermission.mockResolvedValue('read');
    await get().loadGroup(group.id, group.readToken);
    old.resolve(group);
    expect(await first).toBe(false);
    expect(get()).toMatchObject({ permission: 'read', token: group.readToken });
  });

  it('forgetting a pending group prevents it from being restored by a late response', async () => {
    const { api, get } = setup();
    const pending = deferred<typeof group | null>();
    api.getGroup.mockReturnValue(pending.promise);
    const loading = get().loadGroup(group.id, group.writeToken);
    await vi.waitFor(() => expect(api.getGroup).toHaveBeenCalled());
    get().removeFromRecent(group.id);
    pending.resolve(group);
    expect(await loading).toBe(false);
    expect(get()).toMatchObject({ group: null, token: null, recentGroups: [], loading: false });
  });

  it('a late mutation cannot add data to a newly loaded group', async () => {
    const { api, get } = setup();
    await get().loadGroup(group.id, group.writeToken);
    const pending = deferred<typeof members[number]>();
    api.addMember.mockReturnValue(pending.promise);
    const mutation = get().addMember('Old group');
    api.getGroup.mockResolvedValue({ ...group, id: 'new-group' });
    await get().loadGroup('new-group', 'new-token');
    const before = snapshot(get());
    pending.resolve({ ...members[0], id: 'late-member' });
    await mutation;
    expect(snapshot(get())).toEqual(before);
  });

  it.each(mutations)('$action cannot update state after the group is cleared', async ({ method, run }) => {
    const { api, get } = setup();
    await get().loadGroup(group.id, group.writeToken);
    const pending = deferred<unknown>();
    api[method].mockReturnValueOnce(pending.promise as never);
    const mutation = run(get());
    await vi.waitFor(() => expect(api[method]).toHaveBeenCalledOnce());
    get().clearGroup();
    const clearedState = snapshot(get());

    pending.resolve(undefined);
    await mutation;

    expect(snapshot(get())).toEqual(clearedState);
  });

  it('rejects updating an expense that is not in the loaded group', async () => {
    const { api, get } = setup();
    await get().loadGroup(group.id, group.writeToken);

    await expect(get().updateExpense('missing-expense', expenseInput(expense())))
      .rejects.toThrow('Expense not found');
    expect(api.updateExpense).not.toHaveBeenCalled();
  });
});

describe('local persistence', () => {
  it('persists only recent groups and clears active state without removing history', async () => {
    const { get, set } = setup();
    await get().loadGroup(group.id, group.writeToken);
    const history = structuredClone(get().recentGroups);
    expect(partializeGroupState(get())).toEqual({ recentGroups: history });
    set({ error: 'Old failure' });
    get().clearGroup();
    expect(get()).toMatchObject({ group: null, token: null, permission: null, members: [], expenses: [],
      memberBalances: [], settlements: [], error: null, recentGroups: history });
    get().removeFromRecent('missing');
    expect(get().recentGroups).toEqual(history);
    get().removeFromRecent(group.id);
    expect(get().recentGroups).toEqual([]);
  });
});
