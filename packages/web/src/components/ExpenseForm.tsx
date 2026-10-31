import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck, faCircleExclamation, faSpinner } from '@fortawesome/free-solid-svg-icons';
import type { CreateExpenseInput, Expense, Member, ShareType } from '@teilfair/shared';
import { useGroupStore } from '../store/groupStore';
import {
  currencyFractionDigits,
  maxAmountForCurrency,
  resolveAmount,
  sanitizeAmount,
  storedAmount,
  type StoredAmount,
} from '../lib/amount';
import { Avatar } from './Avatar';

type AmountMap = Record<string, string>;
/** Amounts as loaded from the database, by member id. */
type StoredMap = Record<string, StoredAmount>;
interface FormError {
  key: string;
  values?: Record<string, string>;
  /** Field the error belongs to: 'total' or a member id. */
  field?: string;
}

interface ExpenseFormProps {
  /** Pre-fills the form (edit mode). */
  expense?: Expense;
  submitLabel: string;
  submittingLabel: string;
  submitIcon?: ReactNode;
  /** i18n key shown when `onSubmit` throws. */
  failureKey: string;
  onSubmit: (input: CreateExpenseInput) => Promise<void>;
  onCancel?: () => void;
}

const pad = (n: number) => String(n).padStart(2, '0');
const toDateValue = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeValue = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Value of a field: the stored number while its prefilled text is unchanged, else the parsed input (NaN if invalid). */
const valueOf = (raw: string | undefined, digits: number, stored?: StoredAmount) => {
  const result = resolveAmount(raw, digits, stored);
  return result.ok ? result.value : Number.NaN;
};

const sumAmounts = (map: AmountMap, stored: StoredMap, digits: number) =>
  Object.entries(map).reduce((sum, [memberId, amount]) => sum + (valueOf(amount, digits, stored[memberId]) || 0), 0);

const positiveEntries = (map: AmountMap, stored: StoredMap, digits: number) =>
  Object.entries(map)
    .map(([memberId, amount]) => ({ memberId, amount: valueOf(amount, digits, stored[memberId]) }))
    .filter((entry) => entry.amount > 0);

const storedMapFrom = (entries: ReadonlyArray<{ memberId: string; amount: number }>): StoredMap =>
  Object.fromEntries(entries.map((entry) => [entry.memberId, storedAmount(entry.amount)]));

/** Prefill texts (database precision, never rounded to the currency's minor unit). */
const textMapFrom = (stored: StoredMap): AmountMap =>
  Object.fromEntries(Object.entries(stored).map(([memberId, amount]) => [memberId, amount.text]));

/** One cent, plus float noise (0.1 + 0.2 style sums). */
const TOLERANCE = 0.01 + 1e-9;

/**
 * Shared add/edit expense form: big amount field, payer and split sections
 * with a live remaining indicator, native checkboxes and localized errors.
 */
