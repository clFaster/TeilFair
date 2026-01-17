import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faCheckCircle, faBalanceScale } from '@fortawesome/free-solid-svg-icons';
import { useGroupStore } from '../store/groupStore';

export function BalancesSummary() {
  const { t } = useTranslation();
  const { memberBalances, settlements, members, group } = useGroupStore();

  const getMemberName = (memberId: string) => {
    return members.find(m => m.id === memberId)?.name || t('common.unknown');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: group?.currency || 'EUR',
    }).format(amount);
  };

  const getBalanceClass = (balance: number) => {
    if (balance > 0.01) return 'balance-positive';
    if (balance < -0.01) return 'balance-negative';
    return 'balance-zero';
  };

  const getBalanceLabel = (balance: number) => {
    if (balance > 0.01) return t('balance.getsBack');
    if (balance < -0.01) return t('balance.owes');
    return t('balance.settled');
  };

  if (memberBalances.length === 0) {
    return (
      <div className="empty-state">
        <div style={{ 
          width: '64px', 
          height: '64px', 
          borderRadius: '50%', 
          background: 'var(--color-surface)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          margin: '0 auto 16px',
          fontSize: '24px',
          color: 'var(--color-text-muted)'
        }}>
          <FontAwesomeIcon icon={faBalanceScale} />
        </div>
        <p>{t('balance.emptyTitle')}</p>
        <p className="text-sm">{t('balance.emptyDescription')}</p>
      </div>
    );
  }

  const isAllSettled = memberBalances.every(b => Math.abs(b.netBalance) < 0.01);

  return (
    <div>
      {/* Individual Balances */}
      <h3 style={{ 
        fontFamily: 'var(--font-display)', 
        fontWeight: 600, 
        marginBottom: '12px',
        fontSize: 'var(--font-size-md)',
        letterSpacing: '-0.01em'
      }}>
        {t('balance.individualBalances')}
      </h3>
      
      <div style={{ marginBottom: '24px' }}>
        {memberBalances.map((balance) => (
          <div 
            key={balance.memberId} 
            style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '8px'
            }}
          >
            <div>
              <div style={{ fontWeight: 500 }}>{getMemberName(balance.memberId)}</div>
              <div className="text-sm text-muted">{getBalanceLabel(balance.netBalance)}</div>
            </div>
            <div 
              className={getBalanceClass(balance.netBalance)}
              style={{ 
                fontSize: 'var(--font-size-lg)', 
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                letterSpacing: '-0.02em'
              }}
            >
              {balance.netBalance > 0.01 && '+'}
              {formatCurrency(Math.abs(balance.netBalance))}
            </div>
          </div>
        ))}
      </div>

      {/* Settlements */}
      {settlements.length > 0 && (
        <>
          <h3 style={{ 
            fontFamily: 'var(--font-display)', 
            fontWeight: 600, 
            marginBottom: '8px',
            fontSize: 'var(--font-size-md)',
            letterSpacing: '-0.01em'
          }}>
            {t('balance.suggestedSettlements')}
          </h3>
          <p className="text-sm text-muted mb-3">
            {t('balance.settlementsDescription')}
          </p>
          {settlements.map((settlement, index) => (
            <div key={index} className="settlement-card">
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600 }}>{getMemberName(settlement.fromMemberId)}</span>
              </div>
              <div className="settlement-arrow">
                <FontAwesomeIcon icon={faArrowRight} />
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ fontWeight: 600 }}>{getMemberName(settlement.toMemberId)}</span>
              </div>
              <span className="settlement-amount">{formatCurrency(settlement.amount)}</span>
            </div>
          ))}
        </>
      )}

      {/* All Settled State */}
      {isAllSettled && settlements.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '32px 16px',
          background: 'var(--clr-success-a20)',
          borderRadius: 'var(--radius-xl)',
          border: '2px solid var(--color-success)'
        }}>
          <FontAwesomeIcon 
            icon={faCheckCircle} 
            style={{ 
              fontSize: '48px', 
              color: 'var(--color-success)',
              marginBottom: '12px'
            }} 
          />
          <p style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)', color: 'var(--color-success)' }}>
            {t('balance.allSettledUp')}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-success)', opacity: 0.9 }}>
            {t('balance.noPaymentsNeeded')}
          </p>
        </div>
      )}
    </div>
  );
}
