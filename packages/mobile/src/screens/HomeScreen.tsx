import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RecentGroup } from '@teilfair/shared';
import { useGroupStore } from '../store/groupStore';
import { useTheme } from '../theme/ThemeProvider';
import { LogoIcon } from '../components/LogoIcon';
import { MobileIcon } from '../components/MobileIcon';
import { SettingsSheet } from '../components/SettingsSheet';
import type { RootStackParamList } from '../../App';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;
type HomeMode = 'create' | 'join';

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY'];

export function HomeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { createGroup, loadGroup, recentGroups, removeFromRecent, loading } = useGroupStore();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<HomeMode>('create');
  const [groupName, setGroupName] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [joinLink, setJoinLink] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert(t('common.error'), t('validation.enterGroupName'));
      return;
    }

    try {
      const group = await createGroup(groupName.trim(), currency);
      navigation.navigate('Group', {
        groupId: group.id,
        token: group.writeToken,
      });
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : t('error.failedToCreate'));
    }
  };

  const handleJoinGroup = async () => {
    try {
      const url = new URL(joinLink);
      const pathMatch = url.pathname.match(/\/g\/([a-f0-9-]+)/i);
      const token = url.searchParams.get('t');

      if (!pathMatch || !token) {
        Alert.alert(t('common.error'), t('error.invalidLink'));
        return;
      }

      const groupId = pathMatch[1];
      const success = await loadGroup(groupId, token);

      if (success) {
        navigation.navigate('Group', { groupId, token });
      } else {
        Alert.alert(t('common.error'), t('error.failedToJoin'));
      }
    } catch {
      Alert.alert(t('common.error'), t('error.invalidLinkFormat'));
    }
  };

  const handleOpenRecent = async (groupId: string, token: string) => {
    const success = await loadGroup(groupId, token);
    if (success) {
      navigation.navigate('Group', { groupId, token });
    } else {
      removeFromRecent(groupId);
      Alert.alert(t('common.error'), t('error.groupNoLongerAccessible'));
    }
  };

  const formatLastAccessed = (lastAccessed: number) => {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
    }).format(new Date(lastAccessed));
  };

  const formatCurrency = (amount?: number, currencyCode = 'EUR') => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(amount ?? 0);
  };

  const handleShareRecent = (item: RecentGroup) => {
    const url = `https://teilfair.app/g/${item.id}?t=${item.token}`;
    const message = t('share.shareMessageDefault', { groupName: item.name, url });

    Alert.alert(t('share.sharePromptTitle'), url, [
      {
        text: t('common.copy'),
        onPress: async () => {
          await Clipboard.setStringAsync(url);
          Alert.alert(t('common.copied'), url);
        },
      },
      {
        text: t('common.share'),
        onPress: async () => {
          try {
            await Share.share({ message });
          } catch {
            // User cancelled.
          }
        },
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const primaryAction = mode === 'create' ? handleCreateGroup : handleJoinGroup;
  const primaryLabel = mode === 'create'
    ? loading ? t('home.creating') : t('home.createButton')
    : loading ? t('home.joining') : t('home.joinButton');

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.appHeader, { paddingTop: insets.top + 12, borderBottomColor: theme.colors.border }]}>
        <View style={styles.brandRow}>
          <LogoIcon size={36} />
          <View>
            <Text style={[styles.appTitle, { color: theme.colors.text }]}>{t('common.appName')}</Text>
            <Text style={[styles.appSubtitle, { color: theme.colors.textSecondary }]}>{t('common.tagline')}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.headerIconButton, { backgroundColor: theme.colors.surfaceTonal.a10 }]}
          onPress={() => setShowSettings(true)}
          accessibilityLabel={t('settings.title')}
        >
          <MobileIcon name="settings" color={theme.colors.text} size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.sectionHeader}>
          <Text style={[styles.screenTitle, { color: theme.colors.text }]}>{t('home.recentGroupsTitle')}</Text>
          <Text style={[styles.screenMeta, { color: theme.colors.textSecondary }]}>
            {recentGroups.length > 0 ? `${recentGroups.length}` : ''}
          </Text>
        </View>

        {recentGroups.length > 0 ? (
          <View style={[styles.listPanel, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            {recentGroups.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.recentRow,
                  index < recentGroups.length - 1 && { borderBottomColor: theme.colors.border, borderBottomWidth: 1 },
                ]}
              >
                <TouchableOpacity
                  style={styles.recentMain}
                  onPress={() => handleOpenRecent(item.id, item.token)}
                  activeOpacity={0.72}
                >
                  <View style={[styles.avatar, { backgroundColor: theme.colors.primary.a0 }]}>
                    <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.recentText}>
                    <Text style={[styles.recentName, { color: theme.colors.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.recentMeta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      {formatLastAccessed(item.lastAccessed)} · {item.memberCount ?? 0} {t('group.tabMembers').toLowerCase()} · {formatCurrency(item.totalExpenses, item.currency)}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.rowIconButton, { backgroundColor: theme.colors.surfaceTonal.a10 }]}
                  onPress={() => handleShareRecent(item)}
                  accessibilityLabel={t('common.share')}
                >
                  <MobileIcon name="share" color={theme.colors.text} size={18} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyPanel, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surfaceTonal.a10 }]}>
              <MobileIcon name="users" color={theme.colors.primary.a0} size={22} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{t('home.createGroup')}</Text>
            <Text style={[styles.emptyCopy, { color: theme.colors.textSecondary }]}>
              {t('home.heroSubtitle')}
            </Text>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={[styles.screenTitle, { color: theme.colors.text }]}>{t('common.add')}</Text>
        </View>

        <View style={[styles.actionPanel, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={[styles.segmented, { backgroundColor: theme.colors.surfaceTonal.a10 }]}>
            {[
              ['create', t('home.createGroup'), 'plus'],
              ['join', t('home.joinGroup'), 'open'],
            ].map(([value, label, icon]) => {
              const active = mode === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.segment, active && { backgroundColor: theme.colors.primary.a0 }]}
                  onPress={() => setMode(value as HomeMode)}
                >
                  <MobileIcon name={icon as 'plus' | 'open'} color={active ? '#fff' : theme.colors.text} size={16} />
                  <Text style={[styles.segmentText, { color: active ? '#fff' : theme.colors.text }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {mode === 'create' ? (
            <>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                placeholder={t('home.groupNamePlaceholder')}
                placeholderTextColor={theme.colors.textSecondary}
                value={groupName}
                onChangeText={setGroupName}
                returnKeyType="done"
                onSubmitEditing={handleCreateGroup}
              />
              <View style={styles.currencyRow}>
                {CURRENCIES.map((item) => {
                  const active = currency === item;
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[
                        styles.currencyChip,
                        {
                          backgroundColor: active ? theme.colors.primary.a0 : theme.colors.surfaceTonal.a10,
                          borderColor: active ? theme.colors.primary.a0 : theme.colors.border,
                        },
                      ]}
                      onPress={() => setCurrency(item)}
                    >
                      <Text style={[styles.currencyText, { color: active ? '#fff' : theme.colors.text }]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : (
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder={t('home.linkPlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              value={joinLink}
              onChangeText={setJoinLink}
              autoCapitalize="none"
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={handleJoinGroup}
            />
          )}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12, backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.primaryAction, { backgroundColor: theme.colors.primary.a0 }, loading && { opacity: 0.6 }]}
          onPress={primaryAction}
          disabled={loading}
        >
          <MobileIcon name={mode === 'create' ? 'plus' : 'open'} color="#fff" size={19} />
          <Text style={styles.primaryActionText}>{primaryLabel}</Text>
        </TouchableOpacity>
      </View>

      <SettingsSheet visible={showSettings} onClose={() => setShowSettings(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  appSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  screenMeta: {
    fontSize: 14,
    fontWeight: '700',
  },
  listPanel: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  recentMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  recentText: {
    flex: 1,
  },
  recentName: {
    fontSize: 16,
    fontWeight: '700',
  },
  recentMeta: {
    fontSize: 12,
    marginTop: 3,
  },
  rowIconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPanel: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptyCopy: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  actionPanel: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 14,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 15,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '800',
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
  },
  currencyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currencyChip: {
    minWidth: 58,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  currencyText: {
    fontSize: 13,
    fontWeight: '800',
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  primaryAction: {
    minHeight: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
