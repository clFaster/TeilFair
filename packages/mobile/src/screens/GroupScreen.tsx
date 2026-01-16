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
import { useTheme } from '../theme/ThemeProvider';
import type { RootStackParamList } from '../../App';

type GroupScreenRouteProp = RouteProp<RootStackParamList, 'Group'>;

type Tab = 'expenses' | 'balances' | 'members';

export function GroupScreen() {
  const route = useRoute<GroupScreenRouteProp>();
  const navigation = useNavigation();
  const { groupId, token } = route.params;
  const { theme } = useTheme();
  
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
      <View style={[styles.centered, { backgroundColor: theme.colors.surface.a0 }]}>
        <Text style={{ color: theme.colors.text }}>Loading...</Text>
      </View>
    );
  }

  if (error && !group) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.surface.a0 }]}>
        <Text style={[styles.error, { color: theme.colors.danger.a10 }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary.a0 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!group) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.surface.a0 }]}>
        <Text style={{ color: theme.colors.text }}>Group not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface.a0 }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surfaceTonal.a0, borderBottomColor: theme.colors.border }]}>
        <View>
          <Text style={[styles.groupName, { color: theme.colors.text }]}>{group.name}</Text>
          <Text style={[styles.currency, { color: theme.colors.textSecondary }]}>{group.currency}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[
            styles.badge, 
            { backgroundColor: canWrite ? theme.colors.success.a20 : theme.colors.info.a20 }
          ]}>
            <Text style={[
              styles.badgeText,
              { color: canWrite ? theme.colors.success.a0 : theme.colors.info.a0 }
            ]}>
              {canWrite ? 'Edit' : 'View'}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.shareButton, { backgroundColor: theme.colors.primary.a0 }]} 
            onPress={handleShare}
          >
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: theme.colors.surfaceTonal.a0, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tab, 
            activeTab === 'expenses' && { borderBottomColor: theme.colors.primary.a0 }
          ]}
          onPress={() => setActiveTab('expenses')}
        >
          <Text style={[
            styles.tabText, 
            { color: activeTab === 'expenses' ? theme.colors.primary.a0 : theme.colors.textSecondary }
          ]}>
            Expenses
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab, 
            activeTab === 'balances' && { borderBottomColor: theme.colors.primary.a0 }
          ]}
          onPress={() => setActiveTab('balances')}
        >
          <Text style={[
            styles.tabText, 
            { color: activeTab === 'balances' ? theme.colors.primary.a0 : theme.colors.textSecondary }
          ]}>
            Balances
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab, 
            activeTab === 'members' && { borderBottomColor: theme.colors.primary.a0 }
          ]}
          onPress={() => setActiveTab('members')}
        >
          <Text style={[
            styles.tabText, 
            { color: activeTab === 'members' ? theme.colors.primary.a0 : theme.colors.textSecondary }
          ]}>
            Members ({members.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={[styles.content, { backgroundColor: theme.colors.surface.a0 }]}>
        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <View>
            {canWrite && (
              <TouchableOpacity
                style={[styles.button, styles.addButton, { backgroundColor: theme.colors.primary.a0 }]}
                onPress={() => navigation.navigate('AddExpense' as never)}
                disabled={members.length < 2}
              >
                <Text style={styles.primaryButtonText}>Add Expense</Text>
              </TouchableOpacity>
            )}
            
            {members.length < 2 && (
              <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
                Add at least 2 members to start adding expenses
              </Text>
            )}
            
            {expenses.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No expenses yet</Text>
            ) : (
              expenses.map((expense) => (
                <View key={expense.id} style={[styles.expenseCard, { backgroundColor: theme.colors.surfaceTonal.a0, borderColor: theme.colors.border }]}>
                  <View style={styles.expenseHeader}>
                    <View>
                      <Text style={[styles.expenseDescription, { color: theme.colors.text }]}>{expense.description}</Text>
                      <Text style={[styles.expenseDate, { color: theme.colors.textSecondary }]}>{formatDate(expense.date)}</Text>
                    </View>
                    <Text style={[styles.expenseAmount, { color: theme.colors.text }]}>
                      {formatCurrency(expense.totalAmount)}
                    </Text>
                  </View>
                  <Text style={[styles.expenseDetails, { color: theme.colors.textSecondary }]}>
                    Paid by: {expense.payers.map(p => getMemberName(p.memberId)).join(', ')}
                  </Text>
                  {canWrite && (
                    <TouchableOpacity
                      style={[styles.smallButton, { backgroundColor: theme.colors.danger.a10 }]}
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
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No balances yet</Text>
            ) : (
              <>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Individual Balances</Text>
                {memberBalances.map((balance) => (
                  <View key={balance.memberId} style={[styles.balanceRow, { backgroundColor: theme.colors.surfaceTonal.a0, borderColor: theme.colors.border }]}>
                    <Text style={{ color: theme.colors.text }}>{getMemberName(balance.memberId)}</Text>
                    <Text style={[
                      styles.balanceAmount,
                      { color: balance.netBalance > 0.01 ? theme.colors.success.a10 :
                        balance.netBalance < -0.01 ? theme.colors.danger.a10 : theme.colors.textSecondary }
                    ]}>
                      {balance.netBalance > 0.01 && '+'}
                      {formatCurrency(balance.netBalance)}
                    </Text>
                  </View>
                ))}

                {settlements.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: 24, color: theme.colors.text }]}>
                      Suggested Settlements
                    </Text>
                    {settlements.map((settlement, i) => (
                      <View key={i} style={[styles.settlementCard, { backgroundColor: theme.colors.warning.a20, borderColor: theme.colors.border }]}>
                        <Text style={[styles.settlementText, { color: theme.colors.text }]}>
                          {getMemberName(settlement.fromMemberId)} → {getMemberName(settlement.toMemberId)}
                        </Text>
                        <Text style={[styles.settlementAmount, { color: theme.colors.text }]}>
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
                  style={[styles.input, { flex: 1, backgroundColor: theme.colors.surfaceTonal.a0, borderColor: theme.colors.border, color: theme.colors.text }]}
                  placeholder="New member name"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={newMemberName}
                  onChangeText={setNewMemberName}
                />
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton, { backgroundColor: theme.colors.primary.a0 }]}
                  onPress={handleAddMember}
                >
                  <Text style={[styles.primaryButtonText, { color: theme.colors.light }]}>Add</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {members.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No members yet</Text>
            ) : (
              members.map((member) => (
                <View key={member.id} style={[styles.memberRow, { borderColor: theme.colors.border }]}>
                  <Text style={[styles.memberName, { color: theme.colors.text }]}>{member.name}</Text>
                  {canWrite && (
                    <TouchableOpacity
                      style={[styles.smallButton, { backgroundColor: theme.colors.danger.a10 }]}
                      onPress={() => handleDeleteMember(member.id, member.name)}
                    >
                      <Text style={[styles.dangerButtonText, { color: theme.colors.light }]}>Delete</Text>
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
    borderBottomWidth: 1,
  },
  groupName: {
    fontSize: 20,
    fontWeight: '700',
  },
  currency: {
    fontSize: 14,
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
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  shareButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  shareButtonText: {
    fontWeight: '500',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
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
  primaryButton: {},
  primaryButtonText: {
    fontWeight: '600',
  },
  smallButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  dangerButtonText: {
    fontWeight: '500',
  },
  addButton: {
    marginBottom: 16,
  },
  hint: {
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 32,
  },
  error: {
    marginBottom: 16,
  },
  expenseCard: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
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
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  expenseDetails: {
    fontSize: 14,
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
  },
  balanceAmount: {
    fontWeight: '600',
  },
  settlementCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
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
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  memberName: {
    fontSize: 16,
  },
});
