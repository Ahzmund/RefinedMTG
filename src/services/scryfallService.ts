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
    
    // Handle MDFC (Modal Double Faced Cards) and other multi-faced cards
    // For MDFCs, mana_cost is null at top level, but exists in card_faces[0]
    const isMultiFaced = data.card_faces && data.card_faces.length > 0;
    const frontFace = isMultiFaced ? data.card_faces[0] : null;
    
    // For display purposes, use front face mana cost for MDFCs
    const manaCost = data.mana_cost || (frontFace?.mana_cost) || null;
    
    // Debug: Log raw API response
    console.log('Scryfall API raw response for', cardName, ':', JSON.stringify({
      is_multi_faced: isMultiFaced,
      mana_cost: manaCost,
      oracle_text: data.oracle_text || frontFace?.oracle_text,
      power: data.power,
      toughness: data.toughness,
      loyalty: data.loyalty,
      defense: data.defense,
    }, null, 2));
    
    return {
      id: data.id,
      name: data.name,
      mana_cost: manaCost,
      type_line: data.type_line,
      oracle_text: data.oracle_text || frontFace?.oracle_text || null,
      power: data.power || frontFace?.power || null,
      toughness: data.toughness || frontFace?.toughness || null,
      loyalty: data.loyalty || frontFace?.loyalty || null,
      defense: data.defense || frontFace?.defense || null,
      image_uris: data.image_uris || frontFace?.image_uris,
      card_faces: isMultiFaced ? data.card_faces : undefined,
    };
  } catch (error) {
    console.error('Error fetching card from Scryfall:', error);
    return null;
  }
};

export const parseCardType = (typeLine: string): string => {
  if (!typeLine) return 'Other';
  
  // MTG Type System:
  // Type line format: [Supertypes] Types [— Subtypes]
  // Supertypes: Basic, Legendary, Snow, World
  // Types: Artifact, Enchantment, Creature, Land, Instant, Sorcery, Planeswalker, Battle, Kindred
  // Subtypes: Everything after the hyphen
  
  // For MDFCs, the type line is "Type1 // Type2" - extract the first face type
  const firstFaceType = typeLine.split('//')[0].trim();
  
  // Remove subtypes (everything after hyphen)
  const typesPart = firstFaceType.split('—')[0].trim();
  
  // Define all valid types
  const validTypes = ['Planeswalker', 'Creature', 'Sorcery', 'Instant', 'Artifact', 'Enchantment', 'Battle', 'Land', 'Kindred'];
  
  // Extract all types from the types part (skip supertypes)
  const supertypes = ['Basic', 'Legendary', 'Snow', 'World'];
  const words = typesPart.split(/\s+/);
  const types = words.filter(word => validTypes.includes(word));
  
  if (types.length === 0) return 'Other';
  
  // If Kindred is present, use the other type
  if (types.includes('Kindred') && types.length > 1) {
    const nonKindredTypes = types.filter(t => t !== 'Kindred');
    return nonKindredTypes[0];
  }
  
  // Special case: For multi-type cards (not MDFCs), prioritize Land
  // Example: "Enchantment Land" (Urza's Saga) should be categorized as Land
  // But "Instant // Land" (MDFC) should be categorized as Instant (already handled by firstFaceType)
  if (types.includes('Land') && types.length > 1) {
    return 'Land';
  }
  
  // Return the first type (primary type)
  return types[0];
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
