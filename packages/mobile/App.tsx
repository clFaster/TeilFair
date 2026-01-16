import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';

import { HomeScreen } from './src/screens/HomeScreen';
import { GroupScreen } from './src/screens/GroupScreen';
import { AddExpenseScreen } from './src/screens/AddExpenseScreen';
import { EditExpenseScreen } from './src/screens/EditExpenseScreen';

export type RootStackParamList = {
  Home: undefined;
  Group: { groupId: string; token: string };
  AddExpense: undefined;
  EditExpense: { expenseId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppContent() {
  const { theme, isDark } = useTheme();
  
  return (
    <>
      <NavigationContainer>
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
              title: 'Add Expense',
              presentation: 'modal',
            }}
          />
          <Stack.Screen 
            name="EditExpense" 
            component={EditExpenseScreen}
            options={{ 
              title: 'Edit Expense',
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
