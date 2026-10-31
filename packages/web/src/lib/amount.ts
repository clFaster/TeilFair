/**
 * Strict money input parsing.
 *
 * Grammar (the whole string is validated before any grouping is stripped):
 *   amount   = integer [ D fraction ]
 *   integer  = digits | \d{1,3} ( G \d{3} )+     one uniform grouping char G, G != D
 *   fraction = \d{1..currency digits}            no spaces or apostrophes
 *   G        = "." | "," | space (incl. NBSP / narrow NBSP) | "'" | "’"
 *
 * Choosing the decimal separator D:
 *   - currency without minor unit (JPY): there is none, every "." / "," is grouping
 *   - both "." and "," present: the last one is D ("1,234.56", "1.234,56")
 *   - the same separator repeated: grouping only ("1.234.567")
 *   - a single separator followed by exactly three digits is ambiguous ("1.234")
 *     and rejected unless the currency has three decimals
 *   - otherwise a single separator is D ("12,5", "12.50")
 * Anything else ("1,23,4", "1.5.0", "12 50", "12,5 0") is rejected instead of
 * being silently reinterpreted.
 */

/** Amount columns are DECIMAL(12, 2) in the database. */
export const MAX_AMOUNT = 9_999_999_999.99;

/** Largest amount that can be entered with the given number of decimals. */
export function maxAmountForDigits(fractionDigits: number): number {
  const scale = Math.pow(10, Math.min(fractionDigits, 2));
  return Math.floor(Math.round(MAX_AMOUNT * 100) / (100 / scale)) / scale;
}

/** Maximum amount allowed for a currency, respecting its decimal precision. */
export function maxAmountForCurrency(currency: string): number {
  return maxAmountForDigits(currencyFractionDigits(currency));
}

export type AmountParseResult =
  | { ok: true; value: number }
  | { ok: false; reason: 'empty' | 'format' | 'tooLarge' };

const FORMAT_ERROR: AmountParseResult = { ok: false, reason: 'format' };

const count = (text: string, char: string) => text.split(char).length - 1;

/**
 * Returns the decimal separator, '' when the input has none, or null when the
 * separators cannot be read unambiguously.
 */
function decimalSeparator(text: string, fractionDigits: number): '.' | ',' | '' | null {
  if (fractionDigits === 0) return '';
  const dots = count(text, '.');
  const commas = count(text, ',');
  if (dots > 0 && commas > 0) return text.lastIndexOf('.') > text.lastIndexOf(',') ? '.' : ',';
  const sep = dots > 0 ? '.' : commas > 0 ? ',' : '';
  if (sep === '' || dots + commas > 1) return '';
  const tailDigits = text.length - text.indexOf(sep) - 1;
  if (tailDigits === 3 && fractionDigits !== 3) return null;
  return sep;
}

/** Plain digits, or 1–3 leading digits followed by groups of exactly three with one uniform grouping char. */
function parseInteger(text: string, decimal: string): string | null {
  if (/^\d+$/.test(text)) return text;
  const grouping = text.match(/[^\d]/)?.[0];
  if (!grouping || grouping === decimal) return null;
  const escaped = grouping.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!new RegExp(`^\\d{1,3}(?:${escaped}\\d{3})+$`).test(text)) return null;
  return text.split(grouping).join('');
}

export function parseAmount(raw: string | undefined, fractionDigits = 2): AmountParseResult {
  // Treat all space variants and both apostrophes as one grouping character each.
  const text = (raw ?? '').trim().replace(/[\s\u00a0\u202f]/g, ' ').replace(/’/g, "'");
  if (text === '') return { ok: false, reason: 'empty' };
  if (!/^[\d., ']+$/.test(text)) return FORMAT_ERROR;

  const decimal = decimalSeparator(text, fractionDigits);
  if (decimal === null) return FORMAT_ERROR;

  let integerText = text;
  let fraction = '';
  if (decimal !== '') {
    const at = text.lastIndexOf(decimal);
    if (text.indexOf(decimal) !== at) return FORMAT_ERROR;
    integerText = text.slice(0, at);
    fraction = text.slice(at + 1);
    if (fraction !== '' && !new RegExp(`^\\d{1,${fractionDigits}}$`).test(fraction)) return FORMAT_ERROR;
    // "12," while typing is fine; "." or a dangling separator after grouping ("1,234.") is not.
    if (fraction === '' && !/^\d+$/.test(integerText)) return FORMAT_ERROR;
  }

  const integer = integerText === '' && fraction !== '' ? '0' : parseInteger(integerText, decimal);
  if (integer === null) return FORMAT_ERROR;

  const parsed = Number(fraction ? `${integer}.${fraction}` : integer);
  if (!Number.isFinite(parsed)) return FORMAT_ERROR;
  if (parsed > maxAmountForDigits(fractionDigits)) return { ok: false, reason: 'tooLarge' };
  return { ok: true, value: parsed };
}

/** An amount loaded from the database together with the text it was prefilled as. */
export interface StoredAmount {
  text: string;
  value: number;
}

/** Decimals of the DECIMAL(12, 2) amount columns. */
const STORED_DIGITS = 2;

/** Prefill text at database precision (2 dp), independent of the currency's digits. */
export function storedAmount(value: number): StoredAmount {
  return { text: String(Number(value.toFixed(STORED_DIGITS))), value };
}

/** Unchanged prefilled text keeps the stored number; anything else goes through parseAmount. */
export function resolveAmount(raw: string | undefined, fractionDigits = 2, stored?: StoredAmount): AmountParseResult {
  if (stored && (raw ?? '').trim() === stored.text) return { ok: true, value: stored.value };
  return parseAmount(raw, fractionDigits);
}

/** Drop characters that can never be part of an amount (letters, currency signs) while typing. */
export const sanitizeAmount = (value: string) => value.replace(/[^\d.,\s\u00a0\u202f'’-]/g, '').replace(/^\s+/, '');

/** Parsed value, or NaN when the input is empty or invalid. */
export const amountValue = (raw: string | undefined, fractionDigits = 2) => {
  const result = parseAmount(raw, fractionDigits);
  return result.ok ? result.value : Number.NaN;
};

/** Number of minor-unit digits of a currency (2 for EUR, 0 for JPY). */
export function currencyFractionDigits(currency: string): number {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}
