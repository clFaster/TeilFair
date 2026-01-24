import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faPlus, faLink, faArrowRight, faReceipt, faCalculator, faHandshake } from '@fortawesome/free-solid-svg-icons';
import { useGroupStore } from '../store/groupStore';
import { useTheme } from '../theme/ThemeProvider';
import { LogoIcon } from '../components/LogoIcon';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';
import { ThemeToggleButton } from '../components/ThemeToggleButton';

export function HomePage() {
  const { t, i18n } = useTranslation();
  
  // DEBUG: Log translation info
  console.log('Current language:', i18n.language);
  console.log('Available resources:', Object.keys(i18n.store?.data || {}));
  console.log('Test translation home.heroTitle:', t('home.heroTitle'));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.log('German heroTitle from store:', (i18n.store?.data as any)?.de?.translation?.home?.heroTitle);
  
  const navigate = useNavigate();
  const { createGroup, loadGroup, recentGroups, removeFromRecent, loading } = useGroupStore();
  const { mode, setThemePreference } = useTheme();
  
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [joinLink, setJoinLink] = useState('');
  const [error, setError] = useState('');

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    
    try {
      const group = await createGroup(groupName.trim(), currency);
      navigate(`/g/${group.id}?t=${group.writeToken}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.failedToCreate'));
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const url = new URL(joinLink);
      const pathMatch = url.pathname.match(/\/g\/([a-f0-9-]+)/i);
      const token = url.searchParams.get('t');
      
      if (!pathMatch || !token) {
        setError(t('error.invalidLink'));
        return;
      }
      
      const groupId = pathMatch[1];
      const success = await loadGroup(groupId, token);
      
      if (success) {
        navigate(`/g/${groupId}?t=${token}`);
      } else {
        setError(t('error.failedToJoin'));
      }
    } catch {
      setError(t('error.invalidLinkFormat'));
    }
  };

  const handleOpenRecent = async (groupId: string, token: string) => {
    const success = await loadGroup(groupId, token);
    if (success) {
      navigate(`/g/${groupId}?t=${token}`);
    } else {
      removeFromRecent(groupId);
      setError(t('error.groupNoLongerAccessible'));
    }
  };

  const cycleTheme = () => {
    setThemePreference(mode === 'light' ? 'dark' : 'light');
  };

  const closeModals = () => {
    setShowCreate(false);
    setShowJoin(false);
    setError('');
    setGroupName('');
    setJoinLink('');
  };

  return (
    <div className="app app-home">
      <AppHeader
        left={(
          <Link to="/" className="logo">
            <LogoIcon size={32} />
            <span>{t('common.appName')}</span>
          </Link>
        )}
        right={(
          <>
            <LanguageSwitcher />
            <ThemeToggleButton
              mode={mode}
              onToggle={cycleTheme}
              title={t('accessibility.themeToggle', { mode })}
            />
          </>
        )}
      />
      
      <main className="container">
        {/* Hero Section */}
        <div className="hero-card animate-in">
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.75rem)', fontWeight: 700, marginBottom: '12px', letterSpacing: '-0.03em', whiteSpace: 'pre-line' }}>
            {t('home.heroTitle')}
          </h1>
          <p style={{ fontSize: '1.125rem', opacity: 0.9, marginBottom: '28px', maxWidth: '380px', margin: '0 auto 28px', lineHeight: 1.6 }}>
            {t('home.heroSubtitle')}
          </p>
          
          <div className="flex gap-3 justify-center flex-wrap">
            <button 
              className="btn hero-btn-primary"
              onClick={() => { setShowCreate(true); setShowJoin(false); setError(''); }}
            >
              <FontAwesomeIcon icon={faPlus} />
              <span>{t('home.createGroup')}</span>
            </button>
            <button 
              className="btn hero-btn-secondary"
              onClick={() => { setShowJoin(true); setShowCreate(false); setError(''); }}
            >
              <FontAwesomeIcon icon={faLink} />
              <span>{t('home.joinGroup')}</span>
            </button>
          </div>
        </div>

        {/* Create Group Form */}
        {showCreate && (
          <div className="card animate-in">
            <h2 className="card-title mb-4">{t('home.createFormTitle')}</h2>
            <form onSubmit={handleCreateGroup}>
              <div className="input-group">
                <label htmlFor="groupName">{t('home.groupNameLabel')}</label>
                <input
                  id="groupName"
                  type="text"
                  className="input"
                  placeholder={t('home.groupNamePlaceholder')}
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  autoFocus
                />
              </div>
              
              <div className="input-group">
                <label htmlFor="currency">{t('home.currencyLabel')}</label>
                <select 
                  id="currency"
                  className="select"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="EUR">{t('currency.EUR')}</option>
                  <option value="USD">{t('currency.USD')}</option>
                  <option value="GBP">{t('currency.GBP')}</option>
                  <option value="CHF">{t('currency.CHF')}</option>
                  <option value="JPY">{t('currency.JPY')}</option>
                  <option value="CAD">{t('currency.CAD')}</option>
                  <option value="AUD">{t('currency.AUD')}</option>
                  <option value="SEK">{t('currency.SEK')}</option>
                  <option value="NOK">{t('currency.NOK')}</option>
                  <option value="DKK">{t('currency.DKK')}</option>
                  <option value="PLN">{t('currency.PLN')}</option>
                  <option value="CZK">{t('currency.CZK')}</option>
                </select>
              </div>
              
              {error && <p className="text-danger text-sm mb-3">{error}</p>}
              
              <div className="flex gap-3">
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !groupName.trim()}>
                  {loading ? t('home.creating') : t('home.createButton')}
                  {!loading && <FontAwesomeIcon icon={faArrowRight} style={{ marginLeft: '4px' }} />}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-lg"
                  onClick={closeModals}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Join Group Form */}
        {showJoin && (
          <div className="card animate-in">
            <h2 className="card-title mb-4">{t('home.joinFormTitle')}</h2>
            <form onSubmit={handleJoinGroup}>
              <div className="input-group">
                <label htmlFor="joinLink">{t('home.linkLabel')}</label>
                <input
                  id="joinLink"
                  type="text"
                  className="input"
                  placeholder={t('home.linkPlaceholder')}
                  value={joinLink}
                  onChange={(e) => setJoinLink(e.target.value)}
                  autoFocus
                />
                <p className="text-sm text-muted mt-2">
                  {t('home.linkHint')}
                </p>
              </div>
              
              {error && <p className="text-danger text-sm mb-3">{error}</p>}
              
              <div className="flex gap-3">
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !joinLink.trim()}>
                  {loading ? t('home.joining') : t('home.joinButton')}
                  {!loading && <FontAwesomeIcon icon={faArrowRight} style={{ marginLeft: '4px' }} />}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-lg"
                  onClick={closeModals}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Recent Groups */}
        {recentGroups.length > 0 && !showCreate && !showJoin && (
          <div className="card animate-in animate-delay-1">
            <h2 className="card-title mb-3">
              <FontAwesomeIcon icon={faUsers} style={{ marginRight: '10px', opacity: 0.7 }} />
              {t('home.recentGroupsTitle')}
            </h2>
            <div>
              {recentGroups.map((group) => (
                <div key={group.id} className="recent-group-card">
                  <div className="recent-group-info">
                    <span className="name">{group.name}</span>
                    <span className={`badge ${group.permission === 'write' ? 'badge-write' : 'badge-read'}`}>
                      {group.permission === 'write' ? t('common.fullAccess') : t('common.viewOnly')}
                    </span>
                  </div>
                  <div className="recent-group-actions">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleOpenRecent(group.id, group.token)}
                      disabled={loading}
                    >
                      {t('common.open')}
                      <FontAwesomeIcon icon={faArrowRight} style={{ marginLeft: '6px', fontSize: '10px' }} />
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => removeFromRecent(group.id)}
                      title={t('common.remove')}
                    >
                      &times;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How it Works - Feature Cards */}
        {!showCreate && !showJoin && (
          <div className="card animate-in animate-delay-2">
            <h2 className="card-title mb-4">{t('home.howItWorksTitle')}</h2>
            <div className="feature-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <FontAwesomeIcon icon={faUsers} />
                </div>
                <div className="feature-content">
                  <h4>{t('home.step1Title')}</h4>
                  <p>{t('home.step1Description')}</p>
                </div>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">
                  <FontAwesomeIcon icon={faReceipt} />
                </div>
                <div className="feature-content">
                  <h4>{t('home.step2Title')}</h4>
                  <p>{t('home.step2Description')}</p>
                </div>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">
                  <FontAwesomeIcon icon={faCalculator} />
                </div>
                <div className="feature-content">
                  <h4>{t('home.step3Title')}</h4>
                  <p>{t('home.step3Description')}</p>
                </div>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">
                  <FontAwesomeIcon icon={faHandshake} />
                </div>
                <div className="feature-content">
                  <h4>{t('home.step4Title')}</h4>
                  <p>{t('home.step4Description')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && !showCreate && !showJoin && (
          <div className="card animate-in" style={{ background: 'var(--clr-danger-a20)', borderColor: 'var(--clr-danger-a10)' }}>
            <p className="text-danger">{error}</p>
          </div>
        )}
      </main>
      
      <AppFooter />
    </div>
  );
}
