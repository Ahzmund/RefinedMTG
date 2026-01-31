import { CardEntity, CardType } from '../types';

const CARD_TYPE_ORDER: Record<CardType, number> = {
  [CardType.Planeswalker]: 1,
  [CardType.Creature]: 2,
  [CardType.Sorcery]: 3,
  [CardType.Instant]: 4,
  [CardType.Artifact]: 5,
  [CardType.Enchantment]: 6,
  [CardType.Battle]: 7,
  [CardType.Land]: 8,
  [CardType.Other]: 9,
};

export const sortCardsWithinType = (cards: CardEntity[], sortBy: 'alphabetical' | 'manaValue'): CardEntity[] => {
  return [...cards].sort((a, b) => {
    if (sortBy === 'manaValue') {
      // Sort by mana value first
      const cmcA = a.cmc || 0;
      const cmcB = b.cmc || 0;
      
      if (cmcA !== cmcB) {
        return cmcA - cmcB;
      }
      
      // If same mana value, sort alphabetically
      return a.name.localeCompare(b.name);
    } else {
      // Sort alphabetically
      return a.name.localeCompare(b.name);
    }
  });
};

export const sortCardsByType = (cards: CardEntity[]): CardEntity[] => {
  return [...cards].sort((a, b) => {
    // First sort by card type
    const typeOrderA = CARD_TYPE_ORDER[a.cardType] || 999;
    const typeOrderB = CARD_TYPE_ORDER[b.cardType] || 999;
    
    if (typeOrderA !== typeOrderB) {
      return typeOrderA - typeOrderB;
    }
    
    // Then sort alphabetically by name
    const nameA = a.name || '';
    const nameB = b.name || '';
    return nameA.localeCompare(nameB);
  });
};

export const groupCardsByType = (cards: CardEntity[], sortBy: 'alphabetical' | 'manaValue'): Map<CardType, CardEntity[]> => {
  const grouped = new Map<CardType, CardEntity[]>();
  
  // Group cards by type
  cards.forEach(card => {
    const type = card.cardType;
    if (!grouped.has(type)) {
      grouped.set(type, []);
    }
    grouped.get(type)!.push(card);
  });
  
  // Sort cards within each type group
  grouped.forEach((cardsOfType, type) => {
    grouped.set(type, sortCardsWithinType(cardsOfType, sortBy));
  });
  
  return grouped;
};

export const cardTypeToSectionData = (cards: CardEntity[], sortBy: 'alphabetical' | 'manaValue' = 'alphabetical') => {
  const grouped = groupCardsByType(cards, sortBy);
  const sections: { title: string; data: CardEntity[] }[] = [];
  
  // Iterate in the order defined by CARD_TYPE_ORDER
  // Sort by the order value to ensure correct sequence
  const orderedTypes = Object.entries(CARD_TYPE_ORDER)
    .sort(([, orderA], [, orderB]) => orderA - orderB)
    .map(([type]) => type as CardType);
  
  orderedTypes.forEach(type => {
    const cardsOfType = grouped.get(type);
    if (cardsOfType && cardsOfType.length > 0) {
      sections.push({
        title: type,
        data: cardsOfType,
      });
    }
  });
  
  return sections;
};
