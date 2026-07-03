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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { createGroupUrls } from '@teilfair/shared';
import { useGroupStore } from '../store/groupStore';
import { useTheme } from '../theme/ThemeProvider';
import type { RootStackParamList } from '../../App';

type GroupScreenRouteProp = RouteProp<RootStackParamList, 'Group'>;
type GroupScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Group'>;

type Tab = 'expenses' | 'balances' | 'members';

export function GroupScreen() {
  const { t, i18n } = useTranslation();
  const route = useRoute<GroupScreenRouteProp>();
  const navigation = useNavigation<GroupScreenNavigationProp>();
  const { groupId } = route.params;
  const token = route.params.token ?? route.params.t;
  const { theme, mode, setThemePreference } = useTheme();
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

  const cycleTheme = () => {
    setThemePreference(mode === 'light' ? 'dark' : 'light');
  };

  const toggleLanguage = async () => {
    const nextLanguage = i18n.language === 'de' ? 'en' : 'de';
    await i18n.changeLanguage(nextLanguage);
    await AsyncStorage.setItem('language', nextLanguage);
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
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backButtonText, { color: theme.colors.primary.a0 }]}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.groupName, { color: theme.colors.text }]} numberOfLines={1}>
            {group.name}
          </Text>
          <Text style={[styles.currency, { color: theme.colors.textSecondary }]}>{group.currency}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[
            styles.badge, 
            { 
              backgroundColor: 'transparent',
              borderColor: canWrite ? theme.colors.success.a10 : theme.colors.info.a10 
            }
          ]}>
            <Text style={[
              styles.badgeText,
              { color: canWrite ? theme.colors.success.a0 : theme.colors.info.a0 }
            ]}>
              {canWrite ? t('common.editPermission') : t('common.viewPermission')}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.utilityBar, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.utilityButton, { backgroundColor: theme.colors.primary.a0 }]}
          onPress={handleShare}
        >
          <Text style={[styles.utilityButtonText, { color: '#fff' }]}>{t('common.share')}</Text>
        </TouchableOpacity>
        {canWrite && (
          <TouchableOpacity
            style={[styles.utilityButton, { backgroundColor: theme.colors.surfaceTonal.a10 }]}
            onPress={() => navigation.navigate('EditGroup')}
          >
            <Text style={[styles.utilityButtonText, { color: theme.colors.text }]}>{t('common.edit')}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.utilityButton, { backgroundColor: theme.colors.surfaceTonal.a10 }]}
          onPress={toggleLanguage}
        >
          <Text style={[styles.utilityButtonText, { color: theme.colors.text }]}>
            {i18n.language === 'de' ? 'DE' : 'EN'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.utilityButton, { backgroundColor: theme.colors.surfaceTonal.a10 }]}
          onPress={cycleTheme}
        >
          <Text style={[styles.utilityButtonText, { color: theme.colors.text }]}>
            {mode === 'dark' ? t('theme.dark') : t('theme.light')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
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
            {t('group.tabExpenses')}
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
            {t('group.tabBalances')}
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
            {t('group.tabMembersCount', { count: members.length })}
          </Text>
        </TouchableOpacity>
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
                <Text style={styles.primaryButtonText}>+ {t('expense.addExpense')}</Text>
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
                        style={[styles.editButton, { backgroundColor: theme.colors.surfaceTonal.a10 }]}
                        onPress={() => navigation.navigate('EditExpense', { expenseId: expense.id })}
                      >
                        <Text style={[styles.editButtonText, { color: theme.colors.text }]}>{t('common.edit')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.deleteButton, { backgroundColor: theme.colors.danger.a20 }]}
                        onPress={() => handleDeleteExpense(expense.id)}
                      >
                        <Text style={[styles.deleteButtonText, { color: theme.colors.danger.a0 }]}>{t('common.delete')}</Text>
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
                          <Text style={[styles.settlementArrow, { color: theme.colors.settlement.accent }]}>→</Text>
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
                >
                  <Text style={styles.primaryButtonText}>{t('member.addMember')}</Text>
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
                              style={[styles.editButton, { backgroundColor: theme.colors.primary.a0 }]}
                              onPress={handleUpdateMember}
                            >
                              <Text style={styles.primaryButtonText}>{t('common.save')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.editButton, { backgroundColor: theme.colors.surfaceTonal.a10 }]}
                              onPress={cancelEditingMember}
                            >
                              <Text style={[styles.editButtonText, { color: theme.colors.text }]}>{t('common.cancel')}</Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          <>
                            <TouchableOpacity
                              style={[styles.editButton, { backgroundColor: theme.colors.surfaceTonal.a10 }]}
                              onPress={() => startEditingMember(member.id, member.name)}
                            >
                              <Text style={[styles.editButtonText, { color: theme.colors.text }]}>{t('common.edit')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.deleteButton, { backgroundColor: theme.colors.danger.a20 }]}
                              onPress={() => handleDeleteMember(member.id, member.name)}
                            >
                              <Text style={[styles.deleteButtonText, { color: theme.colors.danger.a0 }]}>{t('common.delete')}</Text>
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
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  shareButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  shareButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  iconButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  iconButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  utilityBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  utilityButton: {
    minWidth: 56,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  utilityButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
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
    paddingVertical: 16,
    borderRadius: 12,
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
    fontSize: 14,
    marginBottom: 12,
  },
  expenseButtons: {
    flexDirection: 'row',
    gap: 8,
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
  settlementArrow: {
    fontSize: 18,
    fontWeight: '700',
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
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
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
