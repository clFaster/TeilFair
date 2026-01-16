import { useState, useEffect } from 'react';
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
      // Auto-select the new member for split
      setIncludedMembers(prev => new Set([...prev, newMember.id]));
      // If no payer selected, set the new member as payer
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
        // Don't allow removing if it's the last one
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
    
    // Validate at least one member is selected for split
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
      // Equal split among included members
      splits = Array.from(includedMembers).map(memberId => ({
        memberId,
        share: 1,
        shareType: 'ratio' as ShareType,
      }));
    }
    
    setLoading(true);
    try {
      await addExpense({
        description: description.trim() || 'Expense',
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

  const splitAmount = includedMembers.size > 0 && totalAmount 
    ? parseFloat(totalAmount) / includedMembers.size 
    : 0;

  return (
    <form onSubmit={handleSubmit} className="expense-form">
      {showHeader && (
        <div className="expense-form-header">
          <h2>Add Expense</h2>
          {onCancel && (
            <button type="button" className="btn btn-icon btn-ghost" onClick={onCancel}>×</button>
          )}
        </div>
      )}
      
      <div className="expense-form-body">
        {/* Basic Info */}
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
          <label htmlFor="amount">Amount ({group?.currency})</label>
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
        
        <div className="input-row">
          <div className="input-group" style={{ flex: 2 }}>
            <label htmlFor="date">Date</label>
            <input
              id="date"
              type="date"
              className="input"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div className="input-group" style={{ flex: 1 }}>
            <label htmlFor="time">Time</label>
            <input
              id="time"
              type="time"
              className="input"
              value={time}
              onChange={e => setTime(e.target.value)}
            />
          </div>
        </div>

        {/* Add Member Section */}
        <div className="input-group">
          <label>Members</label>
          {members.length === 0 && (
            <p className="text-secondary text-sm mb-2">
              Add at least one member to create an expense
            </p>
          )}
          <div className="input-row mb-2">
            <input
              type="text"
              className="input"
              placeholder="Add new member..."
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
              className="btn btn-secondary"
              onClick={handleAddNewMember}
              disabled={isAddingMember || !newMemberName.trim()}
            >
              {isAddingMember ? '...' : 'Add'}
            </button>
          </div>
        </div>
        
        {/* Payer Section */}
        {members.length > 0 && (
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
        )}
        
        {/* Split Section */}
        {members.length > 0 && (
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
        )}
        
        {error && <p className="text-danger text-sm">{error}</p>}
      </div>
      
      <div className="expense-form-footer">
        {showCancelButton && onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={loading || members.length < 1}
          style={!showCancelButton ? { width: '100%' } : undefined}
        >
          {loading ? 'Adding...' : 'Add Expense'}
        </button>
      </div>
    </form>
  );
}
