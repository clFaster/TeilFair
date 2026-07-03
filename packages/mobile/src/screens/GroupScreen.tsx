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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { createGroupUrls } from '@teilfair/shared';
import { useGroupStore } from '../store/groupStore';
import { useTheme } from '../theme/ThemeProvider';
import { MobileIcon } from '../components/MobileIcon';
import { SettingsSheet } from '../components/SettingsSheet';
import type { RootStackParamList } from '../../App';

type GroupScreenRouteProp = RouteProp<RootStackParamList, 'Group'>;
type GroupScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Group'>;

type Tab = 'expenses' | 'balances' | 'members';

export function GroupScreen() {
  const { t } = useTranslation();
  const route = useRoute<GroupScreenRouteProp>();
  const navigation = useNavigation<GroupScreenNavigationProp>();
  const { groupId } = route.params;
  const token = route.params.token ?? route.params.t;
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
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
    updateMember,
    deleteMember,
    deleteExpense,
  } = useGroupStore();
  
  const [activeTab, setActiveTab] = useState<Tab>('expenses');
  const [newMemberName, setNewMemberName] = useState('');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingMemberName, setEditingMemberName] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (token) {
      loadGroup(groupId, token);
    }
  }, [groupId, token]);

  const canWrite = permission === 'write';

  const handleAddMember = async () => {
    if (!newMemberName.trim()) return;
    try {
      await addMember(newMemberName.trim());
      setNewMemberName('');
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : t('error.failedToAddMember'));
    }
  };

  const startEditingMember = (memberId: string, name: string) => {
    setEditingMemberId(memberId);
    setEditingMemberName(name);
  };

  const cancelEditingMember = () => {
    setEditingMemberId(null);
    setEditingMemberName('');
  };

  const handleUpdateMember = async () => {
    if (!editingMemberId || !editingMemberName.trim()) return;

    try {
      await updateMember(editingMemberId, editingMemberName.trim());
      cancelEditingMember();
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : t('error.generic'));
    }
  };

  const handleDeleteMember = async (memberId: string, memberName: string) => {
    const isUsed = expenses.some(
      e => e.payers.some(p => p.memberId === memberId) ||
           e.splits.some(s => s.memberId === memberId)
    );
    
    if (isUsed) {
      Alert.alert(t('common.error'), t('member.cannotDelete'));
      return;
    }
    
    Alert.alert(
      t('member.deleteTitle'),
      t('member.confirmDeleteNamed', { name: memberName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => deleteMember(memberId) },
      ]
    );
  };

  const handleDeleteExpense = async (expenseId: string) => {
    Alert.alert(
      t('expense.confirmDeleteTitle'),
      t('expense.confirmDelete'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => deleteExpense(expenseId) },
      ]
    );
  };

  const shareOrCopyLink = (url: string, message: string) => {
    Alert.alert(
      t('share.sharePromptTitle'),
      url,
      [
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
      ],
    );
  };

  const handleShare = () => {
    if (!group) return;
    
    const baseUrl = 'https://teilfair.app';
    const urls = createGroupUrls(baseUrl, group.id, group.readToken, group.writeToken);
    
    // If user has write permission, ask which link to share
    if (canWrite) {
      Alert.alert(
        t('share.sharePromptTitle'),
        t('share.sharePromptDescription'),
        [
          {
            text: t('share.shareViewOnly'),
            onPress: () => shareOrCopyLink(
              urls.readUrl,
              t('share.shareMessageViewOnly', { groupName: group.name, url: urls.readUrl }),
            ),
          },
          {
            text: t('share.shareEditAccess'),
            onPress: () => shareOrCopyLink(
              urls.writeUrl,
              t('share.shareMessageEditAccess', { groupName: group.name, url: urls.writeUrl }),
            ),
          },
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
        ]
      );
    } else {
      // User only has read access, share the read link
      shareOrCopyLink(
        urls.readUrl,
        t('share.shareMessageDefault', { groupName: group.name, url: urls.readUrl }),
      );
    }
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

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.totalAmount, 0);

  const getMemberBalance = (memberId: string) => {
    return memberBalances.find((balance) => balance.memberId === memberId)?.netBalance ?? 0;
  };

  const getBalanceLabel = (amount: number) => {
    if (amount > 0.01) return `${t('balance.getsBack')} ${formatCurrency(Math.abs(amount))}`;
    if (amount < -0.01) return `${t('balance.owes')} ${formatCurrency(Math.abs(amount))}`;
    return t('balance.settled');
  };

  if (!token) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <Text style={[styles.error, { color: theme.colors.danger.a10 }]}>
          {t('group.invalidLinkDescription')}
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary.a0 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.primaryButtonText}>{t('common.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading && !group) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <Text style={{ color: theme.colors.text }}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (error && !group) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <Text style={[styles.error, { color: theme.colors.danger.a10 }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary.a0 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.primaryButtonText}>{t('common.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!group) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <Text style={{ color: theme.colors.text }}>{t('error.groupNotFound')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header with safe area */}
      <View style={[
        styles.header, 
        { 
          backgroundColor: theme.colors.card, 
          borderBottomColor: theme.colors.border,
          paddingTop: insets.top + 12,
        }
      ]}>
        <TouchableOpacity 
          style={[styles.roundIconButton, { backgroundColor: theme.colors.surfaceTonal.a10 }]}
          onPress={() => navigation.goBack()}
        >
          <MobileIcon name="back" color={theme.colors.text} size={20} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.groupName, { color: theme.colors.text }]} numberOfLines={1}>
            {group.name}
          </Text>
          <Text style={[styles.currency, { color: theme.colors.textSecondary }]}>
            {group.currency} · {canWrite ? t('common.editPermission') : t('common.viewPermission')}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.roundIconButton, { backgroundColor: theme.colors.surfaceTonal.a10 }]}
            onPress={handleShare}
            accessibilityLabel={t('common.share')}
          >
            <MobileIcon name="share" color={theme.colors.text} size={19} />
          </TouchableOpacity>
          {canWrite && (
            <TouchableOpacity
              style={[styles.roundIconButton, { backgroundColor: theme.colors.surfaceTonal.a10 }]}
              onPress={() => navigation.navigate('EditGroup')}
              accessibilityLabel={t('common.edit')}
            >
              <MobileIcon name="edit" color={theme.colors.text} size={19} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.roundIconButton, { backgroundColor: theme.colors.surfaceTonal.a10 }]}
            onPress={() => setShowSettings(true)}
            accessibilityLabel={t('settings.title')}
          >
            <MobileIcon name="settings" color={theme.colors.text} size={19} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.summaryPanel, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>{t('group.totalExpenses')}</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{formatCurrency(totalExpenses)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>{t('group.tabExpenses')}</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{expenses.length}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>{t('group.tabMembers')}</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{members.length}</Text>
        </View>
      </View>

      <View style={[styles.tabsWrap, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.tabs, { backgroundColor: theme.colors.surfaceTonal.a10 }]}>
        <TouchableOpacity
          style={[
            styles.tab, 
            activeTab === 'expenses' && { backgroundColor: theme.colors.card }
          ]}
          onPress={() => setActiveTab('expenses')}
        >
          <MobileIcon name="receipt" color={activeTab === 'expenses' ? theme.colors.primary.a0 : theme.colors.textSecondary} size={16} />
          <Text style={[
            styles.tabText, 
            { color: activeTab === 'expenses' ? theme.colors.primary.a0 : theme.colors.textSecondary }
          ]}>
            {t('group.tabExpenses')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab, 
            activeTab === 'balances' && { backgroundColor: theme.colors.card }
          ]}
          onPress={() => setActiveTab('balances')}
        >
          <MobileIcon name="balance" color={activeTab === 'balances' ? theme.colors.primary.a0 : theme.colors.textSecondary} size={16} />
          <Text style={[
            styles.tabText, 
            { color: activeTab === 'balances' ? theme.colors.primary.a0 : theme.colors.textSecondary }
          ]}>
            {t('group.tabBalances')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab, 
            activeTab === 'members' && { backgroundColor: theme.colors.card }
          ]}
          onPress={() => setActiveTab('members')}
        >
          <MobileIcon name="users" color={activeTab === 'members' ? theme.colors.primary.a0 : theme.colors.textSecondary} size={16} />
          <Text style={[
            styles.tabText, 
            { color: activeTab === 'members' ? theme.colors.primary.a0 : theme.colors.textSecondary }
          ]}>
            {t('group.tabMembersCount', { count: members.length })}
          </Text>
        </TouchableOpacity>
      </View>
      </View>

      <ScrollView 
        style={[styles.content, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      >
        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <View>
            {canWrite && (
              <TouchableOpacity
                style={[
                  styles.addButton, 
                  { backgroundColor: theme.colors.primary.a0 },
                  members.length < 1 && { opacity: 0.5 }
                ]}
                onPress={() => navigation.navigate('AddExpense')}
                disabled={members.length < 1}
              >
                <MobileIcon name="plus" color="#fff" size={18} />
                <Text style={styles.primaryButtonText}>{t('expense.addExpense')}</Text>
              </TouchableOpacity>
            )}
            
            {members.length < 1 && (
              <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
                {t('member.addMemberHintSingle')}
              </Text>
            )}
            
            {expenses.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  {t('expense.emptyTitle')}
                </Text>
                <Text style={[styles.emptyHint, { color: theme.colors.textSecondary }]}>
                  {canWrite ? t('expense.emptyDescriptionWithWrite') : t('expense.emptyDescriptionReadOnly')}
                </Text>
              </View>
            ) : (
              expenses.map((expense) => (
                <View
                  key={expense.id}
                  style={[styles.expenseCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                >
                  <TouchableOpacity
                    onPress={() => navigation.navigate('ExpenseDetails', { expenseId: expense.id })}
                    activeOpacity={0.78}
                  >
                    <View style={styles.expenseHeader}>
                      <View style={styles.expenseInfo}>
                        <Text style={[styles.expenseDescription, { color: theme.colors.text }]}>{expense.description}</Text>
                        <Text style={[styles.expenseDate, { color: theme.colors.textSecondary }]}>{formatDate(expense.date)}</Text>
                      </View>
                      <Text style={[styles.expenseAmount, { color: theme.colors.text }]}>
                        {formatCurrency(expense.totalAmount)}
                      </Text>
                    </View>
                    <Text style={[styles.expenseDetails, { color: theme.colors.textSecondary }]}>
                      {t('expense.paidBy', { names: expense.payers.map(p => getMemberName(p.memberId)).join(', ') })}
                    </Text>
                    <Text style={[styles.expenseDetails, { color: theme.colors.textSecondary }]}>
                      {t('expense.viewDetails')}
                    </Text>
                  </TouchableOpacity>
                  {canWrite && (
                    <View style={styles.expenseButtons}>
                      <TouchableOpacity
                        style={[styles.iconActionButton, { backgroundColor: theme.colors.surfaceTonal.a10 }]}
                        onPress={() => navigation.navigate('EditExpense', { expenseId: expense.id })}
                        accessibilityLabel={t('common.edit')}
                      >
                        <MobileIcon name="edit" color={theme.colors.text} size={17} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.iconActionButton, { backgroundColor: theme.colors.danger.a20 }]}
                        onPress={() => handleDeleteExpense(expense.id)}
                        accessibilityLabel={t('common.delete')}
                      >
                        <MobileIcon name="trash" color={theme.colors.danger.a0} size={17} />
                      </TouchableOpacity>
                    </View>
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
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>{t('balance.emptyTitle')}</Text>
              </View>
            ) : (
              <>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('balance.individualBalances')}</Text>
                {memberBalances.map((balance) => (
                  <View key={balance.memberId} style={[styles.balanceRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <Text style={{ color: theme.colors.text, fontWeight: '500' }}>{getMemberName(balance.memberId)}</Text>
                    <Text style={[
                      styles.balanceAmount,
                      { color: balance.netBalance > 0.01 ? theme.colors.success.a0 :
                        balance.netBalance < -0.01 ? theme.colors.danger.a0 : theme.colors.textSecondary }
                    ]}>
                      {balance.netBalance > 0.01 && '+'}
                      {formatCurrency(balance.netBalance)}
                    </Text>
                  </View>
                ))}

                {settlements.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: 24, color: theme.colors.text }]}>
                      {t('balance.suggestedSettlements')}
                    </Text>
                    {settlements.map((settlement, i) => (
                      <View key={i} style={[styles.settlementCard, { backgroundColor: theme.colors.settlement.bg, borderColor: theme.colors.settlement.border }]}>
                        <View style={styles.settlementFlow}>
                          <Text style={[styles.settlementName, { color: theme.colors.text }]}>
                            {getMemberName(settlement.fromMemberId)}
                          </Text>
                          <MobileIcon name="arrowRight" color={theme.colors.settlement.accent} size={18} />
                          <Text style={[styles.settlementName, { color: theme.colors.text }]}>
                            {getMemberName(settlement.toMemberId)}
                          </Text>
                        </View>
                        <Text style={[styles.settlementAmount, { color: theme.colors.settlement.accent }]}>
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
                  style={[styles.input, { flex: 1, backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                  placeholder={t('member.newMemberPlaceholderMobile')}
                  placeholderTextColor={theme.colors.textSecondary}
                  value={newMemberName}
                  onChangeText={setNewMemberName}
                  onSubmitEditing={handleAddMember}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={[styles.addMemberButton, { backgroundColor: theme.colors.primary.a0 }]}
                  onPress={handleAddMember}
                  accessibilityLabel={t('member.addMember')}
                >
                  <MobileIcon name="plus" color="#fff" size={18} />
                </TouchableOpacity>
              </View>
            )}
            
            {members.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>{t('member.emptyTitle')}</Text>
                <Text style={[styles.emptyHint, { color: theme.colors.textSecondary }]}>
                  {t('member.emptyDescriptionWithWrite')}
                </Text>
              </View>
            ) : (
              members.map((member) => {
                const isEditing = editingMemberId === member.id;
                const balance = getMemberBalance(member.id);

                return (
                  <View key={member.id} style={[styles.memberRow, { borderColor: theme.colors.border }]}>
                    <View style={styles.memberInfo}>
                      {isEditing ? (
                        <TextInput
                          style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                          placeholder={t('member.memberNamePlaceholder')}
                          placeholderTextColor={theme.colors.textSecondary}
                          value={editingMemberName}
                          onChangeText={setEditingMemberName}
                          onSubmitEditing={handleUpdateMember}
                          returnKeyType="done"
                        />
                      ) : (
                        <>
                          <Text style={[styles.memberName, { color: theme.colors.text }]}>{member.name}</Text>
                          <Text
                            style={[
                              styles.memberBalance,
                              {
                                color: balance > 0.01
                                  ? theme.colors.success.a0
                                  : balance < -0.01
                                    ? theme.colors.danger.a0
                                    : theme.colors.textSecondary,
                              },
                            ]}
                          >
                            {getBalanceLabel(balance)}
                          </Text>
                        </>
                      )}
                    </View>
                    {canWrite && (
                      <View style={styles.memberActions}>
                        {isEditing ? (
                          <>
                            <TouchableOpacity
                              style={[styles.iconActionButton, { backgroundColor: theme.colors.primary.a0 }]}
                              onPress={handleUpdateMember}
                              accessibilityLabel={t('common.save')}
                            >
                              <MobileIcon name="check" color="#fff" size={17} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.iconActionButton, { backgroundColor: theme.colors.surfaceTonal.a10 }]}
                              onPress={cancelEditingMember}
                              accessibilityLabel={t('common.cancel')}
                            >
                              <MobileIcon name="close" color={theme.colors.text} size={17} />
                            </TouchableOpacity>
                          </>
                        ) : (
                          <>
                            <TouchableOpacity
                              style={[styles.iconActionButton, { backgroundColor: theme.colors.surfaceTonal.a10 }]}
                              onPress={() => startEditingMember(member.id, member.name)}
                              accessibilityLabel={t('common.edit')}
                            >
                              <MobileIcon name="edit" color={theme.colors.text} size={17} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.iconActionButton, { backgroundColor: theme.colors.danger.a20 }]}
                              onPress={() => handleDeleteMember(member.id, member.name)}
                              accessibilityLabel={t('common.delete')}
                            >
                              <MobileIcon name="trash" color={theme.colors.danger.a0} size={17} />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
      <SettingsSheet visible={showSettings} onClose={() => setShowSettings(false)} />
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: {
    paddingVertical: 4,
  },
  roundIconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerCenter: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '700',
  },
  currency: {
    fontSize: 13,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryPanel: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  tabsWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  addButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  hint: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 14,
  },
  error: {
    marginBottom: 16,
    textAlign: 'center',
  },
  expenseCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '600',
  },
  expenseDate: {
    fontSize: 13,
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  expenseDetails: {
    fontSize: 13,
    marginBottom: 8,
  },
  expenseButtons: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  iconActionButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  editButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  deleteButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  deleteButtonText: {
    fontWeight: '600',
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
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  balanceAmount: {
    fontWeight: '700',
    fontSize: 16,
  },
  settlementCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  settlementFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settlementName: {
    fontWeight: '500',
  },
  settlementAmount: {
    fontWeight: '700',
    fontSize: 16,
  },
  addMemberRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  addMemberButton: {
    width: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
  },
  memberBalance: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '600',
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
});
