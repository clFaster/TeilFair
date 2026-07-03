import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useGroupStore } from '../store/groupStore';
import { useTheme } from '../theme/ThemeProvider';

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK'];

export function EditGroupScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { group, updateGroup } = useGroupStore();

  const [name, setName] = useState(group?.name ?? '');
  const [currency, setCurrency] = useState(group?.currency ?? 'EUR');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('validation.enterGroupName'));
      return;
    }

    setLoading(true);
    try {
      await updateGroup({ name: name.trim(), currency });
      navigation.goBack();
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : t('error.generic'));
    } finally {
      setLoading(false);
    }
  };

  if (!group) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.text }}>{t('error.groupNotFound')}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 104 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.text }]}>{t('home.groupNameLabel')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
            placeholder={t('home.groupNamePlaceholder')}
            placeholderTextColor={theme.colors.textSecondary}
            value={name}
            onChangeText={setName}
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.text }]}>{t('home.currencyLabel')}</Text>
          <View style={styles.currencyGrid}>
            {CURRENCIES.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.currencyButton,
                  {
                    backgroundColor: currency === item ? theme.colors.primary.a0 : theme.colors.card,
                    borderColor: currency === item ? theme.colors.primary.a0 : theme.colors.border,
                  },
                ]}
                onPress={() => setCurrency(item)}
              >
                <Text style={[styles.currencyText, { color: currency === item ? '#fff' : theme.colors.text }]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border, paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.footerButton, { backgroundColor: theme.colors.surfaceTonal.a10 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.footerButtonText, { color: theme.colors.text }]}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.footerButton, { backgroundColor: theme.colors.primary.a0 }, loading && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={[styles.footerButtonText, { color: '#fff' }]}>
            {loading ? t('expense.saving') : t('common.save')}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  currencyButton: {
    minWidth: 76,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  currencyText: {
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
