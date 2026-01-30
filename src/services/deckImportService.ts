import { createDeck } from '../database/deckService';
import { getOrCreateCard, addCardToDeck } from '../database/cardService';
import { createChangelog } from '../database/changelogService';
import { parseDecklist, ParsedCard } from './decklistParser';
import { MoxfieldDeckData } from './moxfieldService';

export interface ImportResult {
  deckId: string;
  successCount: number;
  failedCards: Array<{ name: string; quantity: number }>;
}

export const importDeckFromDecklist = async (
  deckName: string,
  decklist: string,
  folderId?: string,
  commanders?: string[]
): Promise<ImportResult> => {
  // Parse the decklist
  const parsedCards = parseDecklist(decklist);
  
  // Create the deck
  const deckId = await createDeck(deckName, folderId, 'manual');
  
  // Add commanders first
  if (commanders && commanders.length > 0) {
    await addCommandersToDeck(deckId, commanders);
  }
  
  // Import cards
  const result = await importCardsToNewDeck(deckId, parsedCards);
  
  return result;
};

export const importDeckFromMoxfield = async (
  moxfieldData: MoxfieldDeckData,
  folderId?: string
): Promise<ImportResult> => {
  // Create the deck
  const deckId = await createDeck(moxfieldData.name, folderId, 'moxfield');
  
  // Convert Moxfield cards to ParsedCard format
  const parsedCards: ParsedCard[] = moxfieldData.cards.map(card => ({
    name: card.name,
    quantity: card.quantity,
  }));
  
  // Import cards
  const result = await importCardsToNewDeck(deckId, parsedCards);
  
  return result;
};

export const createEmptyDeck = async (deckName: string, folderId?: string, commanders?: string[]): Promise<string> => {
  const deckId = await createDeck(deckName, folderId, 'empty');
  
  // Add commanders if provided
  if (commanders && commanders.length > 0) {
    await addCommandersToDeck(deckId, commanders);
  }
  
  return deckId;
};

// Helper function to import cards into a newly created deck
const importCardsToNewDeck = async (
  deckId: string,
  cards: ParsedCard[]
): Promise<ImportResult> => {
  const failedCards: Array<{ name: string; quantity: number }> = [];
  const successfulCards: Array<{ cardId: string; name: string; quantity: number }> = [];
  
  // Try to import each card
  for (const parsedCard of cards) {
    try {
      const card = await getOrCreateCard(parsedCard.name);
      
      if (card) {
        await addCardToDeck(deckId, card.id, parsedCard.quantity);
        successfulCards.push({
          cardId: card.id,
          name: card.name,
          quantity: parsedCard.quantity,
        });
      } else {
        failedCards.push({
          name: parsedCard.name,
          quantity: parsedCard.quantity,
        });
      }
    } catch (error) {
      console.error(`Failed to import card: ${parsedCard.name}`, error);
      failedCards.push({
        name: parsedCard.name,
        quantity: parsedCard.quantity,
      });
    }
  }
  
  // If there were failed cards, create an import error changelog
  if (failedCards.length > 0) {
    const errorDescription = `The following cards could not be imported from Scryfall. Please check the spelling or add them manually:\n\n${failedCards
      .map(c => `${c.quantity} ${c.name}`)
      .join('\n')}`;
    
    await createChangelog(deckId, errorDescription, [], [], true);
  }
  
  return {
    deckId,
    successCount: successfulCards.length,
    failedCards,
  };
};

// Helper function to add commanders to a deck
const addCommandersToDeck = async (deckId: string, commanderNames: string[]): Promise<void> => {
  const { searchCardByName } = await import('./scryfallService');
  
  for (const commanderName of commanderNames) {
    try {
      // Fetch card from Scryfall
      const scryfallCard = await searchCardByName(commanderName);
      
      if (scryfallCard) {
        // Create/get card in database
        const cardId = await getOrCreateCard(scryfallCard);
        
        // Add to deck with isCommander = true
        await addCardToDeck(deckId, cardId, 1, true);
      }
    } catch (error) {
      console.error(`Failed to add commander ${commanderName}:`, error);
      // Continue with other commanders even if one fails
    }
  }
};
