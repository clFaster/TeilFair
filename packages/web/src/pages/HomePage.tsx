import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faCircleExclamation, faLink, faPlus, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { useGroupStore } from '../store/groupStore';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';
import { HomeHero } from '../components/HomeHero';
import { HomeRecentGroups } from '../components/HomeRecentGroups';
import { HomeHowItWorks } from '../components/HomeHowItWorks';
import { Modal } from '../components/Modal';

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK'] as const;

type Dialog = 'create' | 'join' | null;

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createGroup, loadGroup, recentGroups, removeFromRecent, loading } = useGroupStore();

  const [dialog, setDialog] = useState<Dialog>(null);
  const [groupName, setGroupName] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [joinLink, setJoinLink] = useState('');
  const [error, setError] = useState('');

  const openDialog = (next: Dialog) => {
    setDialog(next);
    setError('');
  };

  const closeDialog = () => {
    setDialog(null);
    setError('');
    setGroupName('');
    setJoinLink('');
  };

  const handleCreateGroup = async (e: FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    setError('');

    try {
      const group = await createGroup(groupName.trim(), currency);
      navigate(`/g/${group.id}?t=${group.writeToken}`);
    } catch {
      setError(t('error.failedToCreate'));
    }
  };

  const handleJoinGroup = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const url = new URL(joinLink.trim());
      const pathMatch = url.pathname.match(/\/g\/([a-f0-9-]+)/i);
      const token = url.searchParams.get('t');

      if (!pathMatch || !token) {
        setError(t('error.invalidLink'));
        return;
      }

      const groupId = pathMatch[1];
      if (await loadGroup(groupId, token)) {
        navigate(`/g/${groupId}?t=${token}`);
      } else {
        setError(t('error.failedToJoin'));
      }
    } catch {
      setError(t('error.invalidLinkFormat'));
    }
  };

  const handleOpenRecent = async (groupId: string, token: string) => {
    if (await loadGroup(groupId, token)) {
      navigate(`/g/${groupId}?t=${token}`);
    } else {
      removeFromRecent(groupId);
      setError(t('error.groupNoLongerAccessible'));
    }
  };

  const formError = error && (
    <p className="form-error" role="alert">
      <FontAwesomeIcon icon={faCircleExclamation} aria-hidden="true" />
      <span>{error}</span>
    </p>
  );

  const footer = (formId: string, busyLabel: string, label: string, disabled: boolean) => (
    <>
      <button type="button" className="btn btn-secondary" onClick={closeDialog}>
        {t('common.cancel')}
      </button>
      <button type="submit" form={formId} className="btn btn-primary" disabled={loading || disabled}>
        <span>{loading ? busyLabel : label}</span>
        <FontAwesomeIcon icon={loading ? faSpinner : faArrowRight} spin={loading} aria-hidden="true" />
      </button>
    </>
  );

  return (
    <div className="app app-home">
      <AppHeader />

      <main className="container home">
        <HomeHero onCreate={() => openDialog('create')} onJoin={() => openDialog('join')} />

        {!dialog && error && (
          <div className="home-alert">{formError}</div>
        )}

        <HomeRecentGroups
          groups={recentGroups}
          loading={loading}
          onOpen={handleOpenRecent}
          onRemove={removeFromRecent}
        />

        <HomeHowItWorks />
      </main>

      <AppFooter />

      {dialog === 'create' && (
        <Modal
          title={t('home.createFormTitle')}
          icon={faPlus}
          onClose={closeDialog}
          size="sm"
          belowHeader
          footer={footer('create-group-form', t('home.creating'), t('home.createButton'), !groupName.trim())}
        >
          <form id="create-group-form" className="home-dialog-form" onSubmit={handleCreateGroup} noValidate>
            <div className="input-group">
              <label htmlFor="groupName">{t('home.groupNameLabel')}</label>
              <input
                id="groupName"
                type="text"
                className="input"
                placeholder={t('home.groupNamePlaceholder')}
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                enterKeyHint="go"
                autoComplete="off"
                autoFocus
              />
            </div>

            <div className="input-group">
              <label htmlFor="currency">{t('home.currencyLabel')}</label>
              <select id="currency" className="select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((code) => (
                  <option key={code} value={code}>{t(`currency.${code}`)}</option>
                ))}
              </select>
            </div>

            {formError}
          </form>
        </Modal>
      )}

      {dialog === 'join' && (
        <Modal
          title={t('home.joinFormTitle')}
          icon={faLink}
          onClose={closeDialog}
          size="sm"
          belowHeader
          footer={footer('join-group-form', t('home.joining'), t('home.joinButton'), !joinLink.trim())}
        >
          <form id="join-group-form" className="home-dialog-form" onSubmit={handleJoinGroup} noValidate>
            <div className="input-group">
              <label htmlFor="joinLink">{t('home.linkLabel')}</label>
              <input
                id="joinLink"
                type="url"
                inputMode="url"
                className="input"
                placeholder={t('home.linkPlaceholder')}
                value={joinLink}
                onChange={(e) => setJoinLink(e.target.value)}
                aria-describedby="joinLinkHint"
                enterKeyHint="go"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
              />
              <p id="joinLinkHint" className="input-hint">{t('home.linkHint')}</p>
            </div>

            {formError}
          </form>
        </Modal>
      )}
    </div>
  );
}
