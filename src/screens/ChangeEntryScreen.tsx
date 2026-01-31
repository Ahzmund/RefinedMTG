import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { useDeck } from '../hooks/useDecks';
import { useApplyChanges } from '../hooks/useChangelogs';
import { CardChangeItemDto } from '../types';
import CardSectionList from '../components/CardSectionList';
import CardAutocomplete from '../components/CardAutocomplete';
import CardDetailModal from '../components/CardDetailModal';
import { Ionicons } from '@expo/vector-icons';
import { CardEntity, CardDetails } from '../types';

type ChangeEntryRouteProp = RouteProp<RootStackParamList, 'ChangeEntry'>;

interface CardInput extends CardChangeItemDto {
  id: string;
}

interface CardSuggestion {
  id: string;
  name: string;
  typeLine: string;
  manaCost: string;
  cmc: number;
}

const ChangeEntryScreen: React.FC = () => {
  const route = useRoute<ChangeEntryRouteProp>();
  const navigation = useNavigation();
  const { deckId } = route?.params ?? {};
  const { data: deck } = useDeck(deckId);
  const { mutate: applyChanges, isPending } = useApplyChanges();

  // Selected card for adding
  // Overall change description
  const [overallDescription, setOverallDescription] = useState('');

  const [selectedAddCard, setSelectedAddCard] = useState<CardSuggestion | null>(null);
  const [addCardQuery, setAddCardQuery] = useState('');
  const [addCardQuantity, setAddCardQuantity] = useState('1');
  const [addCardReasoning, setAddCardReasoning] = useState('');
  const [cardsToAdd, setCardsToAdd] = useState<CardInput[]>([]);

  // Selected card for removing
  const [selectedRemoveCard, setSelectedRemoveCard] = useState<CardSuggestion | null>(null);
  const [removeCardQuery, setRemoveCardQuery] = useState('');
  const [removeCardQuantity, setRemoveCardQuantity] = useState('1');
  const [removeCardReasoning, setRemoveCardReasoning] = useState('');
  const [cardsToRemove, setCardsToRemove] = useState<CardInput[]>([]);

  // Card detail modal
  const [selectedCard, setSelectedCard] = useState<CardDetails | null>(null);
  const [isLoadingCardDetails, setIsLoadingCardDetails] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'changes' | 'decklist'>('changes');

  // Convert deck cards to suggestion format for removal autocomplete
  const deckCardSuggestions = useMemo<CardSuggestion[]>(() => {
    if (!deck?.cards) return [];
    return deck.cards.map((deckCard) => ({
      id: deckCard.card?.id || '',
      name: deckCard.card?.name || '',
      typeLine: deckCard.card?.typeLine || '',
      manaCost: deckCard.card?.manaCost || '',
      cmc: 0,
    }));
  }, [deck]);

  const handleSelectAddCard = (card: CardSuggestion) => {
    setSelectedAddCard(card);
  };

  const handleSelectRemoveCard = (card: CardSuggestion) => {
    setSelectedRemoveCard(card);
  };

  const handleAddCard = async () => {
    if (!selectedAddCard) {
      Alert.alert('Error', 'Please select a card');
      return;
    }

    const quantity = parseInt(addCardQuantity, 10);
    if (isNaN(quantity) || quantity < 1) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    // Fetch full card details from Scryfall if not already populated
    let typeLine = selectedAddCard.typeLine;
    let manaCost = selectedAddCard.manaCost;
    
    if (!typeLine || !manaCost) {
      try {
        const { searchCardByName } = await import('../services/scryfallService');
        const fullCard = await searchCardByName(selectedAddCard.name);
        if (fullCard) {
          typeLine = fullCard.type_line || '';
          manaCost = fullCard.mana_cost || '';
        }
      } catch (error) {
        console.error('Error fetching card details:', error);
      }
    }

    const newCard: CardInput = {
      id: Date.now().toString(),
      name: selectedAddCard.name,
      typeLine,
      manaCost,
      quantity,
      reasoning: addCardReasoning.trim(),
    };

    setCardsToAdd([...cardsToAdd, newCard]);
    setSelectedAddCard(null);
    setAddCardQuery('');
    setAddCardQuantity('1');
    setAddCardReasoning('');
  };

  const handleRemoveCard = () => {
    if (!selectedRemoveCard) {
      Alert.alert('Error', 'Please select a card');
      return;
    }

    const quantity = parseInt(removeCardQuantity, 10);
    if (isNaN(quantity) || quantity < 1) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    const newCard: CardInput = {
      id: Date.now().toString(),
      name: selectedRemoveCard.name,
      typeLine: selectedRemoveCard.typeLine,
      manaCost: selectedRemoveCard.manaCost,
      quantity,
      reasoning: removeCardReasoning.trim(),
    };

    setCardsToRemove([...cardsToRemove, newCard]);
    setSelectedRemoveCard(null);
    setRemoveCardQuery('');
    setRemoveCardQuantity('1');
    setRemoveCardReasoning('');
  };

  const handleDeleteAddCard = (id: string) => {
    setCardsToAdd(cardsToAdd.filter((card) => card.id !== id));
  };

  const handleDeleteRemoveCard = (id: string) => {
    setCardsToRemove(cardsToRemove.filter((card) => card.id !== id));
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
    } finally {
      setIsLoadingCardDetails(false);
    }
  };

  const handleApplyChanges = () => {
    if (cardsToAdd.length === 0 && cardsToRemove.length === 0) {
      Alert.alert('Error', 'Please add at least one card change');
      return;
    }

    applyChanges(
      {
        deckId,
        changes: {
          changeDate: new Date().toISOString(),
          description: overallDescription.trim() || undefined,
          cardsToAdd: cardsToAdd.map(({ id, ...card }) => card),
          cardsToRemove: cardsToRemove.map(({ id, ...card }) => card),
        },
      },
      {
        onSuccess: () => {
          // Navigate back immediately without alert to ensure smooth transition
          navigation.goBack();
        },
        onError: (error) => {
          Alert.alert('Error', error?.message || 'Failed to apply changes');
        },
      }
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tab, activeTab === 'changes' && styles.activeTab]}
            onPress={() => setActiveTab('changes')}
          >
            <Text style={[styles.tabText, activeTab === 'changes' && styles.activeTabText]}>
              Make Changes
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'decklist' && styles.activeTab]}
            onPress={() => setActiveTab('decklist')}
          >
            <Text style={[styles.tabText, activeTab === 'decklist' && styles.activeTabText]}>
              Current Decklist
            </Text>
          </Pressable>
        </View>
        
        {/* Tab Content */}
        {activeTab === 'changes' ? (
          <View style={styles.tabContent}>
            <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
              {/* Overall Change Description */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Change Description (Optional)</Text>
                <Text style={styles.sectionSubtitle}>
                  Describe the overall reasoning behind this set of changes
                </Text>
                <TextInput
                  style={styles.descriptionInput}
                  placeholder="e.g., Updated for new meta, adjusted for more combo potential..."
                  placeholderTextColor="#999"
                  value={overallDescription}
                  onChangeText={setOverallDescription}
                  multiline
                  numberOfLines={3}
                  editable={!isPending}
                />
              </View>

              {/* Cards to Remove */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Cards to Remove</Text>

                {cardsToRemove.map((card) => (
                  <View key={card.id} style={styles.cardChip}>
                    <View style={styles.cardChipContent}>
                      <Text style={styles.cardChipName}>
                        {card.name} ×{card.quantity}
                      </Text>
                      <Text style={styles.cardChipDetails}>
                        {card.typeLine} {card.manaCost ? `• ${card.manaCost}` : ''}
                      </Text>
                      <Text style={styles.cardChipReason} numberOfLines={2}>
                        {card.reasoning}
                      </Text>
                    </View>
                    <Pressable onPress={() => handleDeleteRemoveCard(card.id)}>
                      <Ionicons name="close-circle" size={24} color="#d32f2f" />
                    </Pressable>
                  </View>
                ))}

                <View style={styles.inputGroup}>
                  <CardAutocomplete
                    label="Select Card from Deck"
                    placeholder="Start typing card name..."
                    deckCards={deckCardSuggestions}
                    onSelectCard={handleSelectRemoveCard}
                    disabled={isPending}
                    value={removeCardQuery}
                    onChangeText={setRemoveCardQuery}
                  />

                  {selectedRemoveCard && (
                    <View style={styles.selectedCardInfo}>
                      <Text style={styles.selectedCardName}>{selectedRemoveCard.name}</Text>
                      <Text style={styles.selectedCardDetails}>
                        {selectedRemoveCard.typeLine} {selectedRemoveCard.manaCost ? `• ${selectedRemoveCard.manaCost}` : ''}
                      </Text>
                    </View>
                  )}

                  <TextInput
                    style={styles.inputSmall}
                    placeholder="Quantity"
                    value={removeCardQuantity}
                    onChangeText={setRemoveCardQuantity}
                    keyboardType="number-pad"
                    editable={!isPending}
                  />
                  <TextInput
                    style={styles.textArea}
                    placeholder="Reasoning for removal..."
                    value={removeCardReasoning}
                    onChangeText={setRemoveCardReasoning}
                    multiline
                    numberOfLines={3}
                    editable={!isPending}
                  />
                  <Pressable
                    style={[styles.addButton, (!selectedRemoveCard || isPending) && styles.addButtonDisabled]}
                    onPress={handleRemoveCard}
                    disabled={!selectedRemoveCard || isPending}
                  >
                    <Text style={styles.addButtonText}>Add to Remove List</Text>
                  </Pressable>
                </View>
              </View>

              {/* Cards to Add */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Cards to Add</Text>

                {cardsToAdd.map((card) => (
                  <View key={card.id} style={styles.cardChip}>
                    <View style={styles.cardChipContent}>
                      <Text style={styles.cardChipName}>
                        {card.name} ×{card.quantity}
                      </Text>
                      <Text style={styles.cardChipDetails}>
                        {card.typeLine} {card.manaCost ? `• ${card.manaCost}` : ''}
                      </Text>
                      <Text style={styles.cardChipReason} numberOfLines={2}>
                        {card.reasoning}
                      </Text>
                    </View>
                    <Pressable onPress={() => handleDeleteAddCard(card.id)}>
                      <Ionicons name="close-circle" size={24} color="#d32f2f" />
                    </Pressable>
                  </View>
                ))}

                <View style={styles.inputGroup}>
                  <CardAutocomplete
                    label="Search Any Card"
                    placeholder="Start typing card name..."
                    onSelectCard={handleSelectAddCard}
                    disabled={isPending}
                    value={addCardQuery}
                    onChangeText={setAddCardQuery}
                  />

                  {selectedAddCard && (
                    <View style={styles.selectedCardInfo}>
                      <Text style={styles.selectedCardName}>{selectedAddCard.name}</Text>
                      <Text style={styles.selectedCardDetails}>
                        {selectedAddCard.typeLine} {selectedAddCard.manaCost ? `• ${selectedAddCard.manaCost}` : ''}
                      </Text>
                    </View>
                  )}

                  <TextInput
                    style={styles.inputSmall}
                    placeholder="Quantity"
                    value={addCardQuantity}
                    onChangeText={setAddCardQuantity}
                    keyboardType="number-pad"
                    editable={!isPending}
                  />
                  <TextInput
                    style={styles.textArea}
                    placeholder="Reasoning for addition..."
                    value={addCardReasoning}
                    onChangeText={setAddCardReasoning}
                    multiline
                    numberOfLines={3}
                    editable={!isPending}
                  />
                  <Pressable
                    style={[styles.addButton, (!selectedAddCard || isPending) && styles.addButtonDisabled]}
                    onPress={handleAddCard}
                    disabled={!selectedAddCard || isPending}
                  >
                    <Text style={styles.addButtonText}>Add to Addition List</Text>
                  </Pressable>
                </View>
              </View>

              {/* Apply Changes Button */}
              <Pressable
                style={[styles.applyButton, (isPending || (cardsToAdd.length === 0 && cardsToRemove.length === 0)) && styles.applyButtonDisabled]}
                onPress={handleApplyChanges}
                disabled={isPending || (cardsToAdd.length === 0 && cardsToRemove.length === 0)}
              >
                {isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.applyButtonText}>
                    Apply Changes ({cardsToAdd.length + cardsToRemove.length})
                  </Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        ) : (
          <View style={styles.tabContent}>
            {deck?.cards ? (
              <CardSectionList cards={deck.cards.map(dc => ({
                name: dc.card?.name || 'Unknown',
                typeLine: dc.card?.typeLine || '',
                manaCost: dc.card?.manaCost || '',
                quantity: dc.quantity,
                isCommander: dc.isCommander,
                cardType: dc.card?.cardType || 'Other',
              }))} onCardPress={handleCardPress} />
            ) : (
              <ActivityIndicator size="large" color="#6200ee" style={styles.loader} />
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Card Detail Modal */}
      <CardDetailModal
        visible={showCardModal}
        cardDetails={selectedCard}
        isLoading={isLoadingCardDetails}
        showImage={true}
        onClose={() => {
          setShowCardModal(false);
          setSelectedCard(null);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#6200ee',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#6200ee',
  },
  tabContent: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#1a1a1a',
    backgroundColor: '#fff',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputGroup: {
    marginTop: 12,
  },
  selectedCardInfo: {
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  selectedCardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1b5e20',
    marginBottom: 4,
  },
  selectedCardDetails: {
    fontSize: 14,
    color: '#2e7d32',
  },
  inputSmall: {
    height: 48,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  addButton: {
    height: 48,
    backgroundColor: '#6200ee',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  cardChipContent: {
    flex: 1,
  },
  cardChipName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  cardChipDetails: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  cardChipReason: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  applyButton: {
    height: 56,
    backgroundColor: '#00c853',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 16,
  },
  applyButtonDisabled: {
    opacity: 0.5,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loader: {
    marginTop: 32,
  },
});

export default ChangeEntryScreen;
