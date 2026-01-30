export interface ParsedCard {
  quantity: number;
  name: string;
}

// Common section headers to skip
const SECTION_HEADERS = [
  'commander',
  'commanders',
  'mainboard',
  'main board',
  'sideboard',
  'side board',
  'maybeboard',
  'maybe board',
  'companion',
  'deck',
  'lands',
  'creatures',
  'spells',
  'artifacts',
  'enchantments',
  'planeswalkers',
];

export const parseDecklist = (decklist: string): ParsedCard[] => {
  const lines = decklist.split('\n');
  const cards: ParsedCard[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) {
      continue;
    }

    // Skip section headers (e.g., "Commander:", "Mainboard:", etc.)
    const lowerTrimmed = trimmed.toLowerCase();
    const isHeader = SECTION_HEADERS.some(header => {
      return lowerTrimmed === header || 
             lowerTrimmed === header + ':' || 
             lowerTrimmed === header + ' :';
    });
    
    if (isHeader) {
      continue;
    }

    // Try to parse "quantity cardname" format
    // Supports: "1 Lightning Bolt", "1x Lightning Bolt", "Lightning Bolt", etc.
    const match = trimmed.match(/^(\d+)x?\s+(.+)$/i);
    
    if (match) {
      const quantity = parseInt(match[1], 10);
      const name = match[2].trim();
      
      if (name && quantity > 0) {
        cards.push({ quantity, name });
      }
    } else {
      // No quantity specified, assume 1
      // But skip if it looks like a section header without colon
      if (trimmed.length > 0 && !SECTION_HEADERS.includes(lowerTrimmed)) {
        cards.push({ quantity: 1, name: trimmed });
      }
    }
  }

  return cards;
};

export const validateDecklist = (decklist: string): { valid: boolean; error?: string } => {
  if (!decklist || decklist.trim().length === 0) {
    return { valid: false, error: 'Decklist is empty' };
  }

  const cards = parseDecklist(decklist);
  
  if (cards.length === 0) {
    return { valid: false, error: 'No valid cards found in decklist' };
  }

  return { valid: true };
};
