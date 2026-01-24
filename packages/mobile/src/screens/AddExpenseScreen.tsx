import React, { useState, useEffect } from 'react';
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
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { ShareType } from '@teilfair/shared';
import { useGroupStore } from '../store/groupStore';
import { useTheme } from '../theme/ThemeProvider';

export function AddExpenseScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { members, group, addExpense, addMember } = useGroupStore();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Payer state
  const [singlePayer, setSinglePayer] = useState<string>('');
  const [showMultiplePayers, setShowMultiplePayers] = useState(false);
  const [multiplePayers, setMultiplePayers] = useState<Record<string, string>>({});
  
  // Split state
  const [showCustomSplit, setShowCustomSplit] = useState(false);
  const [includedMembers, setIncludedMembers] = useState<Set<string>>(new Set());
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  
  // New member
  const [newMemberName, setNewMemberName] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (members.length > 0) {
      setIncludedMembers(new Set(members.map(m => m.id)));
      if (!singlePayer) {
        setSinglePayer(members[0].id);
      }
    }
  }, [members]);

  const handleAddNewMember = async () => {
    if (!newMemberName.trim()) return;
    
    setIsAddingMember(true);
    try {
      const newMember = await addMember(newMemberName.trim());
      setNewMemberName('');
      setIncludedMembers(prev => new Set([...prev, newMember.id]));
      if (!singlePayer) {
        setSinglePayer(newMember.id);
      }
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : t('error.failedToAddMember'));
    } finally {
      setIsAddingMember(false);
    }
  };

  const handlePayerChange = (memberId: string, amount: string) => {
    setMultiplePayers(prev => {
      if (amount === '' || amount === '0') {
        const { [memberId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [memberId]: amount };
    });
  };

  const toggleMemberInSplit = (memberId: string) => {
    setIncludedMembers(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        if (next.size > 1) {
          next.delete(memberId);
        }
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const handleCustomSplitChange = (memberId: string, amount: string) => {
    setCustomSplits(prev => ({ ...prev, [memberId]: amount }));
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate && event.type === 'set') {
      const newDate = new Date(expenseDate);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setExpenseDate(newDate);
    }
  };

  const onTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime && event.type === 'set') {
      const newDate = new Date(expenseDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setExpenseDate(newDate);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSubmit = async () => {
    const amount = parseFloat(totalAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert(t('common.error'), t('validation.enterValidAmount'));
      return;
    }
    
    if (includedMembers.size < 1) {
      Alert.alert(t('common.error'), t('validation.selectAtLeastOnePerson'));
      return;
    }
    
    let payerEntries: Array<{ memberId: string; amount: number }>;
    
    if (showMultiplePayers) {
      payerEntries = Object.entries(multiplePayers)
        .map(([memberId, amt]) => ({ memberId, amount: parseFloat(amt) }))
        .filter(p => !isNaN(p.amount) && p.amount > 0);
      
      if (payerEntries.length === 0) {
        Alert.alert(t('common.error'), t('validation.enterPaymentAmounts'));
        return;
      }
      
      const totalPaid = payerEntries.reduce((sum, p) => sum + p.amount, 0);
      if (Math.abs(totalPaid - amount) > 0.01) {
        Alert.alert(t('common.error'), t('validation.paidAmountsMismatch', { paid: totalPaid.toFixed(2), total: amount.toFixed(2) }));
        return;
      }
    } else {
      if (!singlePayer) {
        Alert.alert(t('common.error'), t('validation.selectWhoPaid'));
        return;
      }
      payerEntries = [{ memberId: singlePayer, amount }];
    }
    
    let splits: Array<{ memberId: string; share: number; shareType: ShareType }>;
    
    if (showCustomSplit) {
      const customEntries = Object.entries(customSplits)
        .map(([memberId, amt]) => ({ memberId, amount: parseFloat(amt) }))
        .filter(s => !isNaN(s.amount) && s.amount > 0);
      
      if (customEntries.length < 1) {
        Alert.alert(t('common.error'), t('validation.enterSplitAmountsShort'));
        return;
      }
      
      const totalSplit = customEntries.reduce((sum, s) => sum + s.amount, 0);
      if (Math.abs(totalSplit - amount) > 0.01) {
        Alert.alert(t('common.error'), t('validation.splitAmountsMismatch', { split: totalSplit.toFixed(2), total: amount.toFixed(2) }));
        return;
      }
      
      splits = customEntries.map(s => ({
        memberId: s.memberId,
        share: s.amount,
        shareType: 'fixed' as ShareType,
      }));
    } else {
      splits = Array.from(includedMembers).map(memberId => ({
        memberId,
        share: 1,
        shareType: 'ratio' as ShareType,
      }));
    }
    
    setLoading(true);
    try {
      await addExpense({
        description: description.trim() || t('expense.defaultDescription'),
        totalAmount: amount,
        date: expenseDate,
        payers: payerEntries,
        splits,
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : t('error.failedToAddExpense'));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: group?.currency || 'EUR',
    }).format(amount);
  };

  const totalPaidMultiple = Object.values(multiplePayers).reduce(
    (sum, amt) => sum + (parseFloat(amt) || 0),
    0
  );

  const totalCustomSplit = Object.values(customSplits).reduce(
    (sum, amt) => sum + (parseFloat(amt) || 0),
    0
  );

  const splitAmount = includedMembers.size > 0 && totalAmount 
    ? parseFloat(totalAmount) / includedMembers.size 
    : 0;

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Description */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.text }]}>{t('expense.descriptionLabel')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
            placeholder={t('expense.descriptionPlaceholder')}
            placeholderTextColor={theme.colors.textSecondary}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Amount */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.text }]}>{t('expense.amountLabel', { currency: group?.currency })}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
            placeholder={t('expense.amountPlaceholder')}
            placeholderTextColor={theme.colors.textSecondary}
            value={totalAmount}
            onChangeText={setTotalAmount}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Date and Time with Native Pickers */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.text }]}>{t('expense.dateTimeLabel')}</Text>
          <View style={styles.dateTimeRow}>
            <TouchableOpacity
              style={[styles.dateTimeButton, { flex: 2, backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{ color: theme.colors.text, fontSize: 16 }}>{formatDate(expenseDate)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dateTimeButton, { flex: 1, backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={{ color: theme.colors.text, fontSize: 16 }}>{formatTime(expenseDate)}</Text>
            </TouchableOpacity>
          </View>
          
          {showDatePicker && (
            <DateTimePicker
              value={expenseDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              themeVariant={isDark ? 'dark' : 'light'}
            />
          )}
          
          {showTimePicker && (
            <DateTimePicker
              value={expenseDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
              themeVariant={isDark ? 'dark' : 'light'}
            />
          )}
        </View>

        {/* Add Member */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.text }]}>{t('member.membersLabel')}</Text>
          {members.length === 0 && (
            <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
              {t('member.addMemberHintSingle')}
            </Text>
          )}
          <View style={styles.addMemberRow}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder={t('member.addNewMemberPlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              value={newMemberName}
              onChangeText={setNewMemberName}
              onSubmitEditing={handleAddNewMember}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.colors.surfaceTonal.a10 }]}
              onPress={handleAddNewMember}
              disabled={isAddingMember || !newMemberName.trim()}
            >
              <Text style={{ color: theme.colors.text, fontWeight: '600' }}>
                {isAddingMember ? '...' : t('member.addMember')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payer */}
        {members.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.text }]}>{t('expense.whoPaidLabel')}</Text>
            
            {!showMultiplePayers ? (
              <>
                <View style={styles.payerList}>
                  {members.map(member => (
                    <TouchableOpacity
                      key={member.id}
                      style={[
                        styles.payerOption,
                        { 
                          backgroundColor: theme.colors.card, 
                          borderColor: singlePayer === member.id ? theme.colors.primary.a0 : theme.colors.border,
                          borderWidth: singlePayer === member.id ? 2 : 1,
                        }
                      ]}
                      onPress={() => setSinglePayer(member.id)}
                    >
                      <View style={[
                        styles.radio,
                        { borderColor: singlePayer === member.id ? theme.colors.primary.a0 : theme.colors.border }
                      ]}>
                        {singlePayer === member.id && (
                          <View style={[styles.radioInner, { backgroundColor: theme.colors.primary.a0 }]} />
                        )}
                      </View>
                      <Text style={{ color: theme.colors.text, fontWeight: '500' }}>{member.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.advancedToggle}
                  onPress={() => setShowMultiplePayers(true)}
                >
                  <Text style={[styles.advancedText, { color: theme.colors.textSecondary }]}>
                    {t('expense.useMultiplePayers')}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
                  {t('expense.totalEntered')} {formatCurrency(totalPaidMultiple)} / {formatCurrency(parseFloat(totalAmount) || 0)}
                </Text>
                {members.map(member => (
                  <View key={member.id} style={styles.payerRow}>
                    <Text style={[styles.memberName, { color: theme.colors.text }]}>{member.name}</Text>
                    <TextInput
                      style={[styles.amountInput, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                      placeholder={t('expense.amountPlaceholder')}
                      placeholderTextColor={theme.colors.textSecondary}
                      value={multiplePayers[member.id] || ''}
                      onChangeText={(v) => handlePayerChange(member.id, v)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.advancedToggle}
                  onPress={() => {
                    setShowMultiplePayers(false);
                    setMultiplePayers({});
                  }}
                >
                  <Text style={[styles.advancedText, { color: theme.colors.primary.a0 }]}>
                    {t('expense.useSinglePayer')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Split */}
        {members.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              {t('expense.splitBetweenCount', { count: includedMembers.size, unit: includedMembers.size === 1 ? t('expense.person') : t('expense.people') })}
            </Text>
            
            {!showCustomSplit ? (
              <>
                {members.map(member => (
                  <TouchableOpacity
                    key={member.id}
                    style={[
                      styles.splitOption,
                      { 
                        backgroundColor: theme.colors.card, 
                        borderColor: includedMembers.has(member.id) ? theme.colors.primary.a0 : theme.colors.border,
                        borderWidth: includedMembers.has(member.id) ? 2 : 1,
                      }
                    ]}
                    onPress={() => toggleMemberInSplit(member.id)}
                  >
                    <View style={[
                      styles.checkbox,
                      { 
                        borderColor: includedMembers.has(member.id) ? theme.colors.primary.a0 : theme.colors.border,
                        backgroundColor: includedMembers.has(member.id) ? theme.colors.primary.a0 : 'transparent',
                      }
                    ]}>
                      {includedMembers.has(member.id) && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                    <Text style={{ flex: 1, color: theme.colors.text, fontWeight: '500' }}>{member.name}</Text>
                    {includedMembers.has(member.id) && totalAmount && (
                      <Text style={{ color: theme.colors.textSecondary }}>
                        {formatCurrency(splitAmount)}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.advancedToggle}
                  onPress={() => setShowCustomSplit(true)}
                >
                  <Text style={[styles.advancedText, { color: theme.colors.textSecondary }]}>
                    {t('expense.useCustomSplit')}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
                  {t('expense.totalEntered')} {formatCurrency(totalCustomSplit)} / {formatCurrency(parseFloat(totalAmount) || 0)}
                </Text>
                {members.map(member => (
                  <View key={member.id} style={styles.payerRow}>
                    <Text style={[styles.memberName, { color: theme.colors.text }]}>{member.name}</Text>
                    <TextInput
                      style={[styles.amountInput, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                      placeholder={t('expense.amountPlaceholder')}
                      placeholderTextColor={theme.colors.textSecondary}
                      value={customSplits[member.id] || ''}
                      onChangeText={(v) => handleCustomSplitChange(member.id, v)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.advancedToggle}
                  onPress={() => {
                    setShowCustomSplit(false);
                    setCustomSplits({});
                  }}
                >
                  <Text style={[styles.advancedText, { color: theme.colors.primary.a0 }]}>
                    {t('expense.useEqualSplit')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Fixed Footer */}
      <View style={[
        styles.footer, 
        { 
          backgroundColor: theme.colors.card, 
          borderTopColor: theme.colors.border,
          paddingBottom: insets.bottom + 16,
        }
      ]}>
        <TouchableOpacity
          style={[styles.footerButton, { backgroundColor: theme.colors.surfaceTonal.a10 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 16 }}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.footerButton, 
            { backgroundColor: theme.colors.primary.a0 },
            (loading || members.length < 1) && { opacity: 0.5 }
          ]}
          onPress={handleSubmit}
          disabled={loading || members.length < 1}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
            {loading ? t('expense.adding') : t('expense.addExpense')}
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
    fontWeight: '600',
    marginBottom: 12,
  },
  hint: {
    fontSize: 14,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  addMemberRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addButton: {
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
  },
  payerList: {
    gap: 8,
    marginBottom: 8,
  },
  payerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  payerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  memberName: {
    flex: 1,
    fontSize: 16,
  },
  amountInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    width: 110,
    textAlign: 'right',
  },
  splitOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  advancedToggle: {
    paddingVertical: 12,
  },
  advancedText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
});
