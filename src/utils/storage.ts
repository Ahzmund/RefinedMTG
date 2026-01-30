import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  USER_ID: '@mtg_deck_manager:userId',
  DECKS_CACHE: '@mtg_deck_manager:decks_cache',
};

export const storage = {
  // User ID
  getUserId: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(KEYS.USER_ID);
    } catch (error) {
      console.error('Error getting userId:', error);
      return null;
    }
  },

  setUserId: async (userId: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(KEYS.USER_ID, userId);
    } catch (error) {
      console.error('Error setting userId:', error);
    }
  },

  // Decks cache
  getDecksCache: async (): Promise<any> => {
    try {
      const data = await AsyncStorage.getItem(KEYS.DECKS_CACHE);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting decks cache:', error);
      return null;
    }
  },

  setDecksCache: async (decks: any): Promise<void> => {
    try {
      await AsyncStorage.setItem(KEYS.DECKS_CACHE, JSON.stringify(decks));
    } catch (error) {
      console.error('Error setting decks cache:', error);
    }
  },

  clearAll: async (): Promise<void> => {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },
};
