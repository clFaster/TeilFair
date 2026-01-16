import { useState, useEffect } from 'react';
import type { ShareType, Expense } from '@teilfair/shared';
import { useGroupStore } from '../store/groupStore';

interface EditExpenseModalProps {
  expense: Expense;
  onClose: () => void;
}

export function EditExpenseModal({ expense, onClose }: EditExpenseModalProps) {
  const { members, group, updateExpense } = useGroupStore();
  
  // Parse the expense date properly
  const expenseDate = new Date(expense.date);
  
  const [description, setDescription] = useState(expense.description);
  const [totalAmount, setTotalAmount] = useState(expense.totalAmount.toString());
  const [date, setDate] = useState(() => {
    // Format as YYYY-MM-DD in local time
    const year = expenseDate.getFullYear();
    const month = String(expenseDate.getMonth() + 1).padStart(2, '0');
    const day = String(expenseDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [time, setTime] = useState(() => {
    // Format as HH:MM in local time
    const hours = String(expenseDate.getHours()).padStart(2, '0');
    const minutes = String(expenseDate.getMinutes()).padStart(2, '0');
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
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize from expense data
  useEffect(() => {
    // Initialize payers
    if (expense.payers.length === 1) {
      setSinglePayer(expense.payers[0].memberId);
      setShowMultiplePayers(false);
    } else {
      setShowMultiplePayers(true);
      const payerMap: Record<string, string> = {};
      expense.payers.forEach(p => {
        payerMap[p.memberId] = p.amount.toString();
      });
      setMultiplePayers(payerMap);
    }
    
    // Initialize splits
    const hasCustomSplit = expense.splits.some(s => s.shareType === 'fixed');
    if (hasCustomSplit) {
      setShowCustomSplit(true);
      const splitMap: Record<string, string> = {};
      expense.splits.forEach(s => {
        splitMap[s.memberId] = s.share.toString();
      });
      setCustomSplits(splitMap);
      setIncludedMembers(new Set(expense.splits.map(s => s.memberId)));
    } else {
      setShowCustomSplit(false);
      setIncludedMembers(new Set(expense.splits.map(s => s.memberId)));
    }
  }, [expense]);

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
    
    // Build payers array
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
    
    // Build splits array
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
    
    // Combine date and time
    const expenseDate = new Date(`${date}T${time || '12:00'}`);
    
    setLoading(true);
    try {
      await updateExpense(expense.id, {
        description: description.trim() || 'Expense',
        totalAmount: amount,
        date: expenseDate,
        payers: payerEntries,
        splits,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update expense');
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

  const splitAmount = includedMembers.size > 0 && totalAmount 
    ? parseFloat(totalAmount) / includedMembers.size 
    : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Expense</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Basic Info */}
            <div className="input-group">
              <label htmlFor="edit-description">Description</label>
              <input
                id="edit-description"
                type="text"
                className="input"
                placeholder="e.g., Dinner, Taxi, Hotel"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
            
            <div className="input-group">
              <label htmlFor="edit-amount">Amount ({group?.currency})</label>
              <input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0.01"
                className="input"
                placeholder="0.00"
                value={totalAmount}
                onChange={e => setTotalAmount(e.target.value)}
                required
              />
            </div>
            
            <div className="input-row">
              <div className="input-group" style={{ flex: 2 }}>
                <label htmlFor="edit-date">Date</label>
                <input
                  id="edit-date"
                  type="date"
                  className="input"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <label htmlFor="edit-time">Time</label>
                <input
                  id="edit-time"
                  type="time"
                  className="input"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                />
              </div>
            </div>
            
            {/* Payer Section */}
            <div className="input-group">
              <label>Who paid?</label>
              
              {!showMultiplePayers ? (
                <>
                  <select
                    className="select mb-2"
                    value={singlePayer}
                    onChange={e => setSinglePayer(e.target.value)}
                  >
                    <option value="">Select payer...</option>
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
                    <span className="advanced-toggle-icon">▼</span>
                    <span>Multiple payers (advanced)</span>
                  </button>
                </>
              ) : (
                <>
                  <div className="text-sm text-secondary mb-2">
                    Total: {formatCurrency(totalPaidMultiple)} / {formatCurrency(parseFloat(totalAmount) || 0)}
                  </div>
                  {members.map(member => (
                    <div key={member.id} className="flex gap-2 items-center mb-1">
                      <span style={{ minWidth: '100px' }}>{member.name}</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="input"
                        placeholder="0.00"
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
                    <span className="advanced-toggle-icon open">▼</span>
                    <span>Use single payer</span>
                  </button>
                </>
              )}
            </div>
            
            {/* Split Section */}
            <div className="input-group">
              <label>Split between ({includedMembers.size} {includedMembers.size === 1 ? 'person' : 'people'})</label>
              
              {!showCustomSplit ? (
                <>
                  <div className="mb-2">
                    {members.map(member => (
                      <div 
                        key={member.id} 
                        className={`member-select-item ${includedMembers.has(member.id) ? 'selected' : ''}`}
                        onClick={() => toggleMemberInSplit(member.id)}
                        style={{ marginBottom: '8px' }}
                      >
                        <div className={`checkbox ${includedMembers.has(member.id) ? 'checked' : ''}`} />
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
                    <span className="advanced-toggle-icon">▼</span>
                    <span>Custom split amounts (advanced)</span>
                  </button>
                </>
              ) : (
                <>
                  {members.map(member => (
                    <div key={member.id} className="flex gap-2 items-center mb-1">
                      <span style={{ minWidth: '100px' }}>{member.name}</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="input"
                        placeholder="0.00"
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
                    <span className="advanced-toggle-icon open">▼</span>
                    <span>Use equal split</span>
                  </button>
                </>
              )}
            </div>
            
            {error && <p className="text-danger text-sm">{error}</p>}
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
