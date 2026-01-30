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
      .map(card => `${card.quantity} ${card.card?.name || 'Unknown Card'}`)
      .join('\n');
    
    try {
      await Clipboard.setStringAsync(decklistText);
      setShowToast(true);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      Alert.alert('Error', 'Failed to copy decklist');
    }
  };

  const handleCardLongPress = async (card: CardEntity) => {
    // Count current commanders
    const commanderCount = deck?.cards.filter(dc => dc.isCommander).length || 0;
    
    if (card.isCommander) {
      // Show "Remove as Commander" option
      Alert.alert(
        'Commander Options',
        `Remove ${card.name} as commander?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove as Commander',
            style: 'destructive',
            onPress: async () => {
              try {
                const { toggleCommander } = await import('../database/deckService');
                const deckCard = deck?.cards.find(dc => dc.card?.name === card.name);
                if (deckCard) {
                  await toggleCommander(deckId, deckCard.id, false);
                  refetch();
                }
              } catch (error) {
                console.error('Error removing commander:', error);
                Alert.alert('Error', 'Failed to remove commander');
              }
            },
          },
        ]
      );
    } else if (commanderCount < 2) {
      // Show "Set as Commander" option (only if < 2 commanders)
      Alert.alert(
        'Commander Options',
        `Set ${card.name} as commander?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Set as Commander',
            onPress: async () => {
              try {
                const { toggleCommander } = await import('../database/deckService');
                const deckCard = deck?.cards.find(dc => dc.card?.name === card.name);
                if (deckCard) {
                  await toggleCommander(deckId, deckCard.id, true);
                  refetch();
                }
              } catch (error) {
                console.error('Error setting commander:', error);
                Alert.alert('Error', 'Failed to set commander');
              }
            },
          },
        ]
      );
    } else {
      // Already have 2 commanders
      Alert.alert('Maximum Commanders', 'You can only have up to 2 commanders in a deck.');
    }
  };

  const handleCardPress = async (card: CardEntity) => {
    setIsLoadingCardDetails(true);
    setShowCardModal(true);
    
    try {
      // Find the full card data from deck.cards
      const deckCard = deck?.cards.find(dc => dc.card?.name === card.name);
      
      if (deckCard?.card) {
        // Check if we need to fetch details from Scryfall (missing oracle text)
        if (!deckCard.card.oracleText) {
          console.log(`Fetching details for ${deckCard.card.name} from Scryfall...`);
          const { fetchAndUpdateCardDetails } = await import('../database/cardService');
          const updatedCard = await fetchAndUpdateCardDetails(deckCard.card.id, deckCard.card.name);
          
          if (updatedCard) {
            console.log('Fetched card from Scryfall:', JSON.stringify(updatedCard, null, 2));
            setSelectedCard({
              name: updatedCard.name,
              typeLine: updatedCard.typeLine || '',
              manaCost: updatedCard.manaCost,
              oracleText: updatedCard.oracleText,
              power: updatedCard.power,
              toughness: updatedCard.toughness,
              loyalty: updatedCard.loyalty,
              defense: updatedCard.defense,
              largeImageUrl: updatedCard.largeImageUrl,
            });
            // Refetch deck to update cache with new card details
            refetch();
          } else {
            // Fallback to existing data
            setSelectedCard({
              name: deckCard.card.name,
              typeLine: deckCard.card.typeLine || '',
              manaCost: deckCard.card.manaCost,
              oracleText: deckCard.card.oracleText,
              power: deckCard.card.power,
              toughness: deckCard.card.toughness,
              loyalty: deckCard.card.loyalty,
              defense: deckCard.card.defense,
              largeImageUrl: deckCard.card.largeImageUrl,
            });
          }
        } else {
          // Already has oracle text, use cached data
          setSelectedCard({
            name: deckCard.card.name,
            typeLine: deckCard.card.typeLine || '',
            manaCost: deckCard.card.manaCost,
            oracleText: deckCard.card.oracleText,
            power: deckCard.card.power,
            toughness: deckCard.card.toughness,
            loyalty: deckCard.card.loyalty,
            defense: deckCard.card.defense,
            largeImageUrl: deckCard.card.largeImageUrl,
          });
        }
      } else {
        setSelectedCard(card as any);
      }
    } catch (error) {
      console.error('Error fetching card details:', error);
      Alert.alert('Error', 'Failed to load card details');
    } finally {
      setIsLoadingCardDetails(false);
    }
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

  // Transform DeckCard[] to CardEntity[] for CardSectionList
  const cardEntities: CardEntity[] = deck.cards?.map(deckCard => ({
    name: deckCard.card?.name || 'Unknown Card',
    typeLine: deckCard.card?.typeLine || '',
    manaCost: deckCard.card?.manaCost || '',
    quantity: deckCard.quantity,
    isCommander: deckCard.isCommander,
    cardType: deckCard.card?.cardType || 'Other',
  })) || [];

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
        <CardSectionList cards={cardEntities} onCardPress={handleCardPress} onCardLongPress={handleCardLongPress} />
      ) : (
        <ScrollView style={styles.historyContainer}>
          {(deck.changelogs?.length || 0) === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No change history yet</Text>
              <Text style={styles.emptySubtext}>Track your deck changes over time</Text>
            </View>
          ) : (
            (deck.changelogs || []).map((change) => {
              // Transform Changelog to ChangeHistoryItem format
              const transformedChange = {
                id: change.id,
                changeDate: change.changeDate,
                description: change.description,
                isImportError: change.isImportError,
                cardsAdded: (change.cardsAdded || []).map(cc => ({
                  name: cc.card?.name || 'Unknown',
                  quantity: cc.quantity,
                  reasoning: cc.reasoning,
                  typeLine: cc.card?.typeLine,
                  manaCost: cc.card?.manaCost,
                })),
                cardsRemoved: (change.cardsRemoved || []).map(cc => ({
                  name: cc.card?.name || 'Unknown',
                  quantity: cc.quantity,
                  reasoning: cc.reasoning,
                  typeLine: cc.card?.typeLine,
                  manaCost: cc.card?.manaCost,
                })),
              };
              return <ChangeHistoryItem key={change.id} change={transformedChange} deckId={deckId} />;
            })
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
