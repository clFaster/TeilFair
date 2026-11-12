import { describe, expect, it, vi } from 'vitest';
import { EXPENSE_PAGE_SIZE, EXPENSE_SELECT, fetchAllPages, type Page } from '../src/api/pagination';

interface Row { id: string }

const rowsOf = (count: number): Row[] => Array.from({ length: count }, (_, index) => ({ id: `row-${index}` }));

/** Serves `rows` like PostgREST: inclusive offsets, an optional server row cap, the exact total. */
function server(rows: Row[], { cap = Infinity, countTotal = true } = {}) {
  return vi.fn(async (from: number, to: number): Promise<Page<Row>> => ({
    rows: rows.slice(from, Math.min(to + 1, from + cap)),
    total: countTotal ? rows.length : null,
  }));
}

describe('paged reads', () => {
  it('requests the nested expense select in pages of 200', () => {
    expect(EXPENSE_PAGE_SIZE).toBe(200);
    expect(EXPENSE_SELECT).toBe('*, expense_payers(*), expense_splits(*)');
  });

  it.each([
    [0, [[0, 199]]],
    [1, [[0, 199]]],
    [200, [[0, 199]]],
    [201, [[0, 199], [200, 399]]],
    [450, [[0, 199], [200, 399], [400, 599]]],
  ])('reads %i rows once each with inclusive offsets', async (count, calls) => {
    const rows = rowsOf(count);
    const fetchPage = server(rows);
    expect(await fetchAllPages(fetchPage)).toEqual(rows);
    expect(fetchPage.mock.calls).toEqual(calls);
  });

  it('keeps paging to the total when the server returns fewer rows than requested', async () => {
    const rows = rowsOf(120);
    const fetchPage = server(rows, { cap: 50 });
    expect(await fetchAllPages(fetchPage, 200)).toEqual(rows);
    expect(fetchPage.mock.calls).toEqual([[0, 199], [50, 249], [100, 299]]);
  });

  it('follows the latest total when rows are removed or added between pages', async () => {
    const shrinking = vi.fn<(from: number, to: number) => Promise<Page<Row>>>()
      .mockResolvedValueOnce({ rows: rowsOf(2), total: 5 })
      .mockResolvedValueOnce({ rows: [{ id: 'row-2' }], total: 3 });
    expect(await fetchAllPages(shrinking, 2)).toHaveLength(3);
    expect(shrinking).toHaveBeenCalledTimes(2);

    const growing = vi.fn<(from: number, to: number) => Promise<Page<Row>>>()
      .mockResolvedValueOnce({ rows: rowsOf(2), total: 3 })
      .mockResolvedValueOnce({ rows: [{ id: 'row-2' }, { id: 'row-3' }], total: 5 })
      .mockResolvedValueOnce({ rows: [{ id: 'row-4' }], total: 5 });
    expect(await fetchAllPages(growing, 2)).toHaveLength(5);
    expect(growing.mock.calls).toEqual([[0, 1], [2, 3], [4, 5]]);
  });

  it('returns a row repeated across pages once, keeping its first position', async () => {
    const fetchPage = vi.fn<(from: number, to: number) => Promise<Page<Row>>>()
      .mockResolvedValueOnce({ rows: [{ id: 'a' }, { id: 'b' }], total: 4 })
      .mockResolvedValueOnce({ rows: [{ id: 'b' }, { id: 'c' }], total: 4 });
    expect(await fetchAllPages(fetchPage, 2)).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
  });

  it('without a total stops on the first page shorter than the page size', async () => {
    const short = server(rowsOf(5), { countTotal: false });
    expect(await fetchAllPages(short, 2)).toHaveLength(5);
    expect(short.mock.calls).toEqual([[0, 1], [2, 3], [4, 5]]);

    const full = server(rowsOf(4), { countTotal: false });
    expect(await fetchAllPages(full, 2)).toHaveLength(4);
    expect(full.mock.calls).toEqual([[0, 1], [2, 3], [4, 5]]);
  });

  it('rejects an empty page before the total is reached instead of looping or returning partial data', async () => {
    const fetchPage = vi.fn<(from: number, to: number) => Promise<Page<Row>>>()
      .mockResolvedValueOnce({ rows: rowsOf(2), total: 5 })
      .mockResolvedValue({ rows: [], total: 5 });
    await expect(fetchAllPages(fetchPage, 2)).rejects.toThrow('Paged read stopped at 2 of 5 rows');
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('rejects after 50 pages', async () => {
    const counted = server(rowsOf(51));
    await expect(fetchAllPages(counted, 1)).rejects.toThrow('Paged read exceeded 50 pages');
    expect(counted).toHaveBeenCalledTimes(50);

    const endless = vi.fn(async (from: number): Promise<Page<Row>> => ({ rows: [{ id: `row-${from}` }], total: null }));
    await expect(fetchAllPages(endless, 1)).rejects.toThrow('Paged read exceeded 50 pages');
    expect(endless).toHaveBeenCalledTimes(50);

    const exact = server(rowsOf(50));
    expect(await fetchAllPages(exact, 1)).toHaveLength(50);
  });

  it('propagates a failed page and requests nothing further', async () => {
    const failure = new Error('Requested range not satisfiable');
    const fetchPage = vi.fn<(from: number, to: number) => Promise<Page<Row>>>()
      .mockResolvedValueOnce({ rows: rowsOf(2), total: 5 })
      .mockRejectedValueOnce(failure);
    await expect(fetchAllPages(fetchPage, 2)).rejects.toBe(failure);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects page size %s before requesting anything', async (pageSize) => {
    const fetchPage = server(rowsOf(3));
    await expect(fetchAllPages(fetchPage, pageSize)).rejects.toThrow(RangeError);
    expect(fetchPage).not.toHaveBeenCalled();
  });
});
