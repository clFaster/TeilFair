import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import type { LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import './src/i18n'; // Initialize i18n before rendering

import { HomeScreen } from './src/screens/HomeScreen';
import { GroupScreen } from './src/screens/GroupScreen';
import { AddExpenseScreen } from './src/screens/AddExpenseScreen';
import { EditExpenseScreen } from './src/screens/EditExpenseScreen';
import { ExpenseDetailsScreen } from './src/screens/ExpenseDetailsScreen';
import { EditGroupScreen } from './src/screens/EditGroupScreen';

export type RootStackParamList = {
  Home: undefined;
  Group: { groupId: string; token?: string; t?: string };
  AddExpense: undefined;
  EditExpense: { expenseId: string };
  ExpenseDetails: { expenseId: string };
  EditGroup: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['https://teilfair.app', 'teilfair://'],
  config: {
    screens: {
      Home: '',
      Group: 'g/:groupId',
    },
  },
};

function AppContent() {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  
  return (
    <>
      <NavigationContainer linking={linking}>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: theme.colors.primary.a0,
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: '600',
            },
          }}
        >
          <Stack.Screen 
            name="Home" 
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Group" 
            component={GroupScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="AddExpense" 
            component={AddExpenseScreen}
            options={{ 
              title: t('expense.addExpense'),
              presentation: 'modal',
            }}
          />
          <Stack.Screen 
            name="EditExpense" 
            component={EditExpenseScreen}
            options={{ 
              title: t('expense.editExpense'),
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="ExpenseDetails"
            component={ExpenseDetailsScreen}
            options={{
              title: t('expense.viewExpense'),
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="EditGroup"
            component={EditGroupScreen}
            options={{
              title: t('group.editGroup'),
              presentation: 'modal',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
