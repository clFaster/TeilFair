/**
 * Theme Settings Component for Mobile
 * Allows users to switch between light, dark, and system theme preferences
 */

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import type { ThemePreference } from '../theme/useTheme';

export function ThemeSettings() {
  const { preference, setThemePreference, mode, systemColorScheme, theme } = useTheme();

  const options: { value: ThemePreference; label: string; icon: string }[] = [
    { value: 'light', label: 'Light', icon: '☀️' },
    { value: 'dark', label: 'Dark', icon: '🌙' },
    { value: 'system', label: 'System', icon: '💻' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceTonal.a0 }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        Theme
      </Text>
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            onPress={() => setThemePreference(option.value)}
            style={[
              styles.option,
              {
                backgroundColor: theme.colors.surface.a0,
                borderColor: preference === option.value 
                  ? theme.colors.primary.a0 
                  : theme.colors.border,
                borderWidth: preference === option.value ? 2 : 1,
              }
            ]}
          >
            <Text style={styles.icon}>{option.icon}</Text>
            <Text 
              style={[
                styles.label, 
                { 
                  color: theme.colors.text,
                  fontWeight: preference === option.value ? '600' : '400',
                }
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {preference === 'system' && (
        <Text style={[styles.currentMode, { color: theme.colors.textSecondary }]}>
          System is {systemColorScheme || 'light'}, using {mode} theme
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    gap: 4,
  },
  icon: {
    fontSize: 32,
  },
  label: {
    fontSize: 12,
  },
  currentMode: {
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
  },
});
