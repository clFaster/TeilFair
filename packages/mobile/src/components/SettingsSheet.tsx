import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeProvider';
import { MobileIcon } from './MobileIcon';

interface SettingsSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function SettingsSheet({ visible, onClose }: SettingsSheetProps) {
  const { t, i18n } = useTranslation();
  const { theme, mode, setThemePreference } = useTheme();

  const changeLanguage = async (language: string) => {
    await i18n.changeLanguage(language);
    await AsyncStorage.setItem('language', language);
  };

  const selectTheme = async (nextMode: 'light' | 'dark') => {
    await setThemePreference(nextMode);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: theme.colors.primary.a0 }]}>
              <MobileIcon name="settings" color="#fff" size={20} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={[styles.title, { color: theme.colors.text }]}>{t('settings.title')}</Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                {t('settings.subtitle')}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: theme.colors.surfaceTonal.a10 }]}
              onPress={onClose}
            >
              <MobileIcon name="close" color={theme.colors.text} size={18} />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MobileIcon name="globe" color={theme.colors.primary.a0} size={18} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                {t('accessibility.languageSelector')}
              </Text>
            </View>
            <View style={[styles.segmented, { backgroundColor: theme.colors.surfaceTonal.a10 }]}>
              {[
                ['en', 'English'],
                ['de', 'Deutsch'],
              ].map(([code, label]) => {
                const active = i18n.language === code;
                return (
                  <TouchableOpacity
                    key={code}
                    style={[styles.segment, active && { backgroundColor: theme.colors.primary.a0 }]}
                    onPress={() => changeLanguage(code)}
                  >
                    <Text style={[styles.segmentText, { color: active ? '#fff' : theme.colors.text }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MobileIcon name={mode === 'dark' ? 'moon' : 'sun'} color={theme.colors.accent.a0} size={18} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                {t('settings.appearance')}
              </Text>
            </View>
            <View style={[styles.segmented, { backgroundColor: theme.colors.surfaceTonal.a10 }]}>
              {[
                ['light', t('theme.light'), 'sun'],
                ['dark', t('theme.dark'), 'moon'],
              ].map(([value, label, icon]) => {
                const active = mode === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[styles.segment, styles.iconSegment, active && { backgroundColor: theme.colors.primary.a0 }]}
                    onPress={() => selectTheme(value as 'light' | 'dark')}
                  >
                    <MobileIcon
                      name={icon as 'sun' | 'moon'}
                      color={active ? '#fff' : theme.colors.text}
                      size={16}
                    />
                    <Text style={[styles.segmentText, { color: active ? '#fff' : theme.colors.text }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(3, 9, 8, 0.42)',
    padding: 14,
  },
  sheet: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    gap: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: 13,
    paddingHorizontal: 10,
  },
  iconSegment: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
