import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { calculateSplitAmounts } from '@teilfair/shared';
import { useGroupStore } from '../store/groupStore';
import { useTheme } from '../theme/ThemeProvider';
import type { RootStackParamList } from '../../App';

type ExpenseDetailsRouteProp = RouteProp<RootStackParamList, 'ExpenseDetails'>;
type ExpenseDetailsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ExpenseDetails'>;

export function ExpenseDetailsScreen() {
  const { t } = useTranslation();
  const route = useRoute<ExpenseDetailsRouteProp>();
  const navigation = useNavigation<ExpenseDetailsNavigationProp>();
  const { expenseId } = route.params;
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const {
    group,
    members,
    expenses,
    permission,
    deleteExpense,
  } = useGroupStore();

  const expense = expenses.find((item) => item.id === expenseId);
  const canWrite = permission === 'write';

  const getMemberName = (memberId: string) => {
    return members.find((member) => member.id === memberId)?.name || t('common.unknown');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: group?.currency || 'EUR',
    }).format(amount);
  };

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const handleDeleteExpense = () => {
    if (!expense) return;

    Alert.alert(
      t('expense.confirmDeleteTitle'),
      t('expense.confirmDelete'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpense(expense.id);
              navigation.goBack();
            } catch (err) {
              Alert.alert(t('common.error'), err instanceof Error ? err.message : t('error.generic'));
            }
          },
        },
      ],
    );
  };

  if (!expense) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.text }}>{t('error.expenseNotFound')}</Text>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.colors.primary.a0, marginTop: 16 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.primaryButtonText}>{t('common.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const memberOrder = new Map(members.map((member, index) => [member.id, index]));
  const splitAmounts = calculateSplitAmounts(expense.totalAmount, expense.splits);
  const splitDetails = Array.from(splitAmounts.entries()).sort(
    ([leftId], [rightId]) => (memberOrder.get(leftId) ?? 999) - (memberOrder.get(rightId) ?? 999),
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 104 }]}
      >
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.description, { color: theme.colors.text }]}>
            {expense.description || t('expense.defaultDescription')}
          </Text>
          <Text style={[styles.amount, { color: theme.colors.primary.a0 }]}>
            {formatCurrency(expense.totalAmount)}
          </Text>
          <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
            {formatDateTime(expense.date)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('expense.whoPaidLabel')}</Text>
          {expense.payers.map((payer) => (
            <View
              key={payer.memberId}
              style={[styles.detailRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            >
              <Text style={[styles.detailName, { color: theme.colors.text }]}>{getMemberName(payer.memberId)}</Text>
              <Text style={[styles.detailAmount, { color: theme.colors.text }]}>{formatCurrency(payer.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('expense.splitBetweenLabel')}</Text>
          {splitDetails.map(([memberId, amount]) => (
            <View
              key={memberId}
              style={[styles.detailRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            >
              <Text style={[styles.detailName, { color: theme.colors.text }]}>{getMemberName(memberId)}</Text>
              <Text style={[styles.detailAmount, { color: theme.colors.text }]}>{formatCurrency(amount)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border, paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.footerButton, { backgroundColor: theme.colors.surfaceTonal.a10 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>{t('common.close')}</Text>
        </TouchableOpacity>

        {canWrite && (
          <>
            <TouchableOpacity
              style={[styles.footerButton, { backgroundColor: theme.colors.surfaceTonal.a10 }]}
              onPress={() => navigation.navigate('EditExpense', { expenseId: expense.id })}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>{t('common.edit')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerButton, { backgroundColor: theme.colors.danger.a20 }]}
              onPress={handleDeleteExpense}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.colors.danger.a0 }]}>{t('common.delete')}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
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
  summaryCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 18,
    marginBottom: 24,
  },
  description: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  amount: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  detailRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  detailAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButton: {
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
