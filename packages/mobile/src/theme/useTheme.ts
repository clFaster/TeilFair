/**
 * TeilFair Mobile Theme Hook
 * React hook for managing theme in React Native
 */

import { useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type ThemeMode } from '@teilfair/shared';
import { nativeThemes, type NativeTheme } from './index';

const THEME_STORAGE_KEY = 'teilfair-theme-preference';

export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * Hook for managing theme in React Native
 */
export function useTheme() {
  const systemColorScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [isLoading, setIsLoading] = useState(true);

  // Determine actual mode based on preference
  // Handle null case from useColorScheme (defaults to light)
  const mode: ThemeMode = preference === 'system' 
    ? (systemColorScheme === 'dark' ? 'dark' : 'light')
    : preference;

  const theme: NativeTheme = nativeThemes[mode];

  // Load saved theme preference on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light' || saved === 'system') {
        setPreference(saved);
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    const newPreference: ThemePreference = 
      preference === 'light' ? 'dark' :
      preference === 'dark' ? 'system' : 'light';
    
    setPreference(newPreference);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newPreference);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const setThemePreference = async (newPreference: ThemePreference) => {
    setPreference(newPreference);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newPreference);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  return {
    theme,
    mode,
    preference,
    systemColorScheme,
    toggleTheme,
    setThemePreference,
    isDark: mode === 'dark',
    isLight: mode === 'light',
    isLoading,
  };
}
