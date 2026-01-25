import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus, faChevronDown, faChevronUp, faCheck, faPlus, faSpinner } from '@fortawesome/free-solid-svg-icons';
import type { ShareType } from '@teilfair/shared';
import { useGroupStore } from '../store/groupStore';

interface AddExpenseFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  showHeader?: boolean;
  showCancelButton?: boolean;
}

export function AddExpenseForm({ 
  onSuccess, 
  onCancel,
  showHeader = false,
  showCancelButton = true,
}: AddExpenseFormProps) {
  const { t } = useTranslation();
  const { members, group, addExpense, addMember } = useGroupStore();
  
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [date, setDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [time, setTime] = useState(() => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  });
  
  // Payer state
  const [singlePayer, setSinglePayer] = useState<string>('');
  const [showMultiplePayers, setShowMultiplePayers] = useState(false);
  const [multiplePayers, setMultiplePayers] = useState<Record<string, string>>({});
  
  // Split state
  const [showCustomSplit, setShowCustomSplit] = useState(false);
  const [includedMembers, setIncludedMembers] = useState<Set<string>>(new Set());
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  
  // New member creation
  const [newMemberName, setNewMemberName] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize with all existing members selected for split
  useEffect(() => {
    if (members.length > 0) {
      setIncludedMembers(new Set(members.map(m => m.id)));
      if (!singlePayer) {
        setSinglePayer(members[0].id);
      }
    }
  }, [members]);

  const resetForm = () => {
    setDescription('');
    setTotalAmount('');
    const now = new Date();
    setDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
    setTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    setSinglePayer(members.length > 0 ? members[0].id : '');
    setShowMultiplePayers(false);
    setMultiplePayers({});
    setShowCustomSplit(false);
    setIncludedMembers(new Set(members.map(m => m.id)));
    setCustomSplits({});
    setError('');
  };

  const handleAddNewMember = async () => {
    if (!newMemberName.trim()) return;
    
    setIsAddingMember(true);
    try {
      const newMember = await addMember(newMemberName.trim());
      setNewMemberName('');
      setIncludedMembers(prev => new Set([...prev, newMember.id]));
      if (!singlePayer) {
        setSinglePayer(newMember.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handlePayerChange = (memberId: string, amount: string) => {
    setMultiplePayers(prev => {
      if (amount === '' || amount === '0') {
        const { [memberId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [memberId]: amount };
    });
  };

  const toggleMemberInSplit = (memberId: string) => {
    setIncludedMembers(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        if (next.size > 1) {
          next.delete(memberId);
        }
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const handleCustomSplitChange = (memberId: string, amount: string) => {
    setCustomSplits(prev => ({ ...prev, [memberId]: amount }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const amount = parseFloat(totalAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    if (includedMembers.size < 1) {
      setError('Please select at least one person to split with');
      return;
    }
    
    let payerEntries: Array<{ memberId: string; amount: number }>;
    
    if (showMultiplePayers) {
      payerEntries = Object.entries(multiplePayers)
        .map(([memberId, amt]) => ({ memberId, amount: parseFloat(amt) }))
        .filter(p => !isNaN(p.amount) && p.amount > 0);
      
      if (payerEntries.length === 0) {
        setError('Please enter payment amounts');
        return;
      }
      
      const totalPaid = payerEntries.reduce((sum, p) => sum + p.amount, 0);
      if (Math.abs(totalPaid - amount) > 0.01) {
        setError(`Paid amounts (${totalPaid.toFixed(2)}) don't match total (${amount.toFixed(2)})`);
        return;
      }
    } else {
      if (!singlePayer) {
        setError('Please select who paid');
        return;
      }
      payerEntries = [{ memberId: singlePayer, amount }];
    }
    
    let splits: Array<{ memberId: string; share: number; shareType: ShareType }>;
    
    if (showCustomSplit) {
      const customEntries = Object.entries(customSplits)
        .map(([memberId, amt]) => ({ memberId, amount: parseFloat(amt) }))
        .filter(s => !isNaN(s.amount) && s.amount > 0);
      
      if (customEntries.length < 1) {
        setError('Please enter split amounts for at least one person');
        return;
      }
      
      const totalSplit = customEntries.reduce((sum, s) => sum + s.amount, 0);
      if (Math.abs(totalSplit - amount) > 0.01) {
        setError(`Split amounts (${totalSplit.toFixed(2)}) don't match total (${amount.toFixed(2)})`);
        return;
      }
      
      splits = customEntries.map(s => ({
        memberId: s.memberId,
        share: s.amount,
        shareType: 'fixed' as ShareType,
      }));
    } else {
      splits = Array.from(includedMembers).map(memberId => ({
        memberId,
        share: 1,
        shareType: 'ratio' as ShareType,
      }));
    }
    
    setLoading(true);
    try {
      await addExpense({
        description: description.trim() || t('expense.defaultDescription'),
        totalAmount: amount,
        date: new Date(`${date}T${time}`),
        payers: payerEntries,
        splits,
      });
      resetForm();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: group?.currency || 'EUR',
    }).format(amount);
  };

  const totalPaidMultiple = Object.values(multiplePayers).reduce(
    (sum, amt) => sum + (parseFloat(amt) || 0),
    0
  );

  const totalCustomSplit = Object.values(customSplits).reduce(
    (sum, amt) => sum + (parseFloat(amt) || 0),
    0
  );

  const splitAmount = includedMembers.size > 0 && totalAmount 
    ? parseFloat(totalAmount) / includedMembers.size 
    : 0;

  return (
    <form onSubmit={handleSubmit} className="expense-form">
      {showHeader && (
        <div className="expense-form-header">
          <h2>{t('expense.addExpense')}</h2>
          {onCancel && (
            <button type="button" className="btn btn-icon btn-ghost expense-dialog-close" onClick={onCancel}>
              &times;
            </button>
          )}
        </div>
      )}
      
      <div className="expense-form-body">
        {/* Description */}
        <div className="input-group">
          <label htmlFor="description">{t('expense.descriptionLabel')}</label>
          <input
            id="description"
            type="text"
            className="input action-input"
            placeholder={t('expense.descriptionPlaceholder')}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>
        
        {/* Amount */}
        <div className="input-group">
          <label htmlFor="amount">{t('expense.amountLabel', { currency: group?.currency })}</label>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            className="input action-input"
            placeholder={t('expense.amountPlaceholder')}
            value={totalAmount}
            onChange={e => setTotalAmount(e.target.value)}
            required
            style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600 }}
          />
        </div>
        
        {/* Date & Time */}
        <div className="input-row">
          <div className="input-group" style={{ flex: 2 }}>
            <label htmlFor="date">{t('expense.dateLabel')}</label>
            <input
              id="date"
              type="date"
              className="input action-input"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div className="input-group" style={{ flex: 1 }}>
            <label htmlFor="time">{t('expense.timeLabel')}</label>
            <input
              id="time"
              type="time"
              className="input action-input"
              value={time}
              onChange={e => setTime(e.target.value)}
            />
          </div>
        </div>

        {/* Quick Add Member */}
        {members.length === 0 && (
          <div className="input-group">
            <label>{t('member.addMembersFirst')}</label>
            <p className="text-secondary text-sm mb-2">
              {t('member.addMembersFirstDescription')}
            </p>
            <div className="input-row">
                <input
                  type="text"
                  className="input action-input"
                  placeholder={t('member.memberNamePlaceholder')}
                value={newMemberName}
                onChange={e => setNewMemberName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddNewMember();
                  }
                }}
              />
              <button
                type="button"
                  className="btn btn-secondary action-button"
                  onClick={handleAddNewMember}
                  disabled={isAddingMember || !newMemberName.trim()}
                >
                <FontAwesomeIcon icon={isAddingMember ? faSpinner : faUserPlus} spin={isAddingMember} />
              </button>
            </div>
          </div>
        )}
        
        {/* Payer Section */}
        {members.length > 0 && (
          <div className="input-group">
            <label>{t('expense.whoPaidLabel')}</label>
            
            {!showMultiplePayers ? (
              <>
                <select
                  className="select mb-2 action-input"
                  value={singlePayer}
                  onChange={e => setSinglePayer(e.target.value)}
                >
                  <option value="">{t('expense.selectPayer')}</option>
                  {members.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="advanced-toggle"
                  onClick={() => setShowMultiplePayers(true)}
                >
                  <FontAwesomeIcon icon={faChevronDown} className="advanced-toggle-icon" />
                  <span>{t('expense.multiplePayers')}</span>
                </button>
              </>
            ) : (
              <div className="advanced-content">
                <div style={{ 
                  padding: '12px 16px', 
                  background: 'var(--color-surface)', 
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '12px'
                }}>
                  <div className="text-sm">
                    <span className="text-muted">{t('expense.totalEntered')} </span>
                    <span className={totalPaidMultiple === parseFloat(totalAmount) ? 'text-success' : 'text-warning'} style={{ fontWeight: 600 }}>
                      {formatCurrency(totalPaidMultiple)}
                    </span>
                    <span className="text-muted"> / {formatCurrency(parseFloat(totalAmount) || 0)}</span>
                  </div>
                </div>
                {members.map(member => (
                  <div key={member.id} className="flex gap-3 items-center mb-2">
                    <span style={{ minWidth: '100px', fontWeight: 500 }}>{member.name}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                    className="input action-input"
                      placeholder={t('expense.amountPlaceholder')}
                      value={multiplePayers[member.id] || ''}
                      onChange={e => handlePayerChange(member.id, e.target.value)}
                      style={{ width: '120px' }}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  className="advanced-toggle mt-2"
                  onClick={() => {
                    setShowMultiplePayers(false);
                    setMultiplePayers({});
                  }}
                >
                  <FontAwesomeIcon icon={faChevronUp} className="advanced-toggle-icon" />
                  <span>{t('expense.singlePayer')}</span>
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Split Section */}
        {members.length > 0 && (
          <div className="input-group">
            <label>
              {t('expense.splitBetweenLabel')} 
              <span style={{ 
                marginLeft: '8px', 
                padding: '2px 8px', 
                background: 'var(--color-primary)', 
                color: 'white', 
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 600
              }}>
                {includedMembers.size}
              </span>
            </label>
            
            {!showCustomSplit ? (
              <>
                <div style={{ marginBottom: '12px' }}>
                  {members.map(member => (
                    <div 
                      key={member.id} 
                      className={`member-select-item ${includedMembers.has(member.id) ? 'selected' : ''}`}
                      onClick={() => toggleMemberInSplit(member.id)}
                      style={{ marginBottom: '8px' }}
                    >
                      <div className={`checkbox ${includedMembers.has(member.id) ? 'checked' : ''}`}>
                        {includedMembers.has(member.id) && (
                          <FontAwesomeIcon icon={faCheck} style={{ color: 'white', fontSize: '10px' }} />
                        )}
                      </div>
                      <span className="name">{member.name}</span>
                      {includedMembers.has(member.id) && totalAmount && (
                        <span className="amount">{formatCurrency(splitAmount)}</span>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="advanced-toggle"
                  onClick={() => setShowCustomSplit(true)}
                >
                  <FontAwesomeIcon icon={faChevronDown} className="advanced-toggle-icon" />
                  <span>{t('expense.customSplitAmounts')}</span>
                </button>
              </>
            ) : (
              <div className="advanced-content">
                <div style={{ 
                  padding: '12px 16px', 
                  background: 'var(--color-surface)', 
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '12px'
                }}>
                  <div className="text-sm">
                    <span className="text-muted">{t('expense.totalEntered')} </span>
                    <span className={totalCustomSplit === parseFloat(totalAmount) ? 'text-success' : 'text-warning'} style={{ fontWeight: 600 }}>
                      {formatCurrency(totalCustomSplit)}
                    </span>
                    <span className="text-muted"> / {formatCurrency(parseFloat(totalAmount) || 0)}</span>
                  </div>
                </div>
                {members.map(member => (
                  <div key={member.id} className="flex gap-3 items-center mb-2">
                    <span style={{ minWidth: '100px', fontWeight: 500 }}>{member.name}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                    className="input action-input"
                      placeholder={t('expense.amountPlaceholder')}
                      value={customSplits[member.id] || ''}
                      onChange={e => handleCustomSplitChange(member.id, e.target.value)}
                      style={{ width: '120px' }}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  className="advanced-toggle mt-2"
                  onClick={() => {
                    setShowCustomSplit(false);
                    setCustomSplits({});
                  }}
                >
                  <FontAwesomeIcon icon={faChevronUp} className="advanced-toggle-icon" />
                  <span>{t('expense.equalSplit')}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Quick Add Member (when there are already members) */}
        {members.length > 0 && (
          <div className="input-group">
            <label>{t('member.addMemberLabel')}</label>
            <div className="input-row">
              <input
                type="text"
                className="input action-input"
                placeholder={t('member.newMemberPlaceholder')}
                value={newMemberName}
                onChange={e => setNewMemberName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddNewMember();
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-secondary action-button"
                onClick={handleAddNewMember}
                disabled={isAddingMember || !newMemberName.trim()}
                style={{ flexShrink: 0 }}
              >
                <FontAwesomeIcon icon={isAddingMember ? faSpinner : faUserPlus} spin={isAddingMember} />
              </button>
            </div>
          </div>
        )}
        
        {error && (
          <div style={{ 
            padding: '12px 16px', 
            background: 'var(--clr-danger-a20)', 
            borderRadius: 'var(--radius-md)',
            marginTop: '8px'
          }}>
            <p className="text-danger text-sm">{error}</p>
          </div>
        )}
      </div>
      
      <div className="expense-form-footer">
        {showCancelButton && onCancel && (
          <button type="button" className="btn btn-secondary action-button-sm" onClick={onCancel}>
            {t('common.cancel')}
          </button>
        )}
        <button 
          type="submit" 
          className="btn btn-primary action-button-sm" 
          disabled={loading || members.length < 1}
          style={!showCancelButton ? { width: '100%' } : undefined}
        >
          {loading ? (
            <>
              <FontAwesomeIcon icon={faSpinner} spin />
              <span>{t('expense.adding')}</span>
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faPlus} />
              <span>{t('expense.addExpense')}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
