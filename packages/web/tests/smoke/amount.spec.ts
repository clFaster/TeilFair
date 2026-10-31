import { expect, test } from '@playwright/test';
import {
  MAX_AMOUNT,
  currencyFractionDigits,
  maxAmountForCurrency,
  maxAmountForDigits,
  parseAmount,
  resolveAmount,
  sanitizeAmount,
  storedAmount,
} from '../../src/lib/amount';

const value = (raw: string, digits?: number) => {
  const result = parseAmount(raw, digits);
  return result.ok ? result.value : result.reason;
};

test.describe('parseAmount', () => {
  test('reads typed and pasted amounts in EN and DE notation (2 decimals)', () => {
    const cases: Array<[string, number]> = [
      ['12', 12],
      ['12,5', 12.5],
      ['12.50', 12.5],
      ['0,99', 0.99],
      [',5', 0.5],
      ['12,', 12],
      ['1,234.56', 1234.56],
      ['1.234,56', 1234.56],
      ['1,234,567.89', 1234567.89],
      ['1.234.567,89', 1234567.89],
      ['1.234.567', 1234567],
      ['1,234,567', 1234567],
      ['1 234,56', 1234.56],
      ['1\u00a0234,56', 1234.56],
      ['1\u202f234,56', 1234.56],
      ["1'234.56", 1234.56],
      ['1’234.56', 1234.56],
      ['1 234 567', 1234567],
      ['1.500,00', 1500],
      ['1,500.00', 1500],
      ['  42  ', 42],
      ['9999999999.99', MAX_AMOUNT],
    ];
    for (const [raw, expected] of cases) expect(value(raw), raw).toBe(expected);
  });

  test('rejects ambiguous or malformed input instead of guessing (2 decimals)', () => {
    const cases = [
      // a single separator with a three-digit tail could be grouping or decimals
      '1.234', '1,234', '1,500', '1.500',
      // misplaced dot/comma grouping
      '1,23,4', '1.2.3', '1.5.0', '12.345,6.7', '12,34.5', '1,234.', '1.234.5', '12.34.567', '1234,567.89',
      // misplaced space/apostrophe grouping, or grouping inside the fraction
      '12 50', '1 2 3', '10 12.50', '12,5 0', '12.5 00', "1'23.45", '1 234.567,89', "1 234'567",
      // too many decimals and other junk
      '1.23456', '-5', '.', ',', 'abc', '1e5', '1..5',
    ];
    for (const raw of cases) expect(value(raw), raw).toBe('format');
    expect(value(''), 'empty').toBe('empty');
    expect(value('   '), 'blank').toBe('empty');
  });

  test('treats every separator as grouping for currencies without decimals (JPY)', () => {
    const accepted: Array<[string, number]> = [
      ['1500', 1500],
      ['1,500', 1500],
      ['1.500', 1500],
      ['1,234,567', 1234567],
      ['1.234.567', 1234567],
      ['1 234 567', 1234567],
      ["1'234'567", 1234567],
      ['9,999,999,999', 9_999_999_999],
    ];
    for (const [raw, expected] of accepted) expect(value(raw, 0), raw).toBe(expected);
    for (const raw of ['12.5', '12,50', '1,234.56', '1.234,56', '1,23,4', '1.5.0', '12 50', '1,500.', '12,', '1,234.567']) {
      expect(value(raw, 0), raw).toBe('format');
    }
    expect(value('10,000,000,000', 0)).toBe('tooLarge');
  });

  test('enforces the database limit and the currency precision', () => {
    expect(value('10000000000')).toBe('tooLarge');
    expect(value('9.999.999.999,99')).toBe(MAX_AMOUNT);
    expect(value('9.999.999.999,991')).toBe('format');
    expect(value('1.234', 3)).toBe(1.234);
    expect(value('1,234.567', 3)).toBe(1234.567);
    expect(value('1.234.567', 3)).toBe(1234567);
    expect(value('12.34', 1)).toBe('format');
    expect(value('9999999999.9', 1)).toBe(9_999_999_999.9);
    expect(maxAmountForDigits(0)).toBe(9_999_999_999);
    expect(maxAmountForDigits(1)).toBe(9_999_999_999.9);
    expect(maxAmountForDigits(2)).toBe(MAX_AMOUNT);
    expect(maxAmountForDigits(3)).toBe(MAX_AMOUNT);
    expect(maxAmountForCurrency('JPY')).toBe(9_999_999_999);
    expect(maxAmountForCurrency('EUR')).toBe(MAX_AMOUNT);
    expect(currencyFractionDigits('EUR')).toBe(2);
    expect(currencyFractionDigits('JPY')).toBe(0);
    expect(currencyFractionDigits('not a currency')).toBe(2);
  });

  test('sanitizing drops letters and currency signs but keeps what the parser needs', () => {
    expect(sanitizeAmount('€ 1.234,56')).toBe('1.234,56');
    expect(sanitizeAmount('abc4.5x')).toBe('4.5');
    expect(sanitizeAmount('-5')).toBe('-5');
    expect(sanitizeAmount('CHF 1’234.50')).toBe('1’234.50');
  });
});

test.describe('stored amounts', () => {
  test('prefill text keeps the database precision, not the currency digits', () => {
    expect(storedAmount(96.6)).toEqual({ text: '96.6', value: 96.6 });
    expect(storedAmount(1500).text).toBe('1500');
    expect(storedAmount(12.5).text).toBe('12.5');
    expect(storedAmount(1234567.89).text).toBe('1234567.89');
  });

  test('untouched text keeps the stored number, edited text goes through the parser', () => {
    const legacyYen = storedAmount(96.6);
    expect(resolveAmount('96.6', 0, legacyYen)).toEqual({ ok: true, value: 96.6 });
    expect(resolveAmount(' 96.6 ', 0, legacyYen)).toEqual({ ok: true, value: 96.6 });
    expect(resolveAmount('97', 0, legacyYen)).toEqual({ ok: true, value: 97 });
    expect(resolveAmount('100.5', 0, legacyYen)).toEqual({ ok: false, reason: 'format' });
    expect(resolveAmount('', 0, legacyYen)).toEqual({ ok: false, reason: 'empty' });
    expect(resolveAmount('96.6', 0)).toEqual({ ok: false, reason: 'format' });

    const euro = storedAmount(12.5);
    expect(resolveAmount('12.5', 2, euro)).toEqual({ ok: true, value: 12.5 });
    expect(resolveAmount('12,5', 2, euro)).toEqual({ ok: true, value: 12.5 });
    expect(resolveAmount('12.345', 2, euro)).toEqual({ ok: false, reason: 'format' });
  });
});
