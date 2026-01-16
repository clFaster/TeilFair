import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Share,
  TextInput,
  FlatList,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { createGroupUrls } from '@teilfair/shared';
import { useGroupStore } from '../store/groupStore';
import type { RootStackParamList } from '../../App';

type GroupScreenRouteProp = RouteProp<RootStackParamList, 'Group'>;

type Tab = 'expenses' | 'balances' | 'members';

export function GroupScreen() {
  const route = useRoute<GroupScreenRouteProp>();
  const navigation = useNavigation();
  const { groupId, token } = route.params;
  
  const {
    group,
    members,
    expenses,
    memberBalances,
    settlements,
    permission,
    loading,
    error,
    loadGroup,
    addMember,
    deleteMember,
    deleteExpense,
  } = useGroupStore();
  
  const [activeTab, setActiveTab] = useState<Tab>('expenses');
  const [newMemberName, setNewMemberName] = useState('');
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    loadGroup(groupId, token);
  }, [groupId, token]);

  const canWrite = permission === 'write';

  const handleAddMember = async () => {
    if (!newMemberName.trim()) return;
    try {
      await addMember(newMemberName.trim());
      setNewMemberName('');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add member');
    }
  };

  const handleDeleteMember = async (memberId: string, memberName: string) => {
    const isUsed = expenses.some(
      e => e.payers.some(p => p.memberId === memberId) ||
           e.splits.some(s => s.memberId === memberId)
    );
    
    if (isUsed) {
      Alert.alert('Error', 'Cannot delete a member who is part of an expense');
      return;
    }
    
    Alert.alert(
      'Delete Member',
      `Are you sure you want to delete ${memberName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMember(memberId) },
      ]
    );
  };

  const handleDeleteExpense = async (expenseId: string) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteExpense(expenseId) },
      ]
    );
  };

  const handleShare = async () => {
    if (!group) return;
    
    const baseUrl = 'https://teilfair.app'; // Replace with your actual domain
    const urls = createGroupUrls(baseUrl, group.id, group.readToken, group.writeToken);
    
    try {
      await Share.share({
        message: canWrite
          ? `Join my TeilFair group "${group.name}":\n\nView only: ${urls.readUrl}\n\nEdit access: ${urls.writeUrl}`
          : `Join my TeilFair group "${group.name}":\n${urls.readUrl}`,
      });
    } catch (err) {
      // User cancelled
    }
  };

  const copyLink = async (type: 'read' | 'write') => {
    if (!group) return;
    
    const baseUrl = 'https://teilfair.app';
    const urls = createGroupUrls(baseUrl, group.id, group.readToken, group.writeToken);
    const url = type === 'read' ? urls.readUrl : urls.writeUrl;
    
    await Clipboard.setStringAsync(url);
    Alert.alert('Copied!', `${type === 'read' ? 'Read' : 'Write'} link copied to clipboard`);
  };

  const getMemberName = (memberId: string) => {
    return members.find(m => m.id === memberId)?.name || 'Unknown';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: group?.currency || 'EUR',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  if (loading && !group) {
    return (
      <View style={styles.centered}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (error && !group) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.centered}>
        <Text>Group not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.currency}>{group.currency}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.badge, canWrite ? styles.badgeWrite : styles.badgeRead]}>
            <Text style={styles.badgeText}>{canWrite ? 'Edit' : 'View'}</Text>
          </View>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'expenses' && styles.tabActive]}
          onPress={() => setActiveTab('expenses')}
        >
          <Text style={[styles.tabText, activeTab === 'expenses' && styles.tabTextActive]}>
            Expenses
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'balances' && styles.tabActive]}
          onPress={() => setActiveTab('balances')}
        >
          <Text style={[styles.tabText, activeTab === 'balances' && styles.tabTextActive]}>
            Balances
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'members' && styles.tabActive]}
          onPress={() => setActiveTab('members')}
        >
          <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>
            Members ({members.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <View>
            {canWrite && (
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, styles.addButton]}
                onPress={() => navigation.navigate('AddExpense' as never)}
                disabled={members.length < 2}
              >
                <Text style={styles.primaryButtonText}>Add Expense</Text>
              </TouchableOpacity>
            )}
            
            {members.length < 2 && (
              <Text style={styles.hint}>Add at least 2 members to start adding expenses</Text>
            )}
            
            {expenses.length === 0 ? (
              <Text style={styles.emptyText}>No expenses yet</Text>
            ) : (
              expenses.map((expense) => (
                <View key={expense.id} style={styles.expenseCard}>
                  <View style={styles.expenseHeader}>
                    <View>
                      <Text style={styles.expenseDescription}>{expense.description}</Text>
                      <Text style={styles.expenseDate}>{formatDate(expense.date)}</Text>
                    </View>
                    <Text style={styles.expenseAmount}>
                      {formatCurrency(expense.totalAmount)}
                    </Text>
                  </View>
                  <Text style={styles.expenseDetails}>
                    Paid by: {expense.payers.map(p => getMemberName(p.memberId)).join(', ')}
                  </Text>
                  {canWrite && (
                    <TouchableOpacity
                      style={[styles.smallButton, styles.dangerButton]}
                      onPress={() => handleDeleteExpense(expense.id)}
                    >
                      <Text style={styles.dangerButtonText}>Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* Balances Tab */}
        {activeTab === 'balances' && (
          <View>
            {memberBalances.length === 0 ? (
              <Text style={styles.emptyText}>No balances yet</Text>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Individual Balances</Text>
                {memberBalances.map((balance) => (
                  <View key={balance.memberId} style={styles.balanceRow}>
                    <Text>{getMemberName(balance.memberId)}</Text>
                    <Text style={[
                      styles.balanceAmount,
                      balance.netBalance > 0.01 ? styles.positive :
                      balance.netBalance < -0.01 ? styles.negative : styles.zero,
                    ]}>
                      {balance.netBalance > 0.01 && '+'}
                      {formatCurrency(balance.netBalance)}
                    </Text>
                  </View>
                ))}

                {settlements.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
                      Suggested Settlements
                    </Text>
                    {settlements.map((settlement, i) => (
                      <View key={i} style={styles.settlementCard}>
                        <Text style={styles.settlementText}>
                          {getMemberName(settlement.fromMemberId)} → {getMemberName(settlement.toMemberId)}
                        </Text>
                        <Text style={styles.settlementAmount}>
                          {formatCurrency(settlement.amount)}
                        </Text>
                      </View>
                    ))}
                  </>
                )}
              </>
            )}
          </View>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <View>
            {canWrite && (
              <View style={styles.addMemberRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="New member name"
                  value={newMemberName}
                  onChangeText={setNewMemberName}
                />
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={handleAddMember}
                >
                  <Text style={styles.primaryButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {members.length === 0 ? (
              <Text style={styles.emptyText}>No members yet</Text>
            ) : (
              members.map((member) => (
                <View key={member.id} style={styles.memberRow}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  {canWrite && (
                    <TouchableOpacity
                      style={[styles.smallButton, styles.dangerButton]}
                      onPress={() => handleDeleteMember(member.id, member.name)}
                    >
                      <Text style={styles.dangerButtonText}>Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  groupName: {
    fontSize: 20,
    fontWeight: '700',
  },
  currency: {
    fontSize: 14,
    color: '#64748b',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeRead: {
    backgroundColor: '#dbeafe',
  },
  badgeWrite: {
    backgroundColor: '#dcfce7',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  shareButton: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  shareButtonText: {
    fontWeight: '500',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#6366f1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#6366f1',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#6366f1',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  smallButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  dangerButton: {
    backgroundColor: '#ef4444',
  },
  dangerButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  addButton: {
    marginBottom: 16,
  },
  hint: {
    textAlign: 'center',
    color: '#64748b',
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    paddingVertical: 32,
  },
  error: {
    color: '#ef4444',
    marginBottom: 16,
  },
  expenseCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '600',
  },
  expenseDate: {
    fontSize: 12,
    color: '#64748b',
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  expenseDetails: {
    fontSize: 14,
    color: '#64748b',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  balanceAmount: {
    fontWeight: '600',
  },
  positive: {
    color: '#22c55e',
  },
  negative: {
    color: '#ef4444',
  },
  zero: {
    color: '#64748b',
  },
  settlementCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  settlementText: {
    fontWeight: '500',
  },
  settlementAmount: {
    fontWeight: '700',
  },
  addMemberRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  memberName: {
    fontSize: 16,
  },
});
