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

export const groupCardsByType = (cards: CardEntity[]): Map<CardType, CardEntity[]> => {
  const sorted = sortCardsByType(cards);
  const grouped = new Map<CardType, CardEntity[]>();
  
  sorted.forEach(card => {
    const type = card.cardType;
    if (!grouped.has(type)) {
      grouped.set(type, []);
    }
    grouped.get(type)!.push(card);
  });
  
  return grouped;
};

export const cardTypeToSectionData = (cards: CardEntity[]) => {
  const grouped = groupCardsByType(cards);
  const sections: { title: string; data: CardEntity[] }[] = [];
  
  // Iterate in order
  Object.values(CardType).forEach(type => {
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
