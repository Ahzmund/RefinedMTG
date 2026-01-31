import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase } from './src/database/database';

// Suppress VirtualizedList warning (known React Native issue with nested lists)
LogBox.ignoreLogs([
  'VirtualizedLists should never be nested',
]);

// Screens
import DeckListScreen from './src/screens/DeckListScreen';
import DeckDetailScreen from './src/screens/DeckDetailScreen';
import ImportDeckModal from './src/screens/ImportDeckModal';
import ChangeEntryScreen from './src/screens/ChangeEntryScreen';

const Stack = createNativeStackNavigator();
const queryClient = new QueryClient();

export default function App() {
  const [dbInitialized, setDbInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await initDatabase();
        setDbInitialized(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };

    init();
  }, []);

  if (!dbInitialized) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6200ee" />
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
  },
});
