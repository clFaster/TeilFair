import { useEffect, useId, useRef, useState, type FocusEvent } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';

const LEGAL_LINKS = [
  { to: '/privacy', key: 'footer.privacy' },
  { to: '/imprint', key: 'footer.imprint' },
] as const;

/**
 * "More" disclosure in the header with the legal links. CSS shows it only where
 * the footer is hidden (phones, and the group page below 1024px).
 */
export function HeaderMoreMenu() {
  const { t } = useTranslation();
  const location = useLocation();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Open for one location only: any navigation closes the menu without an effect.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === location.key;
  const close = () => setOpenAt(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenAt(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing) return;
      event.stopPropagation();
      setOpenAt(null);
      buttonRef.current?.focus();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // Tabbing past the last link (or Shift+Tab before the button) closes the menu.
  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (next && !event.currentTarget.contains(next)) close();
  };

  return (
    <div className="header-more" ref={rootRef} onBlur={handleBlur}>
      <button
        ref={buttonRef}
        type="button"
        className="app-header-icon header-more-button"
        aria-label={t('accessibility.moreMenu')}
        title={t('accessibility.moreMenu')}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpenAt(open ? null : location.key)}
      >
        <FontAwesomeIcon icon={faEllipsisVertical} aria-hidden="true" />
      </button>

      <nav id={menuId} className="header-menu" aria-label={t('footer.legalNavigation')} hidden={!open}>
        <ul className="header-menu-list">
          {LEGAL_LINKS.map(({ to, key }) => (
            <li key={to}>
              <NavLink to={to} className="header-menu-link" onClick={close}>
                {t(key)}
              </NavLink>
            </li>
          ))}
        </ul>
        <p className="header-menu-caption">
          {t('common.appName')}
          <span aria-hidden="true"> &middot; </span>
          {t('common.tagline')}
        </p>
      </nav>
    </div>
  );
}
