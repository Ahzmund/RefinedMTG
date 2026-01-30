import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useDeck } from '../hooks/useDecks';
import CardSectionList from '../components/CardSectionList';
import ChangeHistoryItem from '../components/ChangeHistoryItem';
import CardDetailModal from '../components/CardDetailModal';
import FAB from '../components/FAB';
import SimpleToast from '../components/SimpleToast';
import { Ionicons } from '@expo/vector-icons';
import { CardEntity, CardDetails } from '../types';

type DeckDetailRouteProp = RouteProp<RootStackParamList, 'DeckDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'DeckDetail'>;

const DeckDetailScreen: React.FC = () => {
  const route = useRoute<DeckDetailRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { deckId, deckName } = route?.params ?? { deckId: '', deckName: '' };
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [showImageMode, setShowImageMode] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardDetails | null>(null);
  const [isLoadingCardDetails, setIsLoadingCardDetails] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const { data: deck, isLoading, error, refetch } = useDeck(deckId);

  // Refetch deck details when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handleAddChange = () => {
    navigation.navigate('ChangeEntry', { deckId, deckName });
  };

  const handleCopyDecklist = async () => {
    if (!deck) return;
    
    // Format: "quantity cardname" per line
    const decklistText = deck.cards
      .map(card => `${card.quantity} ${card.name}`)
      .join('\n');
    
    try {
      await Clipboard.setStringAsync(decklistText);
      setShowToast(true);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      Alert.alert('Error', 'Failed to copy decklist');
    }
  };

  const handleCardPress = async (card: CardEntity) => {
    setIsLoadingCardDetails(true);
    setShowCardModal(true);
    
    // Use card data already available from database
    setSelectedCard(card as any);
    setIsLoadingCardDetails(false);
  };

  const handleCloseCardModal = () => {
    setShowCardModal(false);
    setSelectedCard(null);
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading deck...</Text>
      </View>
    );
  }

  if (error || !deck) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load deck</Text>
        <Text style={styles.errorMessage}>{error?.message}</Text>
      </View>
    );
  }

  const totalCards = deck.cards?.reduce((sum, card) => sum + card.quantity, 0) || 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header info */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.cardCount}>{totalCards} cards</Text>
          <View style={styles.headerButtons}>
            <Pressable
              style={[styles.imageToggle, showImageMode && styles.imageToggleActive]}
              onPress={() => setShowImageMode(!showImageMode)}
              accessibilityRole="button"
              accessibilityLabel={showImageMode ? "Show text mode" : "Show image mode"}
            >
              <Ionicons 
                name={showImageMode ? "image" : "document-text-outline"} 
                size={20} 
                color={showImageMode ? "#fff" : "#6200ee"} 
              />
              <Text style={[styles.toggleText, showImageMode && styles.toggleTextActive]}>
                {showImageMode ? 'Image' : 'Text'}
              </Text>
            </Pressable>
            <Pressable
              style={styles.moxfieldLink}
              onPress={handleCopyDecklist}
              accessibilityRole="button"
              accessibilityLabel="Copy decklist to clipboard"
            >
              <Ionicons name="copy-outline" size={20} color="#6200ee" />
              <Text style={styles.moxfieldText}>Copy</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Tab navigation */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === 'current' && styles.tabActive]}
          onPress={() => setActiveTab('current')}
        >
          <Text style={[styles.tabText, activeTab === 'current' && styles.tabTextActive]}>
            Current Deck
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            Change History ({deck.changelogs?.length || 0})
          </Text>
        </Pressable>
      </View>

      {/* Tab content */}
      {activeTab === 'current' ? (
        <CardSectionList cards={deck.cards} onCardPress={handleCardPress} />
      ) : (
        <ScrollView style={styles.historyContainer}>
          {(deck.changelogs?.length || 0) === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No change history yet</Text>
              <Text style={styles.emptySubtext}>Track your deck changes over time</Text>
            </View>
          ) : (
            (deck.changelogs || []).map((change) => (
              <ChangeHistoryItem key={change.id} change={change} deckId={deckId} />
            ))
          )}
        </ScrollView>
      )}

      <FAB icon="add" onPress={handleAddChange} label="Add change" />

      <CardDetailModal
        visible={showCardModal}
        cardDetails={selectedCard}
        isLoading={isLoadingCardDetails}
        showImage={showImageMode}
        onClose={handleCloseCardModal}
      />

      <SimpleToast
        visible={showToast}
        message="Copied!"
        onDismiss={() => setShowToast(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  moxfieldLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  moxfieldText: {
    fontSize: 14,
    color: '#6200ee',
    fontWeight: '500',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  imageToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6200ee',
  },
  imageToggleActive: {
    backgroundColor: '#6200ee',
  },
  toggleText: {
    fontSize: 14,
    color: '#6200ee',
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#fff',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#6200ee',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  tabTextActive: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  historyContainer: {
    flex: 1,
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
});

export default DeckDetailScreen;
