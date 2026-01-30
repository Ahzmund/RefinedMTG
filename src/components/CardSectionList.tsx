import React from 'react';
import { View, Text, StyleSheet, SectionList, Pressable } from 'react-native';
import { CardEntity } from '../types';
import { cardTypeToSectionData } from '../utils/cardTypeSort';
import ManaSymbols from './ManaSymbols';

interface CardSectionListProps {
  cards: CardEntity[];
  onCardPress?: (card: CardEntity) => void;
}

const CardSectionList: React.FC<CardSectionListProps> = ({ cards, onCardPress }) => {
  // Separate commanders from other cards
  const commanders = cards?.filter(card => card.isCommander === true) ?? [];
  const nonCommanderCards = cards?.filter(card => card.isCommander !== true) ?? [];
  
  // Get sections for non-commander cards
  const cardSections = cardTypeToSectionData(nonCommanderCards);
  
  // Add commander section at the top if commanders exist
  const sections = commanders.length > 0
    ? [{ title: 'Commander', data: commanders }, ...cardSections]
    : cardSections;

  const renderCard = ({ item }: { item: CardEntity }) => (
    <Pressable
      style={({ pressed }) => [
        styles.cardItem,
        pressed && styles.cardItemPressed,
      ]}
      onPress={() => onCardPress?.(item)}
    >
      <Text style={styles.cardName}>{item.name}</Text>
      <View style={styles.rightInfo}>
        <ManaSymbols manaCost={item.manaCost || ''} size={16} />
        <Text style={styles.cardQuantity}>×{item.quantity}</Text>
      </View>
    </Pressable>
  );

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  if (cards.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No cards in this deck</Text>
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item, index) => `${item.name}-${index}`}
      renderItem={renderCard}
      renderSectionHeader={renderSectionHeader}
      stickySectionHeadersEnabled={true}
      contentContainerStyle={styles.listContent}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 16,
  },
  sectionHeader: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  cardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  cardItemPressed: {
    backgroundColor: '#e8f5e9',
  },
  cardName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 12,
  },
  rightInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardQuantity: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6200ee',
    minWidth: 30,
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

export default CardSectionList;
