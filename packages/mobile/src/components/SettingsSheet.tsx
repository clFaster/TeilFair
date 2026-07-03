import { Modal, Pressable, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
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

          <View style={[styles.list, { borderColor: theme.colors.border }]}>
            {[
              ['en', 'English'],
              ['de', 'Deutsch'],
            ].map(([code, label]) => {
              const active = i18n.language === code;
              return (
                <TouchableOpacity
                  key={code}
                  style={[styles.row, { borderBottomColor: theme.colors.border }]}
                  onPress={() => changeLanguage(code)}
                >
                  <View style={[styles.rowIcon, { backgroundColor: theme.colors.surfaceTonal.a10 }]}>
                    <MobileIcon name="globe" color={theme.colors.primary.a0} size={18} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={[styles.rowLabel, { color: theme.colors.text }]}>{label}</Text>
                    <Text style={[styles.rowDescription, { color: theme.colors.textSecondary }]}>
                      {t('accessibility.languageSelector')}
                    </Text>
                  </View>
                  {active && <MobileIcon name="check" color={theme.colors.primary.a0} size={19} strokeWidth={2.5} />}
                </TouchableOpacity>
              );
            })}

            <View style={[styles.row, styles.lastRow]}>
              <View style={[styles.rowIcon, { backgroundColor: theme.colors.surfaceTonal.a10 }]}>
                <MobileIcon name={mode === 'dark' ? 'moon' : 'sun'} color={theme.colors.accent.a0} size={18} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: theme.colors.text }]}>{t('theme.dark')}</Text>
                <Text style={[styles.rowDescription, { color: theme.colors.textSecondary }]}>
                  {t('settings.appearance')}
                </Text>
              </View>
              <Switch
                value={mode === 'dark'}
                onValueChange={(enabled) => selectTheme(enabled ? 'dark' : 'light')}
                trackColor={{ false: theme.colors.surfaceTonal.a20, true: theme.colors.primary.a20 }}
                thumbColor={mode === 'dark' ? theme.colors.primary.a0 : '#fff'}
              />
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
  list: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 64,
    borderBottomWidth: 1,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  rowDescription: {
    fontSize: 12,
    marginTop: 2,
  },
});
