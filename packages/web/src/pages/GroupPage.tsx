import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShare, faPlus, faReceipt, faUsers, faChartPie,
  faArrowLeft, faSpinner, faExclamationTriangle, faHome, faEye
} from '@fortawesome/free-solid-svg-icons';
import { useGroupStore } from '../store/groupStore';
import { MembersList, MembersListForm } from '../components/MembersList';
import { ExpensesList } from '../components/ExpensesList';
import { ExpenseDetailsContent, ExpenseDetailsModal } from '../components/ExpenseDetailsModal';
import { BalancesSummary } from '../components/BalancesSummary';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { EditExpenseModal } from '../components/EditExpenseModal';
import { ShareModal } from '../components/ShareModal';
import { LogoIcon } from '../components/LogoIcon';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';
import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { useTheme } from '../theme/ThemeContext';
import type { Expense } from '@teilfair/shared';

type Tab = 'expenses' | 'balances' | 'members';

// Hook to detect screen size
function useScreenSize() {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop' | 'wide'>(() => {
    if (typeof window === 'undefined') return 'mobile';
    const w = window.innerWidth;
    if (w < 640) return 'mobile';
    if (w < 1024) return 'tablet';
    if (w < 1440) return 'desktop';
    return 'wide';
  });
  
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 640) setScreenSize('mobile');
      else if (w < 1024) setScreenSize('tablet');
      else if (w < 1440) setScreenSize('desktop');
      else setScreenSize('wide');
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return screenSize;
}

