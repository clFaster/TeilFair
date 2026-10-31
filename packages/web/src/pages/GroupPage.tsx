import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faReceipt, faUsers, faChartPie, faXmark, faUserPlus,
  faExclamationTriangle, faHome, faEye, faLinkSlash, faMagnifyingGlass,
  type IconDefinition
} from '@fortawesome/free-solid-svg-icons';
import { useGroupStore } from '../store/groupStore';
import { MembersList, MembersListForm } from '../components/MembersList';
import { ExpensesList } from '../components/ExpensesList';
import { ExpenseDetailsContent, ExpenseDetailsModal } from '../components/ExpenseDetailsModal';
import { BalancesSummary } from '../components/BalancesSummary';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { AddMemberModal } from '../components/AddMemberModal';
import { EditExpenseModal } from '../components/EditExpenseModal';
import { ShareModal } from '../components/ShareModal';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';
import { GroupHeader } from '../components/GroupHeader';
import { TabList, type TabItem } from '../components/TabList';
import { MobileTabBar } from '../components/MobileTabBar';
import { Fab } from '../components/Fab';
import { EmptyState } from '../components/EmptyState';
import { GroupPageSkeleton } from '../components/Skeleton';
import { tabId, tabPanelId } from '../components/tabIds';
import { DESKTOP_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import type { Expense } from '@teilfair/shared';

type Tab = 'expenses' | 'balances' | 'members';

const TAB_PREFIX = 'group';

interface FabConfig {
  icon: IconDefinition;
  label: string;
  testId: string;
  onClick: () => void;
  disabled?: boolean;
}

interface GroupStatusProps {
  children: ReactNode;
}

/** Full-page status (invalid link, error, not found) inside the app shell. */
function GroupStatus({ children }: Readonly<GroupStatusProps>) {
  return (
    <div className="app">
      <AppHeader backTo="/" />
      <main className="container status-page">{children}</main>
      <AppFooter />
    </div>
  );
}

export function GroupPage() {
  const { t } = useTranslation();
  const { groupId } = useParams<{ groupId: string }>();
  const location = useLocation();
  const token = new URLSearchParams(location.hash.slice(1)).get('t');
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

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
  const [showAddMember, setShowAddMember] = useState(false);
  const detailsHeadingRef = useRef<HTMLHeadingElement>(null);
  const detailsTriggerRef = useRef<HTMLElement | null>(null);
  const focusMembersTabRef = useRef(false);
  const panelRef = useRef<HTMLElement>(null);
  // Each section keeps its own scroll offset; only user tab changes move the page.
  const scrollPositions = useRef<Partial<Record<Tab, number>>>({});
  const pendingScrollRef = useRef(false);

  // Balances live in the side panel on desktop, so that tab only exists below 1024px.
  const currentTab: Tab = isDesktop && activeTab === 'balances' ? 'expenses' : activeTab;

  // The member sheet is phone-only; desktop has the inline form on the Members tab.
  if (isDesktop && showAddMember) {
    setShowAddMember(false);
  }

  useEffect(() => {
    if (groupId && token) {
      loadGroup(groupId, token);
    }
  }, [groupId, token, loadGroup]);

  // The empty-state CTA unmounts its own button, so hand focus to the Members tab instead.
  useEffect(() => {
    if (!focusMembersTabRef.current) return;
    focusMembersTabRef.current = false;
    document.getElementById(tabId(TAB_PREFIX, 'members'))?.focus({ preventScroll: true });
  }, [activeTab]);

  // After a tab change: restore the section's last position, or on first visit bring the
  // panel heading just below the sticky header if the page was scrolled past it.
  useLayoutEffect(() => {
    if (!pendingScrollRef.current) return;
    pendingScrollRef.current = false;
    const panel = panelRef.current;
    if (!panel) return;

    const margin = Number.parseFloat(getComputedStyle(panel).scrollMarginTop) || 0;
    const panelTop = panel.getBoundingClientRect().top + window.scrollY - margin;
    const saved = scrollPositions.current[currentTab];
    const target = saved ?? (window.scrollY > panelTop ? panelTop : window.scrollY);
    // Instant overrides `html { scroll-behavior: smooth }`: no animated jump.
    window.scrollTo({ top: target, behavior: 'instant' });
  }, [currentTab]);

  // Desktop: move focus to the details panel when an expense is opened there.
  const viewingId = viewingExpense?.id;
  useEffect(() => {
    if (isDesktop && viewingId) {
      detailsHeadingRef.current?.focus();
    }
  }, [isDesktop, viewingId]);

  const goHome = (
    <Link to="/" className="btn btn-primary">
      <FontAwesomeIcon icon={faHome} aria-hidden="true" />
      {t('common.goHome')}
    </Link>
  );

  if (!groupId || !token) {
    return (
      <GroupStatus>
        <EmptyState
          variant="page"
          titleAs="h1"
          tone="warning"
          icon={faLinkSlash}
          title={t('group.invalidLinkTitle')}
          description={t('group.invalidLinkDescription')}
          action={goHome}
        />
      </GroupStatus>
    );
  }

  if (loading && !group) {
    return (
      <div className="app app-group">
        <AppHeader backTo="/" />
        <GroupPageSkeleton label={t('group.loadingGroup')} />
      </div>
    );
  }

  if (error && !group) {
    return (
      <GroupStatus>
        <EmptyState
          variant="page"
          titleAs="h1"
          tone="danger"
          role="alert"
          icon={faExclamationTriangle}
          title={t('common.error')}
          description={error}
          action={goHome}
        />
      </GroupStatus>
    );
  }

  if (!group) {
    return (
      <GroupStatus>
        <EmptyState
          variant="page"
          titleAs="h1"
          tone="muted"
          icon={faMagnifyingGlass}
          title={t('group.groupNotFoundTitle')}
          description={t('group.groupNotFoundDescription')}
          action={goHome}
        />
      </GroupStatus>
    );
  }

  const canWrite = permission === 'write';
  const hasMembers = members.length > 0;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.totalAmount, 0);
  // Always show the store's current copy; a deleted expense simply closes the details.
  const shownExpense = viewingExpense
    ? expenses.find((expense) => expense.id === viewingExpense.id) ?? null
    : null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: group.currency || 'EUR',
    }).format(amount);
  };

  const tabs: TabItem<Tab>[] = [
    { id: 'expenses', label: t('group.tabExpenses'), icon: faReceipt, testId: 'expenses-tab-button' },
    ...(isDesktop ? [] : [{ id: 'balances' as const, label: t('group.tabBalances'), icon: faChartPie, testId: 'balances-tab-button' }]),
    { id: 'members', label: t('group.tabMembers'), icon: faUsers, testId: 'members-tab-button' },
  ];
  const currentTabLabel = tabs.find((tab) => tab.id === currentTab)?.label;

  const changeTab = (next: Tab) => {
    if (next === currentTab) return;
    scrollPositions.current[currentTab] = window.scrollY;
    pendingScrollRef.current = true;
    setActiveTab(next);
  };

  const closeDetails = () => {
    setViewingExpense(null);
    // Desktop panel: hand focus back to the "view" button that opened it.
    const trigger = detailsTriggerRef.current;
    detailsTriggerRef.current = null;
    if (isDesktop && trigger?.isConnected) trigger.focus();
  };

  const openAddExpense = () => {
    setEditingExpense(null);
    setViewingExpense(null);
    setShowAddExpense(true);
  };

  // Phones: the FAB adds to the current section; Balances has nothing to add.
  const fabByTab: Record<Tab, FabConfig | null> = {
    expenses: {
      icon: faPlus,
      label: t('expense.addExpense'),
      testId: 'add-expense-button',
      onClick: openAddExpense,
      disabled: !hasMembers,
    },
    balances: null,
    members: {
      icon: faUserPlus,
      label: t('member.addMemberTitle'),
      testId: 'add-member-button',
      onClick: () => setShowAddMember(true),
    },
  };
  const fab = !isDesktop && canWrite ? fabByTab[currentTab] : null;

  const renderSidePanel = () => {
    if (shownExpense) {
      return (
        <section
          className="side-panel-card"
          aria-labelledby="side-panel-details-title"
          onKeyDown={(event) => {
            if (event.key === 'Escape') closeDetails();
          }}
        >
          <div className="side-panel-header">
            <h2 id="side-panel-details-title" ref={detailsHeadingRef} tabIndex={-1}>
              <FontAwesomeIcon icon={faEye} className="side-panel-header-icon" aria-hidden="true" />
              {t('expense.viewExpense')}
            </h2>
            <button
              type="button"
              className="btn-close"
              onClick={closeDetails}
              aria-label={t('common.close')}
              title={t('common.close')}
            >
              <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
            </button>
          </div>
          <div className="side-panel-scroll">
            <ExpenseDetailsContent expense={shownExpense} />
          </div>
        </section>
      );
    }

    return (
      <section className="side-panel-card" aria-labelledby="side-panel-summary-title">
        <h2 id="side-panel-summary-title" className="side-panel-title">{t('group.summary')}</h2>

        <dl className="summary-stats">
          <div className="summary-stat summary-stat-primary">
            <dt>{t('group.totalExpenses')}</dt>
            <dd>{formatCurrency(totalExpenses)}</dd>
          </div>
          <div className="summary-stat">
            <dt>{t('group.averagePerMember')}</dt>
            <dd>{formatCurrency(hasMembers ? totalExpenses / members.length : 0)}</dd>
          </div>
        </dl>

        <div className="side-panel-scroll">
          <BalancesSummary />
        </div>
      </section>
    );
  };

  const renderTabContent = () => {
    if (currentTab === 'balances') {
      return <BalancesSummary />;
    }

    if (currentTab === 'members') {
      return (
        <>
          {isDesktop && canWrite && (
            <div className="tab-panel-actions">
              <MembersListForm canEdit={canWrite} />
            </div>
          )}
          <MembersList canEdit={canWrite} />
        </>
      );
    }

    if (!hasMembers) {
      return (
        <EmptyState
          icon={faUsers}
          title={t('member.addMembersFirst')}
          description={t('member.addMembersToTrack')}
          action={(
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                focusMembersTabRef.current = true;
                changeTab('members');
              }}
            >
              {t('member.goToMembers')}
            </button>
          )}
        />
      );
    }

    return (
      <ExpensesList
        canEdit={canWrite}
        onAddExpense={openAddExpense}
        selectedExpenseId={isDesktop ? shownExpense?.id : undefined}
        onEditExpense={(expense) => {
          setShowAddExpense(false);
          setEditingExpense(expense);
          setViewingExpense(null);
        }}
        onViewExpense={(expense) => {
          if (document.activeElement instanceof HTMLElement) {
            detailsTriggerRef.current = document.activeElement;
          }
          setShowAddExpense(false);
          setEditingExpense(null);
          setViewingExpense(expense);
        }}
      />
    );
  };

  return (
    <div className={`app app-group${fab ? ' has-fab' : ''}`}>
      <AppHeader backTo="/" />

      <main className="group-shell">
        <div className="group-main">
          <GroupHeader
            name={group.name}
            expenseCount={expenses.length}
            memberCount={members.length}
            canWrite={canWrite}
            total={formatCurrency(totalExpenses)}
            onShare={() => setShowShare(true)}
          />

          {/* Fixed to the bottom visually, but before its panel in DOM (Tab) order */}
          {!isDesktop && (
            <MobileTabBar tabs={tabs} active={currentTab} onChange={changeTab} idPrefix={TAB_PREFIX} />
          )}

          <section className="card group-panel" ref={panelRef}>
            {isDesktop ? (
              <div className="group-panel-toolbar">
                <TabList
                  tabs={tabs}
                  active={currentTab}
                  onChange={changeTab}
                  idPrefix={TAB_PREFIX}
                  label={t('accessibility.mainNavigation')}
                  className="tabs"
                  tabClassName="tab"
                />
                {canWrite && currentTab === 'expenses' && (
                  <button
                    type="button"
                    className="btn btn-primary action-button"
                    data-testid="add-expense-button"
                    onClick={openAddExpense}
                    disabled={!hasMembers}
                  >
                    <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
                    <span>{t('expense.addExpense')}</span>
                  </button>
                )}
              </div>
            ) : (
              <h2 className="group-panel-title">{currentTabLabel}</h2>
            )}

            <div
              role="tabpanel"
              id={tabPanelId(TAB_PREFIX, currentTab)}
              aria-labelledby={tabId(TAB_PREFIX, currentTab)}
              className="tab-panel"
              tabIndex={0}
            >
              <div key={currentTab} className="animate-in">
                {renderTabContent()}
              </div>
            </div>
          </section>

          {/* After the panel content, before the footer in Tab order */}
          {fab && (
            <Fab
              key={fab.testId}
              icon={fab.icon}
              label={fab.label}
              onClick={fab.onClick}
              disabled={fab.disabled}
              testId={fab.testId}
            />
          )}
        </div>

        {isDesktop && (
          <aside className="group-aside" aria-label={t('group.summary')}>
            {renderSidePanel()}
          </aside>
        )}
      </main>

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

      {shownExpense && !isDesktop && (
        <ExpenseDetailsModal
          expense={shownExpense}
          onClose={() => setViewingExpense(null)}
        />
      )}

      {showShare && (
        <ShareModal onClose={() => setShowShare(false)} />
      )}

      {showAddMember && (
        <AddMemberModal onClose={() => setShowAddMember(false)} />
      )}
    </div>
  );
}
