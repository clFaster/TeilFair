/**
 * Example: Using TeilFair Theme in a React Native Component
 */

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { createStyles } from '../theme';

// Define theme-aware styles
const createStyleSheet = createStyles((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface.a0,
    padding: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surfaceTonal.a0,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  title: {
    fontSize: theme.typography.fontSizes.xxl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  modeText: {
    fontSize: theme.typography.fontSizes.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  button: {
    backgroundColor: theme.colors.primary.a0,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  buttonText: {
    color: theme.colors.light,
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.medium,
  },
  statusText: {
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.medium,
    marginVertical: theme.spacing.xs,
  },
  successText: {
    color: theme.colors.success.a10,
  },
  warningText: {
    color: theme.colors.warning.a10,
  },
  dangerText: {
    color: theme.colors.danger.a10,
  },
  infoText: {
    color: theme.colors.info.a10,
  },
}));

export function ExampleThemeScreen() {
  const { theme, mode, toggleTheme, isDark, isLoading } = useTheme();
  
  // Create styles with current theme
  const styles = createStyleSheet(theme);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading theme...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TeilFair Theme Example</Text>
      
      <Text style={styles.modeText}>
        Current mode: {mode}
      </Text>

      <TouchableOpacity style={styles.button} onPress={toggleTheme}>
        <Text style={styles.buttonText}>
          Switch to {isDark ? 'Light' : 'Dark'} Mode
        </Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={[styles.title, { fontSize: theme.typography.fontSizes.lg }]}>
          Status Colors
        </Text>
        <Text style={[styles.statusText, styles.successText]}>
          Success Message
        </Text>
        <Text style={[styles.statusText, styles.warningText]}>
          Warning Message
        </Text>
        <Text style={[styles.statusText, styles.dangerText]}>
          Error Message
        </Text>
        <Text style={[styles.statusText, styles.infoText]}>
          Info Message
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={[styles.title, { fontSize: theme.typography.fontSizes.lg }]}>
          Theme Colors
        </Text>
        <Text style={{ color: theme.colors.text }}>
          Primary: {theme.colors.primary.a0}
        </Text>
        <Text style={{ color: theme.colors.textSecondary }}>
          Surface: {theme.colors.surface.a0}
        </Text>
      </View>
    </View>
  );
}
