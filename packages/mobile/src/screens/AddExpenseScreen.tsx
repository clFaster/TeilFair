import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { ShareType } from '@teilfair/shared';
import { useGroupStore } from '../store/groupStore';
import { useTheme } from '../theme/ThemeProvider';

export function AddExpenseScreen() {
  const navigation = useNavigation();
  const { members, group, addExpense } = useGroupStore();
  const { theme } = useTheme();
  
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [payers, setPayers] = useState<Record<string, string>>({});
  const [includedMembers, setIncludedMembers] = useState<Set<string>>(
    new Set(members.map(m => m.id))
  );
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handlePayerChange = (memberId: string, amount: string) => {
    setPayers(prev => {
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
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const handleCustomSplitChange = (memberId: string, amount: string) => {
    setCustomSplits(prev => ({ ...prev, [memberId]: amount }));
  };

  const handleSubmit = async () => {
    const amount = parseFloat(totalAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    
    const payerEntries = Object.entries(payers)
      .map(([memberId, amt]) => ({ memberId, amount: parseFloat(amt) }))
      .filter(p => !isNaN(p.amount) && p.amount > 0);
    
    if (payerEntries.length === 0) {
      Alert.alert('Error', 'Please select at least one payer');
      return;
    }
    
    const totalPaid = payerEntries.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(totalPaid - amount) > 0.01) {
      Alert.alert('Error', `Paid amounts (${totalPaid.toFixed(2)}) don't match total (${amount.toFixed(2)})`);
      return;
    }
    
    let splits: Array<{ memberId: string; share: number; shareType: ShareType }>;
    
    if (splitType === 'equal') {
      if (includedMembers.size < 1) {
        Alert.alert('Error', 'Please include at least one person in the split');
        return;
      }
      splits = Array.from(includedMembers).map(memberId => ({
        memberId,
        share: 1,
        shareType: 'ratio' as ShareType,
      }));
    } else {
      const customEntries = Object.entries(customSplits)
        .map(([memberId, amt]) => ({ memberId, amount: parseFloat(amt) }))
        .filter(s => !isNaN(s.amount) && s.amount > 0);
      
      if (customEntries.length < 1) {
        Alert.alert('Error', 'Please enter split amounts for at least one person');
        return;
      }
      
      const totalSplit = customEntries.reduce((sum, s) => sum + s.amount, 0);
      if (Math.abs(totalSplit - amount) > 0.01) {
        Alert.alert('Error', `Split amounts (${totalSplit.toFixed(2)}) don't match total (${amount.toFixed(2)})`);
        return;
      }
      
      splits = customEntries.map(s => ({
        memberId: s.memberId,
        share: s.amount,
        shareType: 'fixed' as ShareType,
      }));
    }
    
    setLoading(true);
    try {
      await addExpense({
        description: description.trim() || 'Expense',
        totalAmount: amount,
        date: new Date(),
        payers: payerEntries,
        splits,
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add expense');
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

  const totalPaid = Object.values(payers).reduce(
    (sum, amt) => sum + (parseFloat(amt) || 0),
    0
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.surface.a0 }]}>
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Description</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.surfaceTonal.a0, borderColor: theme.colors.border, color: theme.colors.text }]}
          placeholder="e.g., Dinner, Taxi, Hotel"
          placeholderTextColor={theme.colors.textSecondary}
          value={description}
          onChangeText={setDescription}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Total Amount ({group?.currency})</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.surfaceTonal.a0, borderColor: theme.colors.border, color: theme.colors.text }]}
          placeholder="0.00"
          placeholderTextColor={theme.colors.textSecondary}
          value={totalAmount}
          onChangeText={setTotalAmount}
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Who paid?</Text>
        <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
          Total: {formatCurrency(totalPaid)} / {formatCurrency(parseFloat(totalAmount) || 0)}
        </Text>
        {members.map(member => (
          <View key={member.id} style={styles.payerRow}>
            <Text style={[styles.memberName, { color: theme.colors.text }]}>{member.name}</Text>
            <TextInput
              style={[styles.amountInput, { backgroundColor: theme.colors.surfaceTonal.a0, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="0.00"
              placeholderTextColor={theme.colors.textSecondary}
              value={payers[member.id] || ''}
              onChangeText={(v) => handlePayerChange(member.id, v)}
              keyboardType="decimal-pad"
            />
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Split type</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.typeButton, { backgroundColor: theme.colors.surfaceTonal.a10 }, splitType === 'equal' && { backgroundColor: theme.colors.primary.a0 }]}
            onPress={() => setSplitType('equal')}
          >
            <Text style={[styles.typeButtonText, { color: theme.colors.text }, splitType === 'equal' && { color: theme.colors.light }]}>
              Equal
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, { backgroundColor: theme.colors.surfaceTonal.a10 }, splitType === 'custom' && { backgroundColor: theme.colors.primary.a0 }]}
            onPress={() => setSplitType('custom')}
          >
            <Text style={[styles.typeButtonText, { color: theme.colors.text }, splitType === 'custom' && { color: theme.colors.light }]}>
              Custom
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {splitType === 'equal' && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Split between ({includedMembers.size} people)</Text>
          {members.map(member => (
            <TouchableOpacity
              key={member.id}
              style={styles.checkboxRow}
              onPress={() => toggleMemberInSplit(member.id)}
            >
              <View style={[styles.checkbox, { borderColor: theme.colors.border }, includedMembers.has(member.id) && { backgroundColor: theme.colors.primary.a0, borderColor: theme.colors.primary.a0 }]}>
                {includedMembers.has(member.id) && <Text style={[styles.checkmark, { color: theme.colors.light }]}>✓</Text>}
              </View>
              <Text style={{ color: theme.colors.text }}>{member.name}</Text>
              {includedMembers.has(member.id) && totalAmount && (
                <Text style={[styles.splitAmount, { color: theme.colors.textSecondary }]}>
                  ({formatCurrency(parseFloat(totalAmount) / includedMembers.size)})
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {splitType === 'custom' && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Custom amounts</Text>
          {members.map(member => (
            <View key={member.id} style={styles.payerRow}>
              <Text style={[styles.memberName, { color: theme.colors.text }]}>{member.name}</Text>
              <TextInput
                style={[styles.amountInput, { backgroundColor: theme.colors.surfaceTonal.a0, borderColor: theme.colors.border, color: theme.colors.text }]}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textSecondary}
                value={customSplits[member.id] || ''}
                onChangeText={(v) => handleCustomSplitChange(member.id, v)}
                keyboardType="decimal-pad"
              />
            </View>
          ))}
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.surfaceTonal.a10 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary.a0 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={[styles.primaryButtonText, { color: theme.colors.light }]}>
            {loading ? 'Adding...' : 'Add Expense'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  payerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  memberName: {
    flex: 1,
    fontSize: 16,
  },
  amountInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    width: 100,
    textAlign: 'right',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  typeButtonText: {
    fontWeight: '500',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontWeight: '700',
  },
  splitAmount: {
    marginLeft: 'auto',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButtonText: {
    fontWeight: '500',
    fontSize: 16,
  },
});
