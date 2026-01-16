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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useGroupStore } from '../store/groupStore';
import { ThemeSettings } from '../components/ThemeSettings';
import { useTheme } from '../theme/ThemeProvider';
import type { RootStackParamList } from '../../App';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY'];

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { createGroup, loadGroup, recentGroups, removeFromRecent, loading } = useGroupStore();
  const { theme } = useTheme();
  
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

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.surface.a0 }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={[styles.logo, { color: theme.colors.primary.a0 }]}>TeilFair</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Split expenses fairly
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary.a0 }]}
          onPress={() => { setShowCreate(true); setShowJoin(false); }}
        >
          <Text style={styles.primaryButtonText}>Create Group</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.surface.a20 }]}
          onPress={() => { setShowJoin(true); setShowCreate(false); }}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>
            Join Group
          </Text>
        </TouchableOpacity>
      </View>

      {showCreate && (
        <View style={[styles.card, { backgroundColor: theme.colors.surfaceTonal.a0 }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Create New Group</Text>
          <TextInput
            style={[
              styles.input,
              { 
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface.a0,
                color: theme.colors.text,
              }
            ]}
            placeholder="Group name"
            placeholderTextColor={theme.colors.textSecondary}
            value={groupName}
            onChangeText={setGroupName}
          />
          <View style={styles.currencyRow}>
            {CURRENCIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.currencyButton,
                  { 
                    backgroundColor: currency === c 
                      ? theme.colors.primary.a0 
                      : theme.colors.surface.a20 
                  },
                ]}
                onPress={() => setCurrency(c)}
              >
                <Text style={[
                  styles.currencyButtonText,
                  { color: currency === c ? theme.colors.light : theme.colors.text },
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
              style={[styles.button, { backgroundColor: theme.colors.surface.a20 }]}
              onPress={() => setShowCreate(false)}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showJoin && (
        <View style={[styles.card, { backgroundColor: theme.colors.surfaceTonal.a0 }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Join Existing Group</Text>
          <TextInput
            style={[
              styles.input,
              { 
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface.a0,
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
              style={[styles.button, { backgroundColor: theme.colors.surface.a20 }]}
              onPress={() => setShowJoin(false)}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {recentGroups.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.colors.surfaceTonal.a0 }]}>
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
                    backgroundColor: item.permission === 'write' 
                      ? theme.colors.success.a20 
                      : theme.colors.info.a20 
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
                    {item.permission}
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
                  style={[styles.smallButton, { backgroundColor: theme.colors.surface.a20 }]}
                  onPress={() => removeFromRecent(item.id)}
                >
                  <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>
                    Remove
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <ThemeSettings />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 40,
  },
  logo: {
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  smallButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButtonText: {
    fontWeight: '500',
  },
  card: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  currencyButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  currencyButtonText: {
    fontWeight: '500',
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
    gap: 8,
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
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