export function ExpenseForm({
  expense,
  submitLabel,
  submittingLabel,
  submitIcon,
  failureKey,
  onSubmit,
  onCancel,
}: Readonly<ExpenseFormProps>) {
  const { t } = useTranslation();
  const { members, group } = useGroupStore();
  const uid = useId();
  const amountRef = useRef<HTMLInputElement>(null);
  const currency = group?.currency || 'EUR';
  const digits = currencyFractionDigits(currency);

  const [description, setDescription] = useState(expense?.description ?? '');
  const [storedTotal] = useState(() => (expense ? storedAmount(expense.totalAmount) : undefined));
  const [totalAmount, setTotalAmount] = useState(storedTotal?.text ?? '');
  const [date, setDate] = useState(() => toDateValue(expense ? new Date(expense.date) : new Date()));
  const [time, setTime] = useState(() => toTimeValue(expense ? new Date(expense.date) : new Date()));

  const initialPayers = expense?.payers ?? [];
  const [singlePayer, setSinglePayer] = useState(
    initialPayers.length === 1 ? initialPayers[0].memberId : (initialPayers.length === 0 ? members[0]?.id ?? '' : '')
  );
  const [multiPayer, setMultiPayer] = useState(initialPayers.length > 1);
  const [storedPayers] = useState<StoredMap>(() => storedMapFrom(initialPayers));
  const [payerAmounts, setPayerAmounts] = useState<AmountMap>(() =>
    initialPayers.length > 1 ? textMapFrom(storedPayers) : {}
  );

  const initialSplits = expense?.splits ?? [];
  const startsCustom = initialSplits.some((split) => split.shareType === 'fixed');
  const [customSplit, setCustomSplit] = useState(startsCustom);
  const [included, setIncluded] = useState<Set<string>>(
    () => new Set(initialSplits.length > 0 ? initialSplits.map((split) => split.memberId) : members.map((m) => m.id))
  );
  const [storedSplits] = useState<StoredMap>(() =>
    storedMapFrom(
      initialSplits
        .filter((split) => split.shareType === 'fixed')
        .map((split) => ({ memberId: split.memberId, amount: split.share }))
    )
  );
  const [splitAmounts, setSplitAmounts] = useState<AmountMap>(() => (startsCustom ? textMapFrom(storedSplits) : {}));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FormError | null>(null);

  const total = valueOf(totalAmount, digits, storedTotal);
  const validTotal = total > 0 ? total : 0;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);

  /** Shows an error; numbers are formatted as money, strings are shown as typed. */
  const fail = (key: string, values?: Record<string, number | string>, field?: string) => {
    const formatted = values
      ? Object.fromEntries(
          Object.entries(values).map(([name, value]) => [name, typeof value === 'number' ? formatCurrency(value) : value])
        )
      : undefined;
    setError({ key: `expense.errors.${key}`, values: formatted, field });
  };

  /** Reports the first unreadable or too large amount; untouched prefilled fields always pass. */
  const failOnInvalid = (entries: Array<[field: string, raw: string]>, stored: StoredMap) => {
    for (const [field, raw] of entries) {
      const result = resolveAmount(raw, digits, stored[field]);
      if (result.ok || result.reason === 'empty') continue;
      if (result.reason === 'tooLarge') fail('amountTooLarge', { max: maxAmountForCurrency(currency) }, field);
      else if (digits === 0) fail('amountFormatWhole', { value: raw.trim(), currency }, field);
      else fail('amountFormat', { value: raw.trim() }, field);
      if (field === 'total') amountRef.current?.focus();
      return true;
    }
    return false;
  };

  const toggleIncluded = (memberId: string) => {
    setIncluded((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  const setAmountIn = (setter: typeof setPayerAmounts) => (memberId: string, value: string) =>
    setter((prev) => ({ ...prev, [memberId]: sanitizeAmount(value) }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (failOnInvalid([['total', totalAmount]], storedTotal ? { total: storedTotal } : {})) return;
    if (!(total > 0)) {
      fail('validAmount', undefined, 'total');
      amountRef.current?.focus();
      return;
    }

    let payers: CreateExpenseInput['payers'];
    if (multiPayer) {
      if (failOnInvalid(Object.entries(payerAmounts), storedPayers)) return;
      payers = positiveEntries(payerAmounts, storedPayers, digits);
      if (payers.length === 0) return fail('enterPayments');
      const paid = payers.reduce((sum, payer) => sum + payer.amount, 0);
      if (Math.abs(paid - total) > TOLERANCE) return fail('paidMismatch', { paid, total });
    } else {
      if (!singlePayer) return fail('selectPayer');
      payers = [{ memberId: singlePayer, amount: total }];
    }

    let splits: Array<{ memberId: string; share: number; shareType: ShareType }>;
    if (customSplit) {
      if (failOnInvalid(Object.entries(splitAmounts), storedSplits)) return;
      const entries = positiveEntries(splitAmounts, storedSplits, digits);
      if (entries.length === 0) return fail('enterSplits');
      const split = entries.reduce((sum, entry) => sum + entry.amount, 0);
      if (Math.abs(split - total) > TOLERANCE) return fail('splitMismatch', { split, total });
      splits = entries.map((entry) => ({ memberId: entry.memberId, share: entry.amount, shareType: 'fixed' }));
    } else {
      const ids = members.filter((member) => included.has(member.id)).map((member) => member.id);
      if (ids.length === 0) return fail('selectSplit');
      splits = ids.map((memberId) => ({ memberId, share: 1, shareType: 'ratio' }));
    }

    setLoading(true);
    try {
      await onSubmit({
        description: description.trim() || t('expense.defaultDescription'),
        totalAmount: total,
        date: new Date(`${date}T${time || '12:00'}`),
        payers,
        splits,
      });
    } catch {
      setError({ key: failureKey });
    } finally {
      setLoading(false);
    }
  };

  const includedCount = members.filter((member) => included.has(member.id)).length;
  const splitCount = customSplit ? positiveEntries(splitAmounts, storedSplits, digits).length : includedCount;
  const equalShare = includedCount > 0 ? validTotal / includedCount : 0;

  const ids = {
    description: `${uid}-description`,
    amount: `${uid}-amount`,
    date: `${uid}-date`,
    time: `${uid}-time`,
    payer: `${uid}-payer`,
    payerTitle: `${uid}-payer-title`,
    splitTitle: `${uid}-split-title`,
  };

  return (
    <form onSubmit={handleSubmit} className="expense-form" noValidate>
      <div className="expense-form-body">
        <div className="amount-hero">
          <label htmlFor={ids.amount}>{t('expense.amountLabel', { currency })}</label>
          <div className="amount-hero-field">
            <input
              ref={amountRef}
              id={ids.amount}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              enterKeyHint="next"
              className="amount-hero-input"
              data-testid="expense-amount-input"
              placeholder={digits === 0 ? '0' : t('expense.amountPlaceholder')}
              value={totalAmount}
              onChange={(e) => setTotalAmount(sanitizeAmount(e.target.value))}
              aria-invalid={error?.field === 'total' || undefined}
            />
            <span className="amount-hero-unit" aria-hidden="true">{currency}</span>
          </div>
        </div>

        <div className="input-group">
          <label htmlFor={ids.description}>{t('expense.descriptionLabel')}</label>
          <input
            id={ids.description}
            type="text"
            className="input"
            data-testid="expense-description-input"
            placeholder={t('expense.descriptionPlaceholder')}
            enterKeyHint="next"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="input-row">
          <div className="input-group">
            <label htmlFor={ids.date}>{t('expense.dateLabel')}</label>
            <input id={ids.date} type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="input-group">
            <label htmlFor={ids.time}>{t('expense.timeLabel')}</label>
            <input id={ids.time} type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        {members.length > 0 && (
          <section className="form-section" role="group" aria-labelledby={ids.payerTitle}>
            <div className="form-section-head">
              <h3 id={ids.payerTitle} className="form-section-title">{t('expense.whoPaidLabel')}</h3>
              <Segmented
                label={t('expense.whoPaidLabel')}
                value={multiPayer}
                off={t('expense.singlePayer')}
                on={t('expense.multiplePayers')}
                onChange={(multi) => {
                  setMultiPayer(multi);
                  if (!multi) setPayerAmounts({});
                }}
              />
            </div>

            {multiPayer ? (
              <>
                <AmountRows
                  members={members}
                  values={payerAmounts}
                  currency={currency}
                  labelKey="expense.paidAmountFor"
                  invalidId={error?.field}
                  onChange={setAmountIn(setPayerAmounts)}
                />
                <AmountMeter
                  entered={sumAmounts(payerAmounts, storedPayers, digits)}
                  total={validTotal}
                  format={formatCurrency}
                />
              </>
            ) : (
              <select
                id={ids.payer}
                className="select"
                aria-labelledby={ids.payerTitle}
                value={singlePayer}
                onChange={(e) => setSinglePayer(e.target.value)}
              >
                <option value="">{t('expense.selectPayer')}</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            )}
          </section>
        )}

        {members.length > 0 && (
          <section className="form-section" role="group" aria-labelledby={ids.splitTitle}>
            <div className="form-section-head">
              <h3 id={ids.splitTitle} className="form-section-title">
                {t('expense.splitBetweenLabel')}
                <span className="count-badge">{splitCount}</span>
              </h3>
              <Segmented
                label={t('expense.splitBetweenLabel')}
                value={customSplit}
                off={t('expense.equalSplit')}
                on={t('expense.customSplitAmounts')}
                onChange={(custom) => {
                  setCustomSplit(custom);
                  if (!custom) setSplitAmounts({});
                }}
              />
            </div>

            {customSplit ? (
              <>
                <AmountRows
                  members={members}
                  values={splitAmounts}
                  currency={currency}
                  labelKey="expense.shareAmountFor"
                  invalidId={error?.field}
                  onChange={setAmountIn(setSplitAmounts)}
                />
                <AmountMeter
                  entered={sumAmounts(splitAmounts, storedSplits, digits)}
                  total={validTotal}
                  format={formatCurrency}
                />
              </>
            ) : (
              <ul className="split-options">
                {members.map((member, index) => {
                  const checked = included.has(member.id);
                  return (
                    <li key={member.id}>
                      <label className="split-option" data-testid="split-member-option">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleIncluded(member.id)}
                        />
                        <Avatar name={member.name} tone={index} size="sm" />
                        <span className="split-option-name">{member.name}</span>
                        {checked && validTotal > 0 && (
                          <span className="split-option-amount">{formatCurrency(equalShare)}</span>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {error && (
          <div className="form-error" role="alert" data-testid="expense-form-error">
            <FontAwesomeIcon icon={faCircleExclamation} aria-hidden="true" />
            <span>{t(error.key, error.values)}</span>
          </div>
        )}
      </div>

      <div className="expense-form-footer">
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {t('common.cancel')}
          </button>
        )}
        <button
          type="submit"
          className="btn btn-primary"
          data-testid="expense-submit-button"
          disabled={loading || members.length < 1}
        >
          {loading ? <FontAwesomeIcon icon={faSpinner} spin aria-hidden="true" /> : submitIcon}
          <span>{loading ? submittingLabel : submitLabel}</span>
        </button>
      </div>
    </form>
  );
}

interface SegmentedProps {
  label: string;
  value: boolean;
  off: string;
  on: string;
  onChange: (value: boolean) => void;
}

/** Two-option toggle; each option is a pressed/unpressed button. */
function Segmented({ label, value, off, on, onChange }: Readonly<SegmentedProps>) {
  return (
    <div className="segmented-control" role="group" aria-label={label}>
      {[false, true].map((option) => (
        <button
          key={String(option)}
          type="button"
          className={`segmented-button${value === option ? ' active' : ''}`}
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        >
          {option ? on : off}
        </button>
      ))}
    </div>
  );
}

interface AmountRowsProps {
  members: Member[];
  values: AmountMap;
  currency: string;
  labelKey: string;
  /** Member whose field holds the current error. */
  invalidId?: string;
  onChange: (memberId: string, value: string) => void;
}

/** One fluid row per member: avatar, name and a decimal-keypad amount field. */
function AmountRows({ members, values, currency, labelKey, invalidId, onChange }: Readonly<AmountRowsProps>) {
  const { t } = useTranslation();
  const uid = useId();
  return (
    <ul className="amount-rows">
      {members.map((member, index) => {
        const id = `${uid}-${member.id}`;
        return (
          <li key={member.id} className="amount-row">
            <Avatar name={member.name} tone={index} size="sm" />
            <label htmlFor={id} className="amount-row-name">{member.name}</label>
            <div className="amount-field">
              <input
                id={id}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                className="input"
                aria-label={t(labelKey, { name: member.name })}
                placeholder={currencyFractionDigits(currency) === 0 ? '0' : t('expense.amountPlaceholder')}
                value={values[member.id] ?? ''}
                aria-invalid={invalidId === member.id || undefined}
                onChange={(e) => onChange(member.id, e.target.value)}
              />
              <span className="amount-field-unit" aria-hidden="true">{currency}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

interface AmountMeterProps {
  entered: number;
  total: number;
  format: (amount: number) => string;
}

/** Live "x left / x too much / adds up" indicator with a progress bar. */
function AmountMeter({ entered, total, format }: Readonly<AmountMeterProps>) {
  const { t } = useTranslation();
  const diff = total - entered;
  const state = Math.abs(diff) <= TOLERANCE && total > 0 ? 'ok' : diff < 0 ? 'over' : 'left';
  const percent = total > 0 ? Math.min(100, (entered / total) * 100) : 0;
  const label =
    state === 'ok'
      ? t('expense.balanced')
      : t(state === 'over' ? 'expense.overBy' : 'expense.remaining', { amount: format(Math.abs(diff)) });

  return (
    <div className={`amount-meter is-${state}`} data-testid="amount-meter">
      <svg className="amount-meter-bar" aria-hidden="true" focusable="false">
        <rect className="amount-meter-track" width="100%" height="100%" rx="2" />
        <rect className="amount-meter-fill" width={`${percent}%`} height="100%" rx="2" />
      </svg>
      <p className="amount-meter-text" aria-live="polite">
        {state === 'ok' && <FontAwesomeIcon icon={faCircleCheck} aria-hidden="true" />}
        <span>{label}</span>
        <span className="amount-meter-sum">
          {format(entered)} / {format(total)}
        </span>
      </p>
    </div>
  );
}
