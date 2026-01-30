import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, Text, Pressable, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { initDatabase } from './src/database/database';

// Screens
import DeckListScreen from './src/screens/DeckListScreen';
import DeckDetailScreen from './src/screens/DeckDetailScreen';
import ImportDeckModal from './src/screens/ImportDeckModal';
import ChangeEntryScreen from './src/screens/ChangeEntryScreen';

const Stack = createNativeStackNavigator();
const queryClient = new QueryClient();

export default function App() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetDatabase = async () => {
    try {
      console.log('Attempting to reset database...');
      const dbPath = `${FileSystem.documentDirectory}SQLite/refinedmtg.db`;
      const dbExists = await FileSystem.getInfoAsync(dbPath);
      
      if (dbExists.exists) {
        await FileSystem.deleteAsync(dbPath);
        console.log('Database file deleted');
      }
      
      // Reinitialize
      await initDatabase();
      setDbInitialized(true);
      setError(null);
      console.log('Database reset complete');
    } catch (err) {
      console.error('Failed to reset database:', err);
      setError(`Reset failed: ${err}`);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        console.log('Starting database initialization...');
        await initDatabase();
        console.log('Database initialized successfully');
        setDbInitialized(true);
      } catch (err) {
        console.error('Failed to initialize database:', err);
        setError(`Init failed: ${err}`);
      }
    };

    init();
  }, []);

  if (error) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>Database Error</Text>
        <Text style={styles.errorDetail}>{error}</Text>
        <Pressable style={styles.resetButton} onPress={resetDatabase}>
          <Text style={styles.resetButtonText}>Reset Database</Text>
        </Pressable>
      </View>
    );
  }

  if (!dbInitialized) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Initializing database...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <PaperProvider>
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="DeckList"
              screenOptions={{
                headerShown: false,
              }}
            >
              <Stack.Screen name="DeckList" component={DeckListScreen} />
              <Stack.Screen name="DeckDetail" component={DeckDetailScreen} />
              <Stack.Screen 
                name="ImportDeck" 
                component={ImportDeckModal}
                options={{ presentation: 'modal' }}
              />
              <Stack.Screen 
                name="ChangeEntry" 
                component={ChangeEntryScreen}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </PaperProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 10,
  },
  errorDetail: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  resetButton: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
