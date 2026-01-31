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

    // Check if card exists with the Scryfall-returned name (handles MDFC and variants)
    // For example: searching "Sink into Stupor" returns "Sink into Stupor // Soporific Springs"
    // Or searching "Merciless Poisoning" returns "Toxic Deluge"
    const existingCardByActualName = await db.getFirstAsync<any>(
      'SELECT * FROM cards WHERE name = ? COLLATE NOCASE',
      [scryfallCard.name]
    );

    if (existingCardByActualName) {
      return {
        id: existingCardByActualName.id,
        scryfallId: existingCardByActualName.scryfall_id,
        name: existingCardByActualName.name,
        manaCost: existingCardByActualName.mana_cost,
        typeLine: existingCardByActualName.type_line,
        cardType: existingCardByActualName.card_type,
        imageUri: existingCardByActualName.image_uri,
        createdAt: existingCardByActualName.created_at,
      };
    }

    // Save to database with Scryfall's actual card name
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
        scryfallCard.name, // Use Scryfall's actual name (includes // for MDFC, actual name for variants)
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
      name: scryfallCard.name, // Return Scryfall's actual name
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
  isCommander: boolean = false,
  isSideboard: boolean = false
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
        `INSERT INTO deck_cards (id, deck_id, card_id, quantity, is_commander, is_sideboard, added_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, deckId, cardId, quantity, isCommander ? 1 : 0, isSideboard ? 1 : 0, now]
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


export const fetchAndUpdateCardDetails = async (cardId: string, cardName: string): Promise<Card | null> => {
  try {
    const db = getDatabase();
    
    // Fetch full card details from Scryfall
    const scryfallCard = await searchCardByName(cardName);
    
    if (!scryfallCard) {
      console.warn(`Card not found on Scryfall: ${cardName}`);
      return null;
    }
    
    // Update the card in database with full details
    const imageUri = scryfallCard.image_uris?.normal || scryfallCard.image_uris?.small;
    const largeImageUrl = scryfallCard.image_uris?.large || scryfallCard.image_uris?.normal;
    
    await db.runAsync(
      `UPDATE cards 
       SET scryfall_id = ?, 
           mana_cost = ?, 
           type_line = ?, 
           oracle_text = ?, 
           power = ?, 
           toughness = ?, 
           loyalty = ?, 
           defense = ?, 
           image_uri = ?, 
           large_image_url = ?
       WHERE id = ?`,
      [
        scryfallCard.id,
        scryfallCard.mana_cost || null,
        scryfallCard.type_line || null,
        scryfallCard.oracle_text || null,
        scryfallCard.power || null,
        scryfallCard.toughness || null,
        scryfallCard.loyalty || null,
        scryfallCard.defense || null,
        imageUri || null,
        largeImageUrl || null,
        cardId,
      ]
    );
    
    // Return updated card
    const updatedCard = await db.getFirstAsync<any>(
      'SELECT * FROM cards WHERE id = ?',
      [cardId]
    );
    
    if (!updatedCard) return null;
    
    return {
      id: updatedCard.id,
      scryfallId: updatedCard.scryfall_id,
      name: updatedCard.name,
      manaCost: updatedCard.mana_cost,
      typeLine: updatedCard.type_line,
      cardType: updatedCard.card_type,
      imageUri: updatedCard.image_uri,
      oracleText: updatedCard.oracle_text,
      power: updatedCard.power,
      toughness: updatedCard.toughness,
      loyalty: updatedCard.loyalty,
      defense: updatedCard.defense,
      largeImageUrl: updatedCard.large_image_url,
      createdAt: updatedCard.created_at,
    };
  } catch (error) {
    console.error('Error in fetchAndUpdateCardDetails:', error);
    throw error;
  }
};
