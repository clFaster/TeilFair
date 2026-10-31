import { useRef, type KeyboardEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { tabId, tabPanelId } from './tabIds';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon: IconDefinition;
  testId?: string;
}

interface TabListProps<T extends string> {
  tabs: ReadonlyArray<TabItem<T>>;
  active: T;
  onChange: (tab: T) => void;
  /** Prefix for tab / panel ids: tabs are `${idPrefix}-tab-${id}`, panels `${idPrefix}-panel-${id}`. */
  idPrefix: string;
  label?: string;
  className?: string;
  tabClassName?: string;
}

/**
 * WAI-ARIA tablist with roving tabindex: arrow keys / Home / End move
 * between tabs and activate them (automatic activation).
 */
export function TabList<T extends string>({
  tabs,
  active,
  onChange,
  idPrefix,
  label,
  className,
  tabClassName,
}: Readonly<TabListProps<T>>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabs.length - 1;
    let next: number | null = null;
    if (event.key === 'ArrowRight') next = index === last ? 0 : index + 1;
    else if (event.key === 'ArrowLeft') next = index === 0 ? last : index - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    if (next === null) return;

    event.preventDefault();
    // The page owner decides where the page scrolls on a tab change (see GroupPage).
    refs.current[next]?.focus({ preventScroll: true });
    onChange(tabs[next].id);
  };

  return (
    <div role="tablist" aria-label={label} aria-orientation="horizontal" className={className}>
      {tabs.map((tab, index) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={tabId(idPrefix, tab.id)}
            aria-selected={selected}
            aria-controls={selected ? tabPanelId(idPrefix, tab.id) : undefined}
            tabIndex={selected ? 0 : -1}
            className={[tabClassName, selected ? 'active' : ''].filter(Boolean).join(' ')}
            data-testid={tab.testId}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <FontAwesomeIcon icon={tab.icon} className="tab-icon" aria-hidden="true" />
            <span className="tab-label">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
