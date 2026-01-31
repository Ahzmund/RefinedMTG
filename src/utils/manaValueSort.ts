import { CardEntity } from '../types';

export const sortCardsByManaValue = (cards: CardEntity[], sortBy: 'alphabetical' | 'manaValue'): CardEntity[] => {
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

export const groupCardsByManaValue = (cards: CardEntity[], sortBy: 'alphabetical' | 'manaValue'): Map<string, CardEntity[]> => {
  const sorted = sortCardsByManaValue(cards, sortBy);
  const grouped = new Map<string, CardEntity[]>();
  
  sorted.forEach(card => {
    const cmc = card.cmc || 0;
    const key = `${cmc}-drop${cmc === 1 ? '' : 's'}`;
    
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(card);
  });
  
  return grouped;
};

export const manaValueToSectionData = (cards: CardEntity[], sortBy: 'alphabetical' | 'manaValue') => {
  const grouped = groupCardsByManaValue(cards, sortBy);
  const sections: { title: string; data: CardEntity[] }[] = [];
  
  // Get all unique CMC values and sort them
  const cmcValues = Array.from(grouped.keys())
    .map(key => parseInt(key.split('-')[0]))
    .sort((a, b) => a - b);
  
  // Create sections in order
  cmcValues.forEach(cmc => {
    const key = `${cmc}-drop${cmc === 1 ? '' : 's'}`;
    const cardsOfCmc = grouped.get(key);
    
    if (cardsOfCmc && cardsOfCmc.length > 0) {
      sections.push({
        title: key,
        data: cardsOfCmc,
      });
    }
  });
  
  return sections;
};
