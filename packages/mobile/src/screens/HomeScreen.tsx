import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useGroupStore } from '../store/groupStore';
import type { RootStackParamList } from '../../App';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY'];

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { createGroup, loadGroup, recentGroups, removeFromRecent, loading } = useGroupStore();
  
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>TeilFair</Text>
        <Text style={styles.subtitle}>Split expenses fairly</Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => { setShowCreate(true); setShowJoin(false); }}
        >
          <Text style={styles.primaryButtonText}>Create Group</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => { setShowJoin(true); setShowCreate(false); }}
        >
          <Text style={styles.secondaryButtonText}>Join Group</Text>
        </TouchableOpacity>
      </View>

      {showCreate && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create New Group</Text>
          <TextInput
            style={styles.input}
            placeholder="Group name"
            value={groupName}
            onChangeText={setGroupName}
          />
          <View style={styles.currencyRow}>
            {CURRENCIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.currencyButton,
                  currency === c && styles.currencyButtonActive,
                ]}
                onPress={() => setCurrency(c)}
              >
                <Text style={[
                  styles.currencyButtonText,
                  currency === c && styles.currencyButtonTextActive,
                ]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleCreateGroup}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Creating...' : 'Create'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => setShowCreate(false)}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showJoin && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Join Existing Group</Text>
          <TextInput
            style={styles.input}
            placeholder="Paste group link here"
            value={joinLink}
            onChangeText={setJoinLink}
            autoCapitalize="none"
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleJoinGroup}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Joining...' : 'Join'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => setShowJoin(false)}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {recentGroups.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Groups</Text>
          <FlatList
            data={recentGroups}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.recentItem}>
                <View style={styles.recentInfo}>
                  <Text style={styles.recentName}>{item.name}</Text>
                  <View style={[
                    styles.badge,
                    item.permission === 'write' ? styles.badgeWrite : styles.badgeRead,
                  ]}>
                    <Text style={styles.badgeText}>{item.permission}</Text>
                  </View>
                </View>
                <View style={styles.recentButtons}>
                  <TouchableOpacity
                    style={[styles.smallButton, styles.primaryButton]}
                    onPress={() => handleOpenRecent(item.id, item.token)}
                  >
                    <Text style={styles.primaryButtonText}>Open</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallButton, styles.secondaryButton]}
                    onPress={() => removeFromRecent(item.id)}
                  >
                    <Text style={styles.secondaryButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
    color: '#6366f1',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
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
  primaryButton: {
    backgroundColor: '#6366f1',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#e2e8f0',
  },
  secondaryButtonText: {
    color: '#1e293b',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#fff',
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
    borderColor: '#e2e8f0',
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
    backgroundColor: '#e2e8f0',
  },
  currencyButtonActive: {
    backgroundColor: '#6366f1',
  },
  currencyButtonText: {
    color: '#1e293b',
    fontWeight: '500',
  },
  currencyButtonTextActive: {
    color: '#fff',
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  recentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  badgeRead: {
    backgroundColor: '#dbeafe',
  },
  badgeWrite: {
    backgroundColor: '#dcfce7',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
