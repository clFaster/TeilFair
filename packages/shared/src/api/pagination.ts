/** Expenses requested per page. Each row embeds its payers and splits. */
export const EXPENSE_PAGE_SIZE = 200;

/** PostgREST select that returns every expense with its payers and splits embedded. */
export const EXPENSE_SELECT = '*, expense_payers(*), expense_splits(*)';

const MAX_PAGES = 50;

export interface Page<T> {
  rows: T[];
  /** Exact number of rows matching the query, or null when the server did not report it. */
  total: number | null;
}

/**
 * Calls fetchPage(from, to) with inclusive offsets until every row is read.
 * - advances by the number of rows received, so a server row cap below pageSize is harmless
 * - stops when the rows read reach the latest total, or (total unknown) on a page shorter than pageSize
 * - drops rows whose id was already collected
 * - throws when a page is empty although the server reports more rows, and after 50 pages,
 *   rather than returning incomplete data
 */
export async function fetchAllPages<T extends { id: string }>(
  fetchPage: (from: number, to: number) => Promise<Page<T>>,
  pageSize: number = EXPENSE_PAGE_SIZE
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new RangeError('Page size must be a positive integer');
  }

  const collected = new Map<string, T>();
  let offset = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const { rows, total } = await fetchPage(offset, offset + pageSize - 1);
    for (const row of rows) {
      if (!collected.has(row.id)) collected.set(row.id, row);
    }
    offset += rows.length;

    const complete = total === null ? rows.length < pageSize : offset >= total;
    if (complete) return Array.from(collected.values());
    if (rows.length === 0) {
      throw new Error(`Paged read stopped at ${offset} of ${total} rows`);
    }
  }

  throw new Error(`Paged read exceeded ${MAX_PAGES} pages`);
}
