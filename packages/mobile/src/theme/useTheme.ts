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

export type ThemePreference = 'light' | 'dark';

/**
 * Hook for managing theme in React Native
 * Initializes with system preference, then allows toggling between light/dark
 */
export function useTheme() {
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(() => {
    // Default to system preference on initial load
    return systemColorScheme === 'dark' ? 'dark' : 'light';
  });
  const [isLoading, setIsLoading] = useState(true);

  const theme: NativeTheme = nativeThemes[mode];

  // Load saved theme preference on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') {
        setMode(saved);
      }
      // If no saved preference, keep system default (already set in useState)
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    const newMode: ThemeMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const setThemePreference = async (newPreference: ThemePreference) => {
    setMode(newPreference);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newPreference);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  return {
    theme,
    mode,
    toggleTheme,
    setThemePreference,
    isDark: mode === 'dark',
    isLight: mode === 'light',
    isLoading,
  };
}
