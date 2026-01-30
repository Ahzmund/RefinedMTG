import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import DeckListScreen from '../screens/DeckListScreen';
import DeckDetailScreen from '../screens/DeckDetailScreen';
import ChangeEntryScreen from '../screens/ChangeEntryScreen';
import ImportDeckModal from '../screens/ImportDeckModal';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="DeckList"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#6200ee',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="DeckList"
          component={DeckListScreen}
          options={{ title: 'My Decks' }}
        />
        <Stack.Screen
          name="DeckDetail"
          component={DeckDetailScreen}
          options={({ route }) => ({ title: route.params.deckName })}
        />
        <Stack.Screen
          name="ChangeEntry"
          component={ChangeEntryScreen}
          options={{ title: 'Add Change' }}
        />
        <Stack.Screen
          name="ImportDeck"
          component={ImportDeckModal}
          options={{
            presentation: 'modal',
            title: 'Import Deck',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
