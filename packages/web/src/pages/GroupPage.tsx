import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useGroupStore } from '../store/groupStore';
import { MembersList } from '../components/MembersList';
import { ExpensesList } from '../components/ExpensesList';
import { BalancesSummary } from '../components/BalancesSummary';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { ShareModal } from '../components/ShareModal';

type Tab = 'expenses' | 'balances' | 'members';

export function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('t');
  
  const { 
    group, 
    members, 
    permission, 
    loading, 
    error, 
    loadGroup 
  } = useGroupStore();
  
  const [activeTab, setActiveTab] = useState<Tab>('expenses');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    if (groupId && token) {
      loadGroup(groupId, token);
    }
  }, [groupId, token, loadGroup]);

  if (!groupId || !token) {
    return (
      <div className="container">
        <div className="card text-center">
          <h2>Invalid Link</h2>
          <p className="text-muted">This group link is invalid or incomplete.</p>
          <Link to="/" className="btn btn-primary mt-4">Go Home</Link>
        </div>
      </div>
    );
  }

  if (loading && !group) {
    return (
      <div className="container">
        <div className="card text-center">
          <p>Loading group...</p>
        </div>
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="container">
        <div className="card text-center">
          <h2>Error</h2>
          <p className="text-danger">{error}</p>
          <Link to="/" className="btn btn-primary mt-4">Go Home</Link>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container">
        <div className="card text-center">
          <h2>Group Not Found</h2>
          <p className="text-muted">This group doesn't exist or you don't have access.</p>
          <Link to="/" className="btn btn-primary mt-4">Go Home</Link>
        </div>
      </div>
    );
  }

  const canWrite = permission === 'write';

  return (
    <div>
      <header className="header">
        <div className="header-content">
          <Link to="/" className="logo">TeilFair</Link>
          <div className="flex items-center gap-2">
            <span className={`badge ${canWrite ? 'badge-write' : 'badge-read'}`}>
              {canWrite ? 'Can edit' : 'View only'}
            </span>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowShare(true)}>
              Share
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <div className="card">
          <div className="card-header">
            <h1 className="card-title">{group.name}</h1>
            <span className="text-muted">{group.currency}</span>
          </div>
          
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'expenses' ? 'active' : ''}`}
              onClick={() => setActiveTab('expenses')}
            >
              Expenses
            </button>
            <button 
              className={`tab ${activeTab === 'balances' ? 'active' : ''}`}
              onClick={() => setActiveTab('balances')}
            >
              Balances
            </button>
            <button 
              className={`tab ${activeTab === 'members' ? 'active' : ''}`}
              onClick={() => setActiveTab('members')}
            >
              Members ({members.length})
            </button>
          </div>

          {activeTab === 'expenses' && (
            <>
              {canWrite && (
                <button 
                  className="btn btn-primary w-full mb-4"
                  onClick={() => setShowAddExpense(true)}
                  disabled={members.length < 2}
                >
                  Add Expense
                </button>
              )}
              {members.length < 2 && (
                <p className="text-muted text-sm text-center mb-4">
                  Add at least 2 members to start adding expenses
                </p>
              )}
              <ExpensesList canEdit={canWrite} />
            </>
          )}

          {activeTab === 'balances' && <BalancesSummary />}

          {activeTab === 'members' && <MembersList canEdit={canWrite} />}
        </div>
      </div>

      {showAddExpense && (
        <AddExpenseModal onClose={() => setShowAddExpense(false)} />
      )}

      {showShare && (
        <ShareModal onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}
