import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { LogoIcon } from './LogoIcon';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggleButton } from './ThemeToggleButton';
import { HeaderMoreMenu } from './HeaderMoreMenu';
import { useTheme } from '../theme/ThemeContext';

interface AppHeaderProps {
  /** Replaces the default logo link. */
  left?: ReactNode;
  /** Replaces the default language + theme controls (the "More" menu always follows). */
  right?: ReactNode;
  /** Shows a back button (to this route) in front of the logo. */
  backTo?: string;
}

function HeaderLogo() {
  const { t } = useTranslation();
  return (
    <Link to="/" className="logo">
      <LogoIcon size={32} className="logo-mark" decorative />
      <span className="logo-text">{t('common.appName')}</span>
    </Link>
  );
}

function HeaderControls() {
  const { t } = useTranslation();
  const { mode, toggleTheme } = useTheme();
  return (
    <>
      <LanguageSwitcher />
      <ThemeToggleButton
        mode={mode}
        onToggle={toggleTheme}
        title={t('accessibility.themeToggle', { mode })}
      />
    </>
  );
}

/** Compact, sticky, translucent app bar shared by every page. */
export function AppHeader({ left, right, backTo }: Readonly<AppHeaderProps>) {
  const { t } = useTranslation();

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          {backTo && (
            <Link
              to={backTo}
              className="app-header-icon header-back"
              title={t('accessibility.backToHome')}
              aria-label={t('accessibility.backToHome')}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </Link>
          )}
          {left ?? <HeaderLogo />}
        </div>
        <div className="header-actions">
          {right ?? <HeaderControls />}
          <HeaderMoreMenu />
        </div>
      </div>
    </header>
  );
}
