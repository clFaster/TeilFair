import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useGroupStore } from '../store/groupStore';
import { useTheme } from '../theme/ThemeProvider';
import { LogoIcon } from '../components/LogoIcon';
import type { RootStackParamList } from '../../App';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY'];

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { createGroup, loadGroup, recentGroups, removeFromRecent, loading } = useGroupStore();
  const { theme, mode, setThemePreference } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [joinLink, setJoinLink] = useState('');

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    
    try {
      const group = await createGroup(groupName.trim(), currency);
      navigation.navigate('Group', { 
        groupId: group.id, 
        token: group.writeToken 
      });
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create group');
    }
  };

  const handleJoinGroup = async () => {
    try {
      const url = new URL(joinLink);
      const pathMatch = url.pathname.match(/\/g\/([a-f0-9-]+)/i);
      const token = url.searchParams.get('t');
      
      if (!pathMatch || !token) {
        Alert.alert('Error', 'Invalid group link');
        return;
      }
      
      const groupId = pathMatch[1];
      const success = await loadGroup(groupId, token);
      
      if (success) {
        navigation.navigate('Group', { groupId, token });
      } else {
        Alert.alert('Error', 'Could not access group. Invalid link or token.');
      }
    } catch {
      Alert.alert('Error', 'Invalid link format');
    }
  };

  const handleOpenRecent = async (groupId: string, token: string) => {
    const success = await loadGroup(groupId, token);
    if (success) {
      navigation.navigate('Group', { groupId, token });
    } else {
      removeFromRecent(groupId);
      Alert.alert('Error', 'This group is no longer accessible');
    }
  };

  const cycleTheme = () => {
    setThemePreference(mode === 'light' ? 'dark' : 'light');
  };

  const getThemeIcon = () => {
    return mode === 'dark' ? '🌙' : '☀️';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <LogoIcon size={32} />
            <Text style={[styles.logo, { color: theme.colors.primary.a0 }]}>TeilFair</Text>
          </View>
          <TouchableOpacity 
            style={[styles.themeButton, { backgroundColor: theme.colors.surfaceTonal.a10 }]}
            onPress={cycleTheme}
          >
            <Text style={styles.themeIcon}>{getThemeIcon()}</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Split expenses fairly
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary.a0 }]}
            onPress={() => { setShowCreate(true); setShowJoin(false); }}
          >
            <Text style={styles.primaryButtonText}>Create Group</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.buttonOutline, { borderColor: theme.colors.border }]}
            onPress={() => { setShowJoin(true); setShowCreate(false); }}
          >
            <Text style={[styles.outlineButtonText, { color: theme.colors.text }]}>
              Join Group
            </Text>
          </TouchableOpacity>
        </View>

        {showCreate && (
          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Create New Group</Text>
            <TextInput
              style={[
                styles.input,
                { 
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                }
              ]}
              placeholder="Group name"
              placeholderTextColor={theme.colors.textSecondary}
              value={groupName}
              onChangeText={setGroupName}
            />
            <Text style={[styles.label, { color: theme.colors.text }]}>Currency</Text>
            <View style={styles.currencyRow}>
              {CURRENCIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.currencyButton,
                    { 
                      backgroundColor: currency === c 
                        ? theme.colors.primary.a0 
                        : theme.colors.surfaceTonal.a10,
                      borderColor: currency === c 
                        ? theme.colors.primary.a0 
                        : theme.colors.border,
                    },
                  ]}
                  onPress={() => setCurrency(c)}
                >
                  <Text style={[
                    styles.currencyButtonText,
                    { color: currency === c ? '#fff' : theme.colors.text },
                  ]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.colors.primary.a0 }]}
                onPress={handleCreateGroup}
                disabled={loading}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? 'Creating...' : 'Create'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonOutline, { borderColor: theme.colors.border }]}
                onPress={() => setShowCreate(false)}
              >
                <Text style={[styles.outlineButtonText, { color: theme.colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {showJoin && (
          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Join Existing Group</Text>
            <TextInput
              style={[
                styles.input,
                { 
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                }
              ]}
              placeholder="Paste group link here"
              placeholderTextColor={theme.colors.textSecondary}
              value={joinLink}
              onChangeText={setJoinLink}
              autoCapitalize="none"
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.colors.primary.a0 }]}
                onPress={handleJoinGroup}
                disabled={loading}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? 'Joining...' : 'Join'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonOutline, { borderColor: theme.colors.border }]}
                onPress={() => setShowJoin(false)}
              >
                <Text style={[styles.outlineButtonText, { color: theme.colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {recentGroups.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Recent Groups</Text>
            {recentGroups.map((item) => (
              <View 
                key={item.id}
                style={[styles.recentItem, { borderBottomColor: theme.colors.border }]}
              >
                <View style={styles.recentInfo}>
                  <Text style={[styles.recentName, { color: theme.colors.text }]}>
                    {item.name}
                  </Text>
                  <View style={[
                    styles.badge,
                    { 
                      backgroundColor: 'transparent',
                      borderColor: item.permission === 'write' 
                        ? theme.colors.success.a10 
                        : theme.colors.info.a10,
                      borderWidth: 1,
                      borderStyle: 'dashed',
                    },
                  ]}>
                    <Text style={[
                      styles.badgeText,
                      { 
                        color: item.permission === 'write' 
                          ? theme.colors.success.a0 
                          : theme.colors.info.a0 
                      }
                    ]}>
                      {item.permission === 'write' ? 'edit' : 'view'}
                    </Text>
                  </View>
                </View>
                <View style={styles.recentButtons}>
                  <TouchableOpacity
                    style={[styles.smallButton, { backgroundColor: theme.colors.primary.a0 }]}
                    onPress={() => handleOpenRecent(item.id, item.token)}
                  >
                    <Text style={styles.primaryButtonText}>Open</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallButton, { backgroundColor: theme.colors.surfaceTonal.a10 }]}
                    onPress={() => removeFromRecent(item.id)}
                  >
                    <Text style={{ color: theme.colors.text, fontWeight: '500' }}>
                      Remove
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* How it works */}
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>How it works</Text>
          {[
            'Create a group and share the link with friends',
            'Add expenses as they happen',
            'Split costs equally or with custom amounts',
            'See who owes whom and settle up',
          ].map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary.a0 }]}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={[styles.stepText, { color: theme.colors.textSecondary }]}>{step}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    fontSize: 28,
    fontWeight: '700',
  },
  themeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeIcon: {
    fontSize: 20,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  smallButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  outlineButtonText: {
    fontWeight: '600',
    fontSize: 15,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  currencyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  currencyButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  currencyButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  recentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  recentName: {
    fontSize: 16,
    fontWeight: '500',
  },
  recentButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
