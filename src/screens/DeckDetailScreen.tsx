import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Alert,
  Modal,
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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [categorizeBy, setCategorizeBy] = useState<'type' | 'manaValue'>('type');
  const [sortBy, setSortBy] = useState<'alphabetical' | 'manaValue'>('alphabetical');
  const { data: deck, isLoading, error, refetch } = useDeck(deckId);

  // Refetch deck details when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Auto-fetch missing card details when deck loads
  useEffect(() => {
    if (deck?.cards) {
      const fetchMissingDetails = async () => {
        const { fetchAndUpdateCardDetails } = await import('../database/cardService');
        
        for (const deckCard of deck.cards) {
          if (deckCard.card && !deckCard.card.oracleText) {
            try {
              await fetchAndUpdateCardDetails(deckCard.card.id, deckCard.card.name);
            } catch (error) {
              console.error(`Failed to fetch details for ${deckCard.card.name}:`, error);
            }
          }
        }
        
        // Refetch deck to get updated card details
        refetch();
      };
      
      fetchMissingDetails();
    }
  }, [deck?.id]); // Only run when deck ID changes

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
    const deckCard = deck?.cards.find(dc => dc.card?.name === card.name);
    
    if (!deckCard) return;
    
    // Build action sheet options
    const options: any[] = [];
    
    // Commander options
    if (card.isCommander) {
      options.push({
        text: 'Remove as Commander',
        style: 'destructive',
        onPress: async () => {
          try {
            const { toggleCommander } = await import('../database/deckService');
            const { addHotSwapAction } = await import('../database/changelogService');
            await toggleCommander(deckId, deckCard.id, false);
            await addHotSwapAction(deckId, deckCard.cardId, 'commander_removed');
            refetch();
          } catch (error) {
            console.error('Error removing commander:', error);
            Alert.alert('Error', 'Failed to remove commander');
          }
        },
      });
    } else if (commanderCount < 2) {
      options.push({
        text: 'Set as Commander',
        onPress: async () => {
          try {
            const { toggleCommander } = await import('../database/deckService');
            const { addHotSwapAction } = await import('../database/changelogService');
            await toggleCommander(deckId, deckCard.id, true);
            await addHotSwapAction(deckId, deckCard.cardId, 'commander_set');
            refetch();
          } catch (error) {
            console.error('Error setting commander:', error);
            Alert.alert('Error', 'Failed to set commander');
          }
        },
      });
    }
    
    // Sideboard swap options (not for commanders)
    if (!card.isCommander) {
      if (card.isSideboard) {
        options.push({
          text: 'Move to Mainboard',
          onPress: async () => {
            try {
              const { toggleSideboard } = await import('../database/deckService');
              const { addHotSwapAction } = await import('../database/changelogService');
              await toggleSideboard(deckId, deckCard.id, false);
              await addHotSwapAction(deckId, deckCard.cardId, 'moved_to_mainboard', deckCard.quantity);
              refetch();
            } catch (error) {
              console.error('Error moving to mainboard:', error);
              Alert.alert('Error', 'Failed to move card to mainboard');
            }
          },
        });
      } else {
        options.push({
          text: 'Move to Sideboard',
          onPress: async () => {
            try {
              const { toggleSideboard } = await import('../database/deckService');
              const { addHotSwapAction } = await import('../database/changelogService');
              await toggleSideboard(deckId, deckCard.id, true);
              await addHotSwapAction(deckId, deckCard.cardId, 'moved_to_sideboard', deckCard.quantity);
              refetch();
            } catch (error) {
              console.error('Error moving to sideboard:', error);
              Alert.alert('Error', 'Failed to move card to sideboard');
            }
          },
        });
      }
    }
    
    // Add cancel option
    options.push({ text: 'Cancel', style: 'cancel' });
    
    // Show action sheet
    Alert.alert('Card Options', `What would you like to do with ${card.name}?`, options);
  };

  const handleCardPress = async (card: CardEntity) => {
    setIsLoadingCardDetails(true);
    setShowCardModal(true);
    
    try {
      // Find the full card data from deck.cards
      const deckCard = deck?.cards.find(dc => dc.card?.name === card.name);
      
      if (deckCard?.card) {
        // Check if we need to fetch details from Scryfall
        // - Missing oracle text, OR
        // - MDFC card (has // in name) - need cardFaces which isn't stored in DB
        const isMDFC = deckCard.card.name.includes('//');
        if (!deckCard.card.oracleText || isMDFC) {
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
              cardFaces: updatedCard.cardFaces,
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
              cardFaces: deckCard.card.cardFaces,
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
            cardFaces: deckCard.card.cardFaces,
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
    cmc: deckCard.card?.cmc || 0,
    quantity: deckCard.quantity,
    isCommander: deckCard.isCommander,
    isSideboard: deckCard.isSideboard,
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
            <Pressable
              style={styles.moxfieldLink}
              onPress={() => setShowSettingsModal(true)}
              accessibilityRole="button"
              accessibilityLabel="Organization settings"
            >
              <Ionicons name="options-outline" size={20} color="#6200ee" />
              <Text style={styles.moxfieldText}>Settings</Text>
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
        <CardSectionList 
          cards={cardEntities} 
          categorizeBy={categorizeBy}
          sortBy={sortBy}
          onCardPress={handleCardPress} 
          onCardLongPress={handleCardLongPress} 
        />
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

      {/* Organization Settings Modal */}
      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowSettingsModal(false)}
        >
          <Pressable style={styles.settingsModal} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.settingsTitle}>Organization Settings</Text>
            
            {/* Categorize By */}
            <View style={styles.settingSection}>
              <Text style={styles.settingLabel}>Categorize By:</Text>
              <View style={styles.optionButtons}>
                <Pressable
                  style={[styles.optionButton, categorizeBy === 'type' && styles.optionButtonActive]}
                  onPress={() => setCategorizeBy('type')}
                >
                  <Text style={[styles.optionText, categorizeBy === 'type' && styles.optionTextActive]}>Type</Text>
                </Pressable>
                <Pressable
                  style={[styles.optionButton, categorizeBy === 'manaValue' && styles.optionButtonActive]}
                  onPress={() => setCategorizeBy('manaValue')}
                >
                  <Text style={[styles.optionText, categorizeBy === 'manaValue' && styles.optionTextActive]}>Mana Value</Text>
                </Pressable>
              </View>
            </View>

            {/* Sort By */}
            <View style={styles.settingSection}>
              <Text style={styles.settingLabel}>Sort By:</Text>
              <View style={styles.optionButtons}>
                <Pressable
                  style={[styles.optionButton, sortBy === 'alphabetical' && styles.optionButtonActive]}
                  onPress={() => setSortBy('alphabetical')}
                >
                  <Text style={[styles.optionText, sortBy === 'alphabetical' && styles.optionTextActive]}>Alphabetically</Text>
                </Pressable>
                <Pressable
                  style={[styles.optionButton, sortBy === 'manaValue' && styles.optionButtonActive]}
                  onPress={() => setSortBy('manaValue')}
                >
                  <Text style={[styles.optionText, sortBy === 'manaValue' && styles.optionTextActive]}>Mana Value</Text>
                </Pressable>
              </View>
            </View>

            {/* Close Button */}
            <Pressable
              style={styles.closeButton}
              onPress={() => setShowSettingsModal(false)}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
  },
  settingSection: {
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  optionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  optionButtonActive: {
    borderColor: '#6200ee',
    backgroundColor: '#f3e5f5',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  optionTextActive: {
    color: '#6200ee',
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
