import React from 'react';
import { View, Text, StyleSheet, SectionList, Pressable } from 'react-native';
import { CardEntity } from '../types';
import { cardTypeToSectionData } from '../utils/cardTypeSort';
import ManaSymbols from './ManaSymbols';

interface CardSectionListProps {
  cards: CardEntity[];
  onCardPress?: (card: CardEntity) => void;
  onCardLongPress?: (card: CardEntity) => void;
}

const CardSectionList: React.FC<CardSectionListProps> = ({ cards, onCardPress, onCardLongPress }) => {
  // Separate commanders, sideboard, and mainboard cards
  const commanders = cards?.filter(card => card.isCommander === true) ?? [];
  const sideboardCards = cards?.filter(card => card.isSideboard === true && card.isCommander !== true) ?? [];
  const mainboardCards = cards?.filter(card => card.isCommander !== true && card.isSideboard !== true) ?? [];
  
  // Get sections for mainboard cards
  const mainboardSections = cardTypeToSectionData(mainboardCards);
  
  // Build sections: Command Zone → Mainboard → Sideboard
  let sections = [];
  
  // Add Command Zone section if commanders exist
  if (commanders.length > 0) {
    sections.push({ title: 'Command Zone', data: commanders });
  }
  
  // Add mainboard sections
  sections = [...sections, ...mainboardSections];
  
  // Add Sideboard section if sideboard cards exist
  if (sideboardCards.length > 0) {
    sections.push({ title: 'Sideboard', data: sideboardCards });
  }

  const renderCard = ({ item }: { item: CardEntity }) => (
    <Pressable
      style={({ pressed }) => [
        styles.cardItem,
        item.isCommander && styles.commanderCard,
        pressed && styles.cardItemPressed,
      ]}
      onPress={() => onCardPress?.(item)}
      onLongPress={() => onCardLongPress?.(item)}
    >
      <View style={styles.cardNameContainer}>
        {item.isCommander && <Text style={styles.crownIcon}>👑</Text>}
        <Text style={[styles.cardName, item.isCommander && styles.commanderName]}>{item.name}</Text>
      </View>
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
  commanderCard: {
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: '#FFFEF0',
  },
  cardNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  crownIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  commanderName: {
    color: '#B8860B',
    fontWeight: '600',
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
