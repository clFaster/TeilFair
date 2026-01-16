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

export function AddExpenseScreen() {
  const navigation = useNavigation();
  const { members, group, addExpense } = useGroupStore();
  
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
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Dinner, Taxi, Hotel"
          value={description}
          onChangeText={setDescription}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Total Amount ({group?.currency})</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          value={totalAmount}
          onChangeText={setTotalAmount}
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Who paid?</Text>
        <Text style={styles.hint}>
          Total: {formatCurrency(totalPaid)} / {formatCurrency(parseFloat(totalAmount) || 0)}
        </Text>
        {members.map(member => (
          <View key={member.id} style={styles.payerRow}>
            <Text style={styles.memberName}>{member.name}</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              value={payers[member.id] || ''}
              onChangeText={(v) => handlePayerChange(member.id, v)}
              keyboardType="decimal-pad"
            />
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Split type</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.typeButton, splitType === 'equal' && styles.typeButtonActive]}
            onPress={() => setSplitType('equal')}
          >
            <Text style={[styles.typeButtonText, splitType === 'equal' && styles.typeButtonTextActive]}>
              Equal
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, splitType === 'custom' && styles.typeButtonActive]}
            onPress={() => setSplitType('custom')}
          >
            <Text style={[styles.typeButtonText, splitType === 'custom' && styles.typeButtonTextActive]}>
              Custom
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {splitType === 'equal' && (
        <View style={styles.section}>
          <Text style={styles.label}>Split between ({includedMembers.size} people)</Text>
          {members.map(member => (
            <TouchableOpacity
              key={member.id}
              style={styles.checkboxRow}
              onPress={() => toggleMemberInSplit(member.id)}
            >
              <View style={[styles.checkbox, includedMembers.has(member.id) && styles.checkboxChecked]}>
                {includedMembers.has(member.id) && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text>{member.name}</Text>
              {includedMembers.has(member.id) && totalAmount && (
                <Text style={styles.splitAmount}>
                  ({formatCurrency(parseFloat(totalAmount) / includedMembers.size)})
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {splitType === 'custom' && (
        <View style={styles.section}>
          <Text style={styles.label}>Custom amounts</Text>
          {members.map(member => (
            <View key={member.id} style={styles.payerRow}>
              <Text style={styles.memberName}>{member.name}</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
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
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
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
    backgroundColor: '#f8fafc',
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
    color: '#64748b',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#6366f1',
  },
  typeButtonText: {
    fontWeight: '500',
    color: '#1e293b',
  },
  typeButtonTextActive: {
    color: '#fff',
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
    borderColor: '#e2e8f0',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  checkmark: {
    color: '#fff',
    fontWeight: '700',
  },
  splitAmount: {
    color: '#64748b',
    marginLeft: 'auto',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#6366f1',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#e2e8f0',
  },
  secondaryButtonText: {
    color: '#1e293b',
    fontWeight: '500',
    fontSize: 16,
  },
});
