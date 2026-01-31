import React from 'react';
import { View, Text, StyleSheet, SectionList, Pressable } from 'react-native';
import { CardEntity, CardType } from '../types';
import { cardTypeToSectionData } from '../utils/cardTypeSort';
import { manaValueToSectionData } from '../utils/manaValueSort';
import ManaSymbols from './ManaSymbols';

interface CardSectionListProps {
  cards: CardEntity[];
  categorizeBy?: 'type' | 'manaValue';
  sortBy?: 'alphabetical' | 'manaValue';
  onCardPress?: (card: CardEntity) => void;
  onCardLongPress?: (card: CardEntity) => void;
}

const CardSectionList: React.FC<CardSectionListProps> = ({ 
  cards, 
  categorizeBy = 'type', 
  sortBy = 'alphabetical',
  onCardPress, 
  onCardLongPress 
}) => {
  // Separate commanders, sideboard, and mainboard cards
  const commanders = cards?.filter(card => card.isCommander === true) ?? [];
  const sideboardCards = cards?.filter(card => card.isSideboard === true && card.isCommander !== true) ?? [];
  const mainboardCards = cards?.filter(card => card.isCommander !== true && card.isSideboard !== true) ?? [];
  
  // Get sections for mainboard cards based on categorization setting
  let mainboardSections;
  
  if (categorizeBy === 'manaValue') {
    // Separate lands from non-lands
    const lands = mainboardCards.filter(card => card.cardType === CardType.Land);
    const nonLands = mainboardCards.filter(card => card.cardType !== CardType.Land);
    
    // Organize non-lands by mana value
    const manaValueSections = manaValueToSectionData(nonLands, sortBy);
    
    // Add lands section at the end (always sorted alphabetically)
    if (lands.length > 0) {
      const sortedLands = [...lands].sort((a, b) => a.name.localeCompare(b.name));
      mainboardSections = [...manaValueSections, { title: 'Land', data: sortedLands }];
    } else {
      mainboardSections = manaValueSections;
    }
  } else {
    // Organize by card type
    mainboardSections = cardTypeToSectionData(mainboardCards, sortBy);
  }
  
  // Sort sideboard alphabetically by name
  const sortedSideboardCards = [...sideboardCards].sort((a, b) => a.name.localeCompare(b.name));
  
  // Build sections: Command Zone → Mainboard → Sideboard
  let sections = [];
  
  // Add Command Zone section if commanders exist
  if (commanders.length > 0) {
    sections.push({ title: 'Command Zone', data: commanders, isTopLevel: true });
  }
  
  // Calculate total card counts
  const mainboardCount = mainboardCards.reduce((sum, card) => sum + card.quantity, 0);
  const sideboardCount = sideboardCards.reduce((sum, card) => sum + card.quantity, 0);
  
  // Add Mainboard parent label if mainboard cards exist
  if (mainboardCards.length > 0) {
    sections.push({ title: 'Mainboard', data: [], isTopLevel: true, isMainboardHeader: true, cardCount: mainboardCount });
    // Add mainboard type subsections with indentation and card counts
    sections = [...sections, ...mainboardSections.map(section => ({
      ...section,
      isSubSection: true,
      cardCount: section.data.reduce((sum: number, card: CardEntity) => sum + card.quantity, 0)
    }))];
  }
  
  // Add Sideboard section if sideboard cards exist (alphabetical, not organized by type)
  if (sortedSideboardCards.length > 0) {
    sections.push({ title: 'Sideboard', data: sortedSideboardCards, isTopLevel: true, cardCount: sideboardCount });
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

  const renderSectionHeader = ({ section }: { section: { title: string; isTopLevel?: boolean; isSubSection?: boolean; isMainboardHeader?: boolean; cardCount?: number } }) => {
    // Render mainboard header with card count
    if (section.isMainboardHeader) {
      return (
        <View style={[styles.sectionHeader, styles.topLevelHeader]}>
          <Text style={[styles.sectionTitle, styles.topLevelTitle]}>{section.title}</Text>
          {section.cardCount !== undefined && (
            <Text style={styles.cardCount}>({section.cardCount})</Text>
          )}
        </View>
      );
    }
    
    // Render top-level sections (Command Zone, Sideboard) with optional card count
    if (section.isTopLevel) {
      return (
        <View style={[styles.sectionHeader, styles.topLevelHeader]}>
          <Text style={[styles.sectionTitle, styles.topLevelTitle]}>{section.title}</Text>
          {section.cardCount !== undefined && (
            <Text style={styles.cardCount}>({section.cardCount})</Text>
          )}
        </View>
      );
    }
    
    // Render subsections (card type sections)
    return (
      <View style={[styles.sectionHeader, section.isSubSection && styles.subSectionHeader]}>
        <Text style={[styles.sectionTitle, section.isSubSection && styles.subSectionTitle]}>{section.title}</Text>
        {section.cardCount !== undefined && (
          <Text style={[styles.cardCount, section.isSubSection && styles.subSectionCount]}>({section.cardCount})</Text>
        )}
      </View>
    );
  };

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topLevelHeader: {
    backgroundColor: '#e8e0f5',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#6200ee',
  },
  subSectionHeader: {
    backgroundColor: '#f9f9f9',
    paddingLeft: 32,
    paddingVertical: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  topLevelTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4a148c',
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7e57c2',
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
  cardCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4a148c',
  },
  subSectionCount: {
    fontSize: 14,
    color: '#7e57c2',
  },
});

export default CardSectionList;
