import {
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, type IconDefinition } from '@fortawesome/free-solid-svg-icons';

export interface ModalProps {
  title: ReactNode;
  titleId?: string;
  icon?: IconDefinition;
  onClose: () => void;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  role?: 'dialog' | 'alertdialog';
  describedBy?: string;
  /** Put on the overlay (full-screen backdrop) element. */
  testId?: string;
  /** Element to focus on open. Defaults to the dialog panel itself. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Extra class on the dialog panel. */
  className?: string;
  /**
   * Keep the app header (language / theme controls) visible and usable:
   * the backdrop starts below it instead of covering the whole viewport.
   */
  belowHeader?: boolean;
  children: ReactNode;
}

const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/*
 * Stack of open modals (innermost last). Only the top-most modal reacts to
 * Escape / Tab, so a ConfirmDialog opened over another dialog closes alone.
 */
const modalStack: symbol[] = [];
let scrollLock: { overflow: string; paddingRight: string } | null = null;

function lockScroll() {
  if (scrollLock) return;
  const { body, documentElement } = document;
  const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
  scrollLock = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
  body.style.overflow = 'hidden';
  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${scrollbarWidth}px`;
  }
}

function unlockScroll() {
  if (!scrollLock) return;
  document.body.style.overflow = scrollLock.overflow;
  document.body.style.paddingRight = scrollLock.paddingRight;
  scrollLock = null;
}

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getClientRects().length > 0 && !el.closest('[inert]')
  );
}

/**
 * Accessible dialog primitive: portal-rendered, labelled, Escape / backdrop
 * close, focus moves in, cycles inside and returns on close, page scroll is
 * locked while open. Bottom sheet on phones, centered card from 640px.
 */
export function Modal({
  title,
  titleId,
  icon,
  onClose,
  footer,
  size = 'md',
  role = 'dialog',
  describedBy,
  testId,
  initialFocusRef,
  className,
  belowHeader = false,
  children,
}: Readonly<ModalProps>) {
  const { t } = useTranslation();
  const generatedId = useId();
  const headingId = titleId ?? `modal-title-${generatedId}`;
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const pointerDownOnBackdrop = useRef(false);
  // Captured while rendering: an autoFocus field inside the dialog takes focus
  // during commit, before the mount effect could record the trigger.
  const [returnFocusTo] = useState(() =>
    document.activeElement instanceof HTMLElement ? document.activeElement : null
  );

  // Keep the latest callback without re-running the mount effect (callers
  // often pass inline arrow functions).
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const token = Symbol('modal');
    const panel = panelRef.current;
    const previouslyFocused = returnFocusTo;
    const isTop = () => modalStack[modalStack.length - 1] === token;

    modalStack.push(token);
    lockScroll();

    // Respect autoFocus inside the content; otherwise use the requested
    // element, falling back to the panel (avoids popping the phone keyboard).
    if (panel && !panel.contains(document.activeElement)) {
      (initialFocusRef?.current ?? panel).focus({ preventScroll: true });
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTop() || !panel) return;

      if (event.key === 'Escape') {
        if (event.isComposing) return;
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = getFocusable(panel);
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const outside = !panel.contains(active);

      if (event.shiftKey && (active === first || active === panel || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const index = modalStack.indexOf(token);
      if (index !== -1) modalStack.splice(index, 1);
      if (modalStack.length === 0) unlockScroll();
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
    // Mount/unmount only: focus handling must not re-run on re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close only when both press and release happen on the backdrop, so a text
  // selection that ends outside the panel does not dismiss the dialog.
  const handleBackdropMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    pointerDownOnBackdrop.current = event.target === event.currentTarget;
  };

  const handleBackdropClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (pointerDownOnBackdrop.current && event.target === event.currentTarget) {
      onCloseRef.current();
    }
    pointerDownOnBackdrop.current = false;
  };

  const panelClassName = ['modal', `modal-${size}`, className].filter(Boolean).join(' ');

  return createPortal(
    <div
      className={belowHeader ? 'modal-overlay modal-overlay-below-header' : 'modal-overlay'}
      data-testid={testId}
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div
        ref={panelRef}
        className={panelClassName}
        role={role}
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={describedBy}
        tabIndex={-1}
      >
        <div className="modal-handle" aria-hidden="true" />
        <div className="modal-header">
          <h2 id={headingId} className="modal-title">
            {icon && (
              <span className="modal-title-icon" aria-hidden="true">
                <FontAwesomeIcon icon={icon} />
              </span>
            )}
            <span className="modal-title-text">{title}</span>
          </h2>
          <button
            type="button"
            className="btn-close modal-close"
            onClick={() => onCloseRef.current()}
            aria-label={t('common.close')}
            title={t('accessibility.closeDialog')}
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
