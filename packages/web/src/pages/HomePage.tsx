import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { useGroupStore } from '../store/groupStore';
import { useTheme } from '../theme/ThemeContext';
import { LogoIcon } from '../components/LogoIcon';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';
import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { HomeHero } from '../components/HomeHero';
import { HomeRecentGroups } from '../components/HomeRecentGroups';
import { HomeHowItWorks } from '../components/HomeHowItWorks';

export function HomePage() {
  const { t } = useTranslation();
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
    setError('');

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
        <HomeHero
          onCreate={() => {
            setShowCreate(true);
            setShowJoin(false);
            setError('');
          }}
          onJoin={() => {
            setShowJoin(true);
            setShowCreate(false);
            setError('');
          }}
        />

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
        {!showCreate && !showJoin && (
          <HomeRecentGroups
            groups={recentGroups}
            loading={loading}
            onOpen={handleOpenRecent}
            onRemove={removeFromRecent}
          />
        )}

        {/* How it Works - Feature Cards */}
        {!showCreate && !showJoin && <HomeHowItWorks />}

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
