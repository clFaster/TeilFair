import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';
import { useGroupStore } from '../store/groupStore';
import { MembersList } from '../components/MembersList';
import { ExpensesList } from '../components/ExpensesList';
import { BalancesSummary } from '../components/BalancesSummary';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { AddExpenseForm } from '../components/AddExpenseForm';
import { ShareModal } from '../components/ShareModal';
import { LogoIcon } from '../components/LogoIcon';
import { useTheme } from '../theme/ThemeProvider';

type Tab = 'expenses' | 'balances' | 'members';

// Hook to detect if we should use the side panel layout
function useWideScreen() {
  const [isWide, setIsWide] = useState(() => 
    typeof window !== 'undefined' && window.innerWidth >= 1024
  );
  
  useEffect(() => {
    const handleResize = () => {
      setIsWide(window.innerWidth >= 1024);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return isWide;
}

export function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('t');
  const { mode, setThemePreference } = useTheme();
  const isWideScreen = useWideScreen();
  
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

  const cycleTheme = () => {
    setThemePreference(mode === 'light' ? 'dark' : 'light');
  };

  const getThemeIcon = () => {
    return mode === 'dark' ? faMoon : faSun;
  };

  if (!groupId || !token) {
    return (
      <div className="app">
        <div className="container">
          <div className="card text-center">
            <h2>Invalid Link</h2>
            <p className="text-secondary">This group link is invalid or incomplete.</p>
            <Link to="/" className="btn btn-primary mt-3">Go Home</Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !group) {
    return (
      <div className="app">
        <div className="container">
          <div className="card text-center">
            <p>Loading group...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="app">
        <div className="container">
          <div className="card text-center">
            <h2>Error</h2>
            <p className="text-danger">{error}</p>
            <Link to="/" className="btn btn-primary mt-3">Go Home</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="app">
        <div className="container">
          <div className="card text-center">
            <h2>Group Not Found</h2>
            <p className="text-secondary">This group doesn't exist or you don't have access.</p>
            <Link to="/" className="btn btn-primary mt-3">Go Home</Link>
          </div>
        </div>
      </div>
    );
  }

  const canWrite = permission === 'write';

  // Render side panel content (either balance summary or add expense form)
  const renderSidePanel = () => {
    if (showAddExpense) {
      return (
        <div className="side-panel-card">
          <div className="side-panel-header">
            <h3>Add Expense</h3>
            <button className="btn btn-icon btn-ghost" onClick={() => setShowAddExpense(false)}>×</button>
          </div>
          <AddExpenseForm 
            onSuccess={() => setShowAddExpense(false)}
            showHeader={false}
            showCancelButton={false}
          />
        </div>
      );
    }
    
    return (
      <div className="side-panel-card">
        <h3 className="side-panel-title">Summary</h3>
        <BalancesSummary />
      </div>
    );
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content header-content-wide">
          <Link to="/" className="logo">
            <LogoIcon size={24} />
            <span>TeilFair</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className={`badge ${canWrite ? 'badge-write' : 'badge-read'}`}>
              {canWrite ? 'edit' : 'view only'}
            </span>
            <button className="btn btn-sm btn-primary" onClick={() => setShowShare(true)}>
              Share
            </button>
            <button className="theme-toggle" onClick={cycleTheme} title={`Theme: ${mode}`}>
              <FontAwesomeIcon icon={getThemeIcon()} style={{ fontSize: '16px' }} />
            </button>
          </div>
        </div>
      </header>

      <div className={isWideScreen ? 'wide-layout' : 'container'}>
        <div className={isWideScreen ? 'main-content' : ''}>
          <div className="card">
            <div className="card-header">
              <h1 className="card-title">{group.name}</h1>
              <span className="text-secondary">{group.currency}</span>
            </div>
            
            <div className="tabs">
              <button 
                className={`tab ${activeTab === 'expenses' ? 'active' : ''}`}
                onClick={() => setActiveTab('expenses')}
              >
                Expenses
              </button>
              {/* Only show balances tab on narrow screens - it's in side panel on wide */}
              {!isWideScreen && (
                <button 
                  className={`tab ${activeTab === 'balances' ? 'active' : ''}`}
                  onClick={() => setActiveTab('balances')}
                >
                  Balances
                </button>
              )}
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
                    className="btn btn-primary btn-block mb-3"
                    onClick={() => setShowAddExpense(true)}
                    disabled={members.length < 1}
                  >
                    + Add Expense
                  </button>
                )}
                {members.length < 1 && (
                  <p className="text-secondary text-sm text-center mb-3">
                    Add at least 1 member to start adding expenses
                  </p>
                )}
                <ExpensesList canEdit={canWrite} />
              </>
            )}

            {activeTab === 'balances' && !isWideScreen && <BalancesSummary />}

            {activeTab === 'members' && <MembersList canEdit={canWrite} />}
          </div>
        </div>
        
        {/* Side panel - only shown on wide screens */}
        {isWideScreen && (
          <aside className="side-panel">
            {renderSidePanel()}
          </aside>
        )}
      </div>
      
      <footer className="footer">
        TeilFair - Split expenses fairly
      </footer>

      {/* Modal for narrow screens only */}
      {showAddExpense && !isWideScreen && (
        <AddExpenseModal onClose={() => setShowAddExpense(false)} />
      )}

      {showShare && (
        <ShareModal onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}
