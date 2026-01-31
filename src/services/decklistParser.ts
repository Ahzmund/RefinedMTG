export interface ParsedCard {
  quantity: number;
  name: string;
  isSideboard?: boolean;
}

export interface ParsedDecklist {
  mainboard: ParsedCard[];
  sideboard: ParsedCard[];
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

export const parseDecklist = (decklist: string): ParsedDecklist => {
  const lines = decklist.split('\n');
  const mainboard: ParsedCard[] = [];
  const sideboard: ParsedCard[] = [];
  let inSideboard = false;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) {
      continue;
    }

    // Check for SIDEBOARD section (case-insensitive, anywhere in line)
    const lowerTrimmed = trimmed.toLowerCase();
    if (lowerTrimmed.includes('sideboard')) {
      inSideboard = true;
      continue;
    }
    
    // Skip other section headers (e.g., "Commander:", "Mainboard:", etc.)
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
        const card = { quantity, name, isSideboard: inSideboard };
        if (inSideboard) {
          sideboard.push(card);
        } else {
          mainboard.push(card);
        }
      }
    } else {
      // No quantity specified, assume 1
      // But skip if it looks like a section header without colon
      if (trimmed.length > 0 && !SECTION_HEADERS.includes(lowerTrimmed)) {
        const card = { quantity: 1, name: trimmed, isSideboard: inSideboard };
        if (inSideboard) {
          sideboard.push(card);
        } else {
          mainboard.push(card);
        }
      }
    }
  }

  return { mainboard, sideboard };
};

export const validateDecklist = (decklist: string): { valid: boolean; error?: string } => {
  if (!decklist || decklist.trim().length === 0) {
    return { valid: false, error: 'Decklist is empty' };
  }

  const parsed = parseDecklist(decklist);
  
  if (parsed.mainboard.length === 0 && parsed.sideboard.length === 0) {
    return { valid: false, error: 'No valid cards found in decklist' };
  }

  return { valid: true };
};
