import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { debounce } from 'lodash';
import { searchCards } from '../services/scryfallService';
import ManaSymbols from './ManaSymbols';

interface CardSuggestion {
  id: string;
  name: string;
  typeLine: string;
  manaCost: string;
  cmc: number;
}

interface CardAutocompleteProps {
  label: string;
  placeholder: string;
  deckCards?: CardSuggestion[]; // If provided, only show these cards (for removals)
  onSelectCard: (card: CardSuggestion) => void;
  disabled?: boolean;
}

const CardAutocomplete: React.FC<CardAutocompleteProps> = ({
  label,
  placeholder,
  deckCards,
  onSelectCard,
  disabled = false,
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<CardSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        if (deckCards) {
          // Filter deck cards for removals
          const filtered = deckCards.filter((card) =>
            card.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
          setSuggestions(filtered);
        } else {
          // Search Scryfall for additions
          const results = await searchCards(searchQuery);
          setSuggestions(
            results?.cards?.map((c: any) => ({
              id: c.id,
              name: c.name,
              typeLine: c.typeLine,
              manaCost: c.manaCost,
              cmc: c.cmc,
            })) ?? []
          );
        }
      } catch (error) {
        console.error('Search error:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [deckCards]
  );

  useEffect(() => {
    if (query.length >= 2) {
      debouncedSearch(query);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query, debouncedSearch]);

  const handleSelectCard = (card: CardSuggestion) => {
    setQuery(card.name);
    setShowSuggestions(false);
    setSuggestions([]);
    onSelectCard(card);
  };

  const renderSuggestionItem = ({ item }: { item: CardSuggestion }) => (
    <Pressable
      style={({ pressed }) => [
        styles.suggestionItem,
        pressed && styles.suggestionItemPressed,
      ]}
      onPress={() => handleSelectCard(item)}
    >
      <View style={styles.suggestionContent}>
        <View style={styles.suggestionTop}>
          <Text style={styles.cardName}>{item.name}</Text>
          <ManaSymbols manaCost={item.manaCost || ''} size={16} />
        </View>
        <Text style={styles.cardDetails}>{item.typeLine}</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, disabled && styles.inputDisabled]}
        placeholder={placeholder}
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          if (text.length < 2) {
            setShowSuggestions(false);
          }
        }}
        autoCapitalize="words"
        autoCorrect={false}
        editable={!disabled}
      />
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#6200ee" />
        </View>
      )}
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            renderItem={renderSuggestionItem}
            keyExtractor={(item) => item.id}
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}
      {showSuggestions && !isLoading && suggestions.length === 0 && query.length >= 2 && (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>No cards found</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    zIndex: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#999',
  },
  loadingContainer: {
    position: 'absolute',
    right: 12,
    top: 40,
  },
  suggestionsContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: '#fff',
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionsList: {
    flexGrow: 0,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionItemPressed: {
    backgroundColor: '#f5f5f5',
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  cardDetails: {
    fontSize: 13,
    color: '#666',
  },
  noResultsContainer: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: '#fff',
  },
  noResultsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default CardAutocomplete;
