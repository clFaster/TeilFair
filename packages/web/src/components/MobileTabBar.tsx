import { useTranslation } from 'react-i18next';
import { TabList, type TabItem } from './TabList';

interface MobileTabBarProps<T extends string> {
  active: T;
  onChange: (tab: T) => void;
  tabs: ReadonlyArray<TabItem<T>>;
  idPrefix: string;
}

/** Fixed bottom navigation for phones and tablets (< 1024px). */
export function MobileTabBar<T extends string>({ active, onChange, tabs, idPrefix }: Readonly<MobileTabBarProps<T>>) {
  const { t } = useTranslation();
  const label = t('accessibility.mainNavigation');

  return (
    <nav className="mobile-tabbar" aria-label={label}>
      <TabList
        tabs={tabs}
        active={active}
        onChange={onChange}
        idPrefix={idPrefix}
        label={label}
        className="mobile-tabbar-list"
        tabClassName="mobile-tab"
      />
    </nav>
  );
}
