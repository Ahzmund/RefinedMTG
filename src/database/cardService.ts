import { getDatabase } from './database';
import { Card } from '../types';
import { searchCardByName, parseCardType } from '../services/scryfallService';
import uuid from 'react-native-uuid';

export const getOrCreateCard = async (cardInput: string | { name: string; typeLine: string; manaCost: string }): Promise<Card | null> => {
  const cardName = typeof cardInput === 'string' ? cardInput : cardInput.name;
  try {
    const db = getDatabase();
    
    // Check if card exists in local database
    const existingCard = await db.getFirstAsync<any>(
      'SELECT * FROM cards WHERE name = ? COLLATE NOCASE',
      [cardName]
    );

    if (existingCard) {
      return {
        id: existingCard.id,
        scryfallId: existingCard.scryfall_id,
        name: existingCard.name,
        manaCost: existingCard.mana_cost,
        typeLine: existingCard.type_line,
        cardType: existingCard.card_type,
        imageUri: existingCard.image_uri,
        createdAt: existingCard.created_at,
      };
    }

    // If we have full card details, use them without fetching
    if (typeof cardInput === 'object') {
      const id = uuid.v4() as string;
      const now = Date.now();
      const cardType = parseCardType(cardInput.typeLine);
      
      await db.runAsync(
        `INSERT INTO cards (id, name, mana_cost, type_line, card_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, cardInput.name, cardInput.manaCost || null, cardInput.typeLine || null, cardType, now]
      );
      
      return {
        id,
        name: cardInput.name,
        manaCost: cardInput.manaCost,
        typeLine: cardInput.typeLine,
        cardType,
        createdAt: now,
      };
    }
    
    // Fetch from Scryfall
    const scryfallCard = await searchCardByName(cardName);
    
    if (!scryfallCard) {
      return null; // Card not found
    }

    // Save to database
    const id = uuid.v4() as string;
    const now = Date.now();
    const cardType = parseCardType(scryfallCard.type_line || '');
    const imageUri = scryfallCard.image_uris?.normal || scryfallCard.image_uris?.small;

    const largeImageUrl = scryfallCard.image_uris?.large || scryfallCard.image_uris?.normal;
    
    await db.runAsync(
      `INSERT INTO cards (id, scryfall_id, name, mana_cost, type_line, card_type, image_uri, oracle_text, power, toughness, loyalty, defense, large_image_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        scryfallCard.id,
        scryfallCard.name,
        scryfallCard.mana_cost || null,
        scryfallCard.type_line || null,
        cardType,
        imageUri || null,
        scryfallCard.oracle_text || null,
        scryfallCard.power || null,
        scryfallCard.toughness || null,
        scryfallCard.loyalty || null,
        scryfallCard.defense || null,
        largeImageUrl || null,
        now,
      ]
    );

    return {
      id,
      scryfallId: scryfallCard.id,
      name: scryfallCard.name,
      manaCost: scryfallCard.mana_cost,
      typeLine: scryfallCard.type_line,
      cardType,
      imageUri,
      createdAt: now,
    };
  } catch (error) {
    console.error('Error in getOrCreateCard:', error);
    throw error;
  }
};

export const addCardToDeck = async (
  deckId: string,
  cardId: string,
  quantity: number,
  isCommander: boolean = false
): Promise<void> => {
  try {
    const db = getDatabase();
    const id = uuid.v4() as string;
    const now = Date.now();

    // Check if card already in deck
    const existing = await db.getFirstAsync<any>(
      'SELECT id, quantity FROM deck_cards WHERE deck_id = ? AND card_id = ?',
      [deckId, cardId]
    );

    if (existing) {
      // Update quantity
      await db.runAsync(
        'UPDATE deck_cards SET quantity = ? WHERE id = ?',
        [existing.quantity + quantity, existing.id]
      );
    } else {
      // Insert new
      await db.runAsync(
        `INSERT INTO deck_cards (id, deck_id, card_id, quantity, is_commander, added_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, deckId, cardId, quantity, isCommander ? 1 : 0, now]
      );
    }

    // Update deck's updated_at
    await db.runAsync(
      'UPDATE decks SET updated_at = ? WHERE id = ?',
      [now, deckId]
    );
  } catch (error) {
    console.error('Error in addCardToDeck:', error);
    throw error;
  }
};

export const removeCardFromDeck = async (deckId: string, cardId: string, quantity: number): Promise<void> => {
  try {
    const db = getDatabase();
    const now = Date.now();

    const existing = await db.getFirstAsync<any>(
      'SELECT id, quantity FROM deck_cards WHERE deck_id = ? AND card_id = ?',
      [deckId, cardId]
    );

    if (!existing) return;

    if (existing.quantity <= quantity) {
      // Remove completely
      await db.runAsync('DELETE FROM deck_cards WHERE id = ?', [existing.id]);
    } else {
      // Decrease quantity
      await db.runAsync(
        'UPDATE deck_cards SET quantity = ? WHERE id = ?',
        [existing.quantity - quantity, existing.id]
      );
    }

    // Update deck's updated_at
    await db.runAsync(
      'UPDATE decks SET updated_at = ? WHERE id = ?',
      [now, deckId]
    );
  } catch (error) {
    console.error('Error in removeCardFromDeck:', error);
    throw error;
  }
};
