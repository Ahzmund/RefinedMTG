export interface MoxfieldDeckData {
  name: string;
  cards: Array<{
    name: string;
    quantity: number;
    isCommander?: boolean;
  }>;
}

export const extractDeckIdFromUrl = (url: string): string | null => {
  // Moxfield URLs: https://moxfield.com/decks/[deckId] or https://www.moxfield.com/decks/[deckId]
  const match = url.match(/moxfield\.com\/decks\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};

export const getMoxfieldDeckUrl = (deckId: string): string => {
  return `https://www.moxfield.com/decks/${deckId}`;
};
