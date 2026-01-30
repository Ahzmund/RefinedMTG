import { ScryfallCard } from '../types';

const SCRYFALL_API_BASE = 'https://api.scryfall.com';

export const searchCardByName = async (cardName: string): Promise<ScryfallCard | null> => {
  try {
    const response = await fetch(
      `${SCRYFALL_API_BASE}/cards/named?fuzzy=${encodeURIComponent(cardName)}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Card not found
      }
      throw new Error(`Scryfall API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Debug: Log raw API response
    console.log('Scryfall API raw response for', cardName, ':', JSON.stringify({
      oracle_text: data.oracle_text,
      power: data.power,
      toughness: data.toughness,
      loyalty: data.loyalty,
      defense: data.defense,
    }, null, 2));
    
    return {
      id: data.id,
      name: data.name,
      mana_cost: data.mana_cost,
      type_line: data.type_line,
      oracle_text: data.oracle_text,
      power: data.power,
      toughness: data.toughness,
      loyalty: data.loyalty,
      defense: data.defense,
      image_uris: data.image_uris,
    };
  } catch (error) {
    console.error('Error fetching card from Scryfall:', error);
    return null;
  }
};

export const parseCardType = (typeLine: string): string => {
  if (!typeLine) return 'Other';
  
  const types = ['Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Planeswalker', 'Land', 'Battle'];
  
  for (const type of types) {
    if (typeLine.includes(type)) {
      return type;
    }
  }
  
  return 'Other';
};

export const searchCards = async (query: string): Promise<any[]> => {
  try {
    const response = await fetch(
      `${SCRYFALL_API_BASE}/cards/autocomplete?q=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      throw new Error(`Scryfall API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Scryfall autocomplete returns just card names, so we need to fetch full details
    // For now, return simplified data
    return data.data.map((name: string, index: number) => ({
      id: `temp-${index}`,
      name: name,
      typeLine: '',
      manaCost: '',
      cmc: 0,
    }));
  } catch (error) {
    console.error('Error searching cards on Scryfall:', error);
    return [];
  }
};
