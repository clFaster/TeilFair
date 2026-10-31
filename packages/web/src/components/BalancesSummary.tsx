import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faCheck, faScaleBalanced } from '@fortawesome/free-solid-svg-icons';
import { useGroupStore } from '../store/groupStore';
import { Avatar } from './Avatar';
import { EmptyState } from './EmptyState';
import { memberTone } from './avatarTone';

type BalanceState = 'positive' | 'negative' | 'zero';

const EPSILON = 0.01;

const balanceState = (balance: number): BalanceState => {
  if (balance > EPSILON) return 'positive';
  if (balance < -EPSILON) return 'negative';
  return 'zero';
};

interface BalanceBarProps {
  state: BalanceState;
  /** Share of the largest absolute balance, 0..1. */
  ratio: number;
}

/**
 * Diverging bar around a zero axis: credit grows right, debt grows left.
 * SVG percentage attributes keep it free of inline styles.
 */
function BalanceBar({ state, ratio }: Readonly<BalanceBarProps>) {
  // Half the track per side; keep tiny balances visible.
  const width = state === 'zero' ? 0 : Math.max(2, ratio * 50);
  const x = state === 'negative' ? 50 - width : 50;

  return (
    <svg className="balance-bar" aria-hidden="true" focusable="false">
      <rect className="balance-bar-track" width="100%" height="100%" rx="3" />
      {width > 0 && (
        <rect className="balance-bar-fill" x={`${x}%`} width={`${width}%`} height="100%" rx="3" />
      )}
      <line className="balance-bar-axis" x1="50%" x2="50%" y1="0" y2="100%" />
    </svg>
  );
}

export function BalancesSummary() {
  const { t } = useTranslation();
  const { memberBalances, settlements, members, group } = useGroupStore();
  const balancesTitleId = useId();
  const settlementsTitleId = useId();

  const getMemberName = (memberId: string) => {
    return members.find(m => m.id === memberId)?.name || t('common.unknown');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: group?.currency || 'EUR',
    }).format(amount);
  };

  const stateLabel: Record<BalanceState, string> = {
    positive: t('balance.getsBack'),
    negative: t('balance.owes'),
    zero: t('balance.settled'),
  };

  if (memberBalances.length === 0) {
    return (
      <EmptyState
        icon={faScaleBalanced}
        tone="muted"
        titleAs="h3"
        title={t('balance.emptyTitle')}
        description={t('balance.emptyDescription')}
      />
    );
  }

  const isAllSettled = settlements.length === 0
    && memberBalances.every(b => Math.abs(b.netBalance) < EPSILON);
  // Creditors first, biggest debts last: reads top-down like a ledger.
  const sortedBalances = [...memberBalances].sort((a, b) => b.netBalance - a.netBalance);
  const maxAbs = Math.max(...sortedBalances.map(b => Math.abs(b.netBalance)));

  return (
    <div className="balances">
      {isAllSettled && (
        <div className="balances-settled" role="status">
          <span className="balances-settled-icon" aria-hidden="true">
            <FontAwesomeIcon icon={faCheck} />
          </span>
          <p className="balances-settled-title">{t('balance.allSettledUp')}</p>
          <p className="balances-settled-text">{t('balance.noPaymentsNeeded')}</p>
        </div>
      )}

      <section className="balances-section" aria-labelledby={balancesTitleId}>
        <h3 id={balancesTitleId} className="balances-heading">{t('balance.individualBalances')}</h3>

        <ul className="balance-list">
          {sortedBalances.map((balance) => {
            const state = balanceState(balance.netBalance);
            const name = getMemberName(balance.memberId);

            return (
              <li key={balance.memberId} className={`balance-row is-${state}`}>
                <Avatar name={name} tone={memberTone(members, balance.memberId)} size="sm" />
                <span className="balance-row-main">
                  <span className="balance-name">{name}</span>
                  <span className="balance-label">{stateLabel[state]}</span>
                </span>
                <span className={`balance-amount balance-${state}`}>
                  {state === 'positive' && '+'}
                  {formatCurrency(Math.abs(balance.netBalance))}
                </span>
                <BalanceBar state={state} ratio={maxAbs > 0 ? Math.abs(balance.netBalance) / maxAbs : 0} />
              </li>
            );
          })}
        </ul>
      </section>

      {settlements.length > 0 && (
        <section className="balances-section" aria-labelledby={settlementsTitleId}>
          <h3 id={settlementsTitleId} className="balances-heading">{t('balance.suggestedSettlements')}</h3>
          <p className="balances-hint">{t('balance.settlementsDescription')}</p>

          <ol className="settlement-list">
            {settlements.map((settlement) => {
              const from = getMemberName(settlement.fromMemberId);
              const to = getMemberName(settlement.toMemberId);

              return (
                <li key={`${settlement.fromMemberId}-${settlement.toMemberId}`} className="settlement-card">
                  <span className="settlement-parties">
                    <span className="settlement-party">
                      <Avatar name={from} tone={memberTone(members, settlement.fromMemberId)} size="sm" />
                      <span className="settlement-name">{from}</span>
                    </span>
                    <span className="settlement-arrow">
                      <FontAwesomeIcon icon={faArrowRight} aria-hidden="true" />
                      <span className="sr-only">{` ${t('balance.pays')} `}</span>
                    </span>
                    <span className="settlement-party">
                      <Avatar name={to} tone={memberTone(members, settlement.toMemberId)} size="sm" />
                      <span className="settlement-name">{to}</span>
                    </span>
                  </span>
                  <span className="settlement-amount">{formatCurrency(settlement.amount)}</span>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
