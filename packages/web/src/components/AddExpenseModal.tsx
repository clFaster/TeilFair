import { useState } from 'react';
import type { ShareType } from '@teilfair/shared';
import { useGroupStore } from '../store/groupStore';

interface AddExpenseModalProps {
  onClose: () => void;
}

export function AddExpenseModal({ onClose }: AddExpenseModalProps) {
  const { members, group, addExpense } = useGroupStore();
  
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  
  // Payer state: who paid how much
  const [payers, setPayers] = useState<Record<string, string>>({});
  
  // Split state: who owes (for equal split, all are included)
  const [includedMembers, setIncludedMembers] = useState<Set<string>>(
    new Set(members.map(m => m.id))
  );
  
  // Custom split amounts (for custom split)
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePayerChange = (memberId: string, amount: string) => {
    setPayers(prev => {
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
        next.delete(memberId);
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
    
    // Validate payers
    const payerEntries = Object.entries(payers)
      .map(([memberId, amt]) => ({ memberId, amount: parseFloat(amt) }))
      .filter(p => !isNaN(p.amount) && p.amount > 0);
    
    if (payerEntries.length === 0) {
      setError('Please select at least one payer');
      return;
    }
    
    const totalPaid = payerEntries.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(totalPaid - amount) > 0.01) {
      setError(`Paid amounts (${totalPaid.toFixed(2)}) don't match total (${amount.toFixed(2)})`);
      return;
    }
    
    // Validate splits
    let splits: Array<{ memberId: string; share: number; shareType: ShareType }>;
    
    if (splitType === 'equal') {
      if (includedMembers.size < 1) {
        setError('Please include at least one person in the split');
        return;
      }
      splits = Array.from(includedMembers).map(memberId => ({
        memberId,
        share: 1,
        shareType: 'ratio' as ShareType,
      }));
    } else {
      // Custom split
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
    }
    
    setLoading(true);
    try {
      await addExpense({
        description: description.trim() || 'Expense',
        totalAmount: amount,
        date: new Date(date),
        payers: payerEntries,
        splits,
      });
      onClose();
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

  const totalPaid = Object.values(payers).reduce(
    (sum, amt) => sum + (parseFloat(amt) || 0),
    0
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Expense</h2>
          <button className="btn btn-icon btn-secondary" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="input-group">
              <label htmlFor="description">Description</label>
              <input
                id="description"
                type="text"
                className="input"
                placeholder="e.g., Dinner, Taxi, Hotel"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
            
            <div className="input-group">
              <label htmlFor="amount">Total Amount ({group?.currency})</label>
              <input
                id="amount"
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
            
            <div className="input-group">
              <label htmlFor="date">Date</label>
              <input
                id="date"
                type="date"
                className="input"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            
            <div className="input-group">
              <label>Who paid?</label>
              <div className="text-sm text-muted mb-1">
                Total: {formatCurrency(totalPaid)} / {formatCurrency(parseFloat(totalAmount) || 0)}
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
                    value={payers[member.id] || ''}
                    onChange={e => handlePayerChange(member.id, e.target.value)}
                    style={{ width: '120px' }}
                  />
                </div>
              ))}
            </div>
            
            <div className="input-group">
              <label>Split type</label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  className={`btn ${splitType === 'equal' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSplitType('equal')}
                >
                  Equal
                </button>
                <button
                  type="button"
                  className={`btn ${splitType === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSplitType('custom')}
                >
                  Custom
                </button>
              </div>
            </div>
            
            {splitType === 'equal' && (
              <div className="input-group">
                <label>Split between ({includedMembers.size} people)</label>
                {members.map(member => (
                  <div key={member.id} className="flex gap-2 items-center mb-1">
                    <input
                      type="checkbox"
                      id={`include-${member.id}`}
                      checked={includedMembers.has(member.id)}
                      onChange={() => toggleMemberInSplit(member.id)}
                    />
                    <label htmlFor={`include-${member.id}`}>{member.name}</label>
                    {includedMembers.has(member.id) && totalAmount && (
                      <span className="text-muted text-sm">
                        ({formatCurrency(parseFloat(totalAmount) / includedMembers.size)})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {splitType === 'custom' && (
              <div className="input-group">
                <label>Custom amounts</label>
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
              </div>
            )}
            
            {error && <p className="text-danger text-sm">{error}</p>}
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