export function GroupPage() {
  const { t } = useTranslation();
  const { groupId } = useParams<{ groupId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('t');
  const { mode, setThemePreference } = useTheme();
  const screenSize = useScreenSize();
  const isWideScreen = screenSize === 'desktop' || screenSize === 'wide';
  
  const { 
    group, 
    members, 
    expenses,
    permission, 
    loading, 
    error, 
    loadGroup 
  } = useGroupStore();
  
  const [activeTab, setActiveTab] = useState<Tab>('expenses');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    if (groupId && token) {
      loadGroup(groupId, token);
    }
  }, [groupId, token, loadGroup]);

  const cycleTheme = () => {
    setThemePreference(mode === 'light' ? 'dark' : 'light');
  };

  // Error and loading states
  if (!groupId || !token) {
    return (
      <div className="app">
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div className="card text-center" style={{ maxWidth: '400px' }}>
            <FontAwesomeIcon icon={faExclamationTriangle} style={{ fontSize: '48px', color: 'var(--color-warning)', marginBottom: '16px' }} />
            <h2 style={{ marginBottom: '8px' }}>{t('group.invalidLinkTitle')}</h2>
            <p className="text-secondary mb-4">{t('group.invalidLinkDescription')}</p>
            <Link to="/" className="btn btn-primary">
              <FontAwesomeIcon icon={faHome} style={{ marginRight: '8px' }} />
              {t('common.goHome')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !group) {
    return (
      <div className="app">
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div className="card text-center" style={{ maxWidth: '400px' }}>
            <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: '48px', color: 'var(--color-primary)', marginBottom: '16px' }} />
            <p className="text-secondary">{t('group.loadingGroup')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="app">
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div className="card text-center" style={{ maxWidth: '400px' }}>
            <FontAwesomeIcon icon={faExclamationTriangle} style={{ fontSize: '48px', color: 'var(--color-danger)', marginBottom: '16px' }} />
            <h2 style={{ marginBottom: '8px' }}>{t('common.error')}</h2>
            <p className="text-danger mb-4">{error}</p>
            <Link to="/" className="btn btn-primary">
              <FontAwesomeIcon icon={faHome} style={{ marginRight: '8px' }} />
              {t('common.goHome')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="app">
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div className="card text-center" style={{ maxWidth: '400px' }}>
            <FontAwesomeIcon icon={faExclamationTriangle} style={{ fontSize: '48px', color: 'var(--color-text-muted)', marginBottom: '16px' }} />
            <h2 style={{ marginBottom: '8px' }}>{t('group.groupNotFoundTitle')}</h2>
            <p className="text-secondary mb-4">{t('group.groupNotFoundDescription')}</p>
            <Link to="/" className="btn btn-primary">
              <FontAwesomeIcon icon={faHome} style={{ marginRight: '8px' }} />
              {t('common.goHome')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const canWrite = permission === 'write';
  const totalExpenses = expenses.reduce((sum, e) => sum + e.totalAmount, 0);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: group.currency || 'EUR',
    }).format(amount);
  };

  // Render side panel content
  const renderSidePanel = () => {
    if (viewingExpense) {
      return (
        <div className="side-panel-card">
          <div className="side-panel-header">
            <h3>
              <FontAwesomeIcon icon={faEye} style={{ marginRight: '8px', opacity: 0.7 }} />
              {t('expense.viewExpense')}
            </h3>
            <button className="btn btn-sm btn-ghost expense-dialog-close" onClick={() => setViewingExpense(null)}>
              &times;
            </button>
          </div>
          <div className="side-panel-scroll">
            <ExpenseDetailsContent expense={viewingExpense} />
          </div>
        </div>
      );
    }
    
    return (
      <div className="side-panel-card">
        <h3 className="side-panel-title">{t('group.summary')}</h3>
        
        {/* Quick Stats */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '12px', 
          marginBottom: '24px',
          padding: '16px',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)'
        }}>
          <div>
            <div className="text-muted text-sm">{t('group.totalExpenses')}</div>
            <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-primary)' }}>
              {formatCurrency(totalExpenses)}
            </div>
          </div>
          <div>
            <div className="text-muted text-sm">{t('group.tabMembers')}</div>
            <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
              {members.length}
            </div>
          </div>
        </div>

        <div className="side-panel-scroll">
          <BalancesSummary />
        </div>
      </div>
    );
  };

  return (
    <div className="app app-group">
      <AppHeader
        wide
        left={(
          <>
            <Link to="/" className="btn btn-ghost app-header-icon" title={t('accessibility.backToHome')}>
              <FontAwesomeIcon icon={faArrowLeft} />
            </Link>
            <Link to="/" className="logo">
              <LogoIcon size={32} />
              <span>{t('common.appName')}</span>
            </Link>
          </>
        )}
        right={(
          <>
            <LanguageSwitcher />
            <ThemeToggleButton
              mode={mode}
              onToggle={cycleTheme}
              title={t('accessibility.themeToggle', { mode })}
              size={16}
            />
          </>
        )}
      />

      <div className={isWideScreen ? 'wide-layout group-layout' : 'container group-layout'}>
        <div className="main-content">
          <div className="card">
            {/* Group Header */}
            <div className="card-header group-header">
              <div className="group-header-left">
                <div className="group-title-row">
                  <h1 className="card-title group-title-compact">{group.name}</h1>
                  <button
                    className="btn btn-sm btn-ghost group-share-button"
                    onClick={() => setShowShare(true)}
                    title={t('common.share')}
                    aria-label={t('common.share')}
                  >
                    <FontAwesomeIcon icon={faShare} />
                    <span className="sr-only">{t('common.share')}</span>
                  </button>
                </div>
                <div className="group-meta-row">
                  <span className="group-meta-item">
                    {t(expenses.length === 1 ? 'group.expenseCount' : 'group.expenseCount_plural', { count: expenses.length })}
                  </span>
                  <span className="group-meta-item">
                    {t(members.length === 1 ? 'group.memberCount' : 'group.memberCount_plural', { count: members.length })}
                  </span>
                  <span className="badge group-access-badge">
                    {canWrite ? t('common.fullAccess') : t('common.viewOnly')}
                  </span>
                </div>
              </div>
              <div className="group-header-total">
                <div className="group-total-label">{t('common.total')}</div>
                <div className="group-total-value">{formatCurrency(totalExpenses)}</div>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="tabs">
              <button 
                className={`tab ${activeTab === 'expenses' ? 'active' : ''}`}
                data-testid="expenses-tab-button"
                onClick={() => setActiveTab('expenses')}
              >
                <FontAwesomeIcon icon={faReceipt} style={{ marginRight: '6px', opacity: 0.8 }} />
                {t('group.tabExpenses')}
              </button>
              {!isWideScreen && (
                <button 
                  className={`tab ${activeTab === 'balances' ? 'active' : ''}`}
                  onClick={() => setActiveTab('balances')}
                >
                  <FontAwesomeIcon icon={faChartPie} style={{ marginRight: '6px', opacity: 0.8 }} />
                  {t('group.tabBalances')}
                </button>
              )}
              <button 
                className={`tab ${activeTab === 'members' ? 'active' : ''}`}
                data-testid="members-tab-button"
                onClick={() => setActiveTab('members')}
              >
                <FontAwesomeIcon icon={faUsers} style={{ marginRight: '6px', opacity: 0.8 }} />
                {t('group.tabMembers')}
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'expenses' && (
              <div className="tab-panel">
                <div className="tab-panel-actions">
                  {canWrite && (
                    <button 
                      className="btn btn-primary btn-block mb-3 action-button"
                      data-testid="add-expense-button"
                      onClick={() => {
                        setEditingExpense(null); // Clear any editing state
                        setViewingExpense(null);
                        setShowAddExpense(true);
                      }}
                      disabled={members.length < 1}
                    >
                      <FontAwesomeIcon icon={faPlus} />
                      <span>{t('expense.addExpense')}</span>
                    </button>
                  )}
                  {members.length < 1 && (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '20px', 
                      background: 'var(--color-surface)', 
                      borderRadius: 'var(--radius-lg)',
                      marginBottom: '16px'
                    }}>
                      <p className="text-secondary">
                        <FontAwesomeIcon icon={faUsers} style={{ marginRight: '8px', opacity: 0.6 }} />
                        {t('member.addMembersToTrack')}
                      </p>
                      <button 
                        className="btn btn-sm btn-secondary mt-2"
                        onClick={() => setActiveTab('members')}
                      >
                        {t('member.goToMembers')}
                      </button>
                    </div>
                  )}
                </div>
                <div className="tab-content-scroll">
                  <div className="animate-in">
                    <ExpensesList 
                      canEdit={canWrite} 
                      onEditExpense={(expense) => {
                        setShowAddExpense(false); // Clear add state
                        setEditingExpense(expense);
                        setViewingExpense(null);
                      }}
                      onViewExpense={(expense) => {
                        setShowAddExpense(false);
                        setEditingExpense(null);
                        setViewingExpense(expense);
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'balances' && !isWideScreen && (
              <div className="tab-panel">
                <div className="tab-content-scroll">
                  <div className="animate-in">
                    <BalancesSummary />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'members' && (
              <div className="tab-panel">
                <div className="tab-panel-actions">
                  <MembersListForm canEdit={canWrite} />
                </div>
                <div className="tab-content-scroll">
                  <div className="animate-in">
                    <MembersList canEdit={canWrite} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Side panel for wide screens */}
        {isWideScreen && (
          <aside className="side-panel">
            {renderSidePanel()}
          </aside>
        )}
      </div>
      
      <AppFooter />

      {/* Modals */}
      {showAddExpense && (
        <AddExpenseModal onClose={() => setShowAddExpense(false)} />
      )}

      {editingExpense && (
        <EditExpenseModal 
          expense={editingExpense}
          onClose={() => setEditingExpense(null)} 
        />
      )}

      {viewingExpense && !isWideScreen && (
        <ExpenseDetailsModal
          expense={viewingExpense}
          onClose={() => setViewingExpense(null)}
        />
      )}

      {showShare && (
        <ShareModal onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}
