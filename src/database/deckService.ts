import { getDatabase } from './database';
import { Deck, DeckWithCards, DeckCard, Changelog } from '../types';
import uuid from 'react-native-uuid';

export const createDeck = async (name: string, folderId?: string, importedFrom?: string): Promise<string> => {
  try {
    const db = getDatabase();
    const id = uuid.v4() as string;
    const now = Date.now();

    await db.runAsync(
      'INSERT INTO decks (id, name, folder_id, created_at, updated_at, imported_from) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, folderId || null, now, now, importedFrom || null]
    );

    return id;
  } catch (error) {
    console.error('Error in createDeck:', error);
    throw error;
  }
};

export const getAllDecks = async (): Promise<Deck[]> => {
  try {
    const db = getDatabase();
  
    const rows = await db.getAllAsync<any>(
      `SELECT 
        d.id, d.name, d.folder_id as folderId, d.created_at as createdAt, 
        d.updated_at as updatedAt, d.imported_from as importedFrom,
        f.name as folderName,
        COUNT(dc.id) as cardCount
      FROM decks d
      LEFT JOIN folders f ON d.folder_id = f.id
      LEFT JOIN deck_cards dc ON d.id = dc.deck_id
      GROUP BY d.id
      ORDER BY d.updated_at DESC`
    );

    return (rows || []).map(row => ({
      id: row.id,
      name: row.name,
      folderId: row.folderId,
      folderName: row.folderName,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      importedFrom: row.importedFrom,
      cardCount: row.cardCount || 0,
    }));
  } catch (error) {
    console.error('Error in getAllDecks:', error);
    throw error;
  }
};

export const getDeckById = async (deckId: string): Promise<DeckWithCards | null> => {
  try {
    const db = getDatabase();
  
    // Get deck info
    const deckRow = await db.getFirstAsync<any>(
      `SELECT 
        d.id, d.name, d.folder_id as folderId, d.created_at as createdAt,
        d.updated_at as updatedAt, d.imported_from as importedFrom,
        f.name as folderName
      FROM decks d
      LEFT JOIN folders f ON d.folder_id = f.id
      WHERE d.id = ?`,
      [deckId]
    );

    if (!deckRow) return null;

    // Get cards
    const cardRows = await db.getAllAsync<any>(
      `SELECT 
        dc.id, dc.deck_id as deckId, dc.card_id as cardId, dc.quantity,
        dc.is_commander as isCommander, dc.added_at as addedAt,
        c.name, c.mana_cost as manaCost, c.type_line as typeLine,
        c.card_type as cardType, c.image_uri as imageUri, c.created_at as cardCreatedAt
      FROM deck_cards dc
      JOIN cards c ON dc.card_id = c.id
      WHERE dc.deck_id = ?
      ORDER BY c.card_type, c.name`,
      [deckId]
    );

    // Get changelogs
    const changelogRows = await db.getAllAsync<any>(
      `SELECT 
        cl.id, cl.deck_id as deckId, cl.change_date as changeDate,
        cl.description, cl.is_import_error as isImportError, cl.created_at as createdAt
      FROM changelogs cl
      WHERE cl.deck_id = ?
      ORDER BY cl.change_date DESC`,
      [deckId]
    );

    // Get changelog cards for each changelog
    const changelogs: Changelog[] = await Promise.all(
      (changelogRows || []).map(async (clRow) => {
        const clCardRows = await db.getAllAsync<any>(
          `SELECT 
            cc.id, cc.changelog_id as changelogId, cc.card_id as cardId,
            cc.action, cc.quantity, cc.reasoning,
            c.name, c.mana_cost as manaCost, c.type_line as typeLine,
            c.card_type as cardType, c.created_at as cardCreatedAt
          FROM changelog_cards cc
          JOIN cards c ON cc.card_id = c.id
          WHERE cc.changelog_id = ?`,
          [clRow.id]
        );

        const cardsAdded = clCardRows
          .filter(cc => cc.action === 'added')
          .map(cc => ({
            id: cc.id,
            changelogId: cc.changelogId,
            cardId: cc.cardId,
            action: cc.action as 'added',
            quantity: cc.quantity,
            reasoning: cc.reasoning,
            card: {
              id: cc.cardId,
              name: cc.name,
              manaCost: cc.manaCost,
              typeLine: cc.typeLine,
              cardType: cc.cardType,
              createdAt: cc.cardCreatedAt || 0,
            },
          }));

        const cardsRemoved = clCardRows
          .filter(cc => cc.action === 'removed')
          .map(cc => ({
            id: cc.id,
            changelogId: cc.changelogId,
            cardId: cc.cardId,
            action: cc.action as 'removed',
            quantity: cc.quantity,
            reasoning: cc.reasoning,
            card: {
              id: cc.cardId,
              name: cc.name,
              manaCost: cc.manaCost,
              typeLine: cc.typeLine,
              cardType: cc.cardType,
              createdAt: cc.cardCreatedAt || 0,
            },
          }));

        return {
          id: clRow.id,
          deckId: clRow.deckId,
          changeDate: clRow.changeDate,
          description: clRow.description,
          isImportError: Boolean(clRow.isImportError),
          createdAt: clRow.createdAt,
          cardsAdded,
          cardsRemoved,
        };
      })
    );

    const cards: DeckCard[] = (cardRows || []).map(row => ({
      id: row.id,
      deckId: row.deckId,
      cardId: row.cardId,
      quantity: row.quantity,
      isCommander: Boolean(row.isCommander),
      addedAt: row.addedAt,
      card: {
        id: row.cardId,
        name: row.name,
        manaCost: row.manaCost,
        typeLine: row.typeLine,
        cardType: row.cardType,
        imageUri: row.imageUri,
        createdAt: row.cardCreatedAt || 0,
      },
    }));

    return {
      id: deckRow.id,
      name: deckRow.name,
      folderId: deckRow.folderId,
      folderName: deckRow.folderName,
      createdAt: deckRow.createdAt,
      updatedAt: deckRow.updatedAt,
      importedFrom: deckRow.importedFrom,
      cards,
      changelogs,
    };
  } catch (error) {
    console.error('Error in getDeckById:', error);
    throw error;
  }
};

export const deleteDeck = async (deckId: string): Promise<void> => {
  try {
    const db = getDatabase();
    await db.runAsync('DELETE FROM decks WHERE id = ?', [deckId]);
  } catch (error) {
    console.error('Error in deleteDeck:', error);
    throw error;
  }
};

export const updateDeckName = async (deckId: string, name: string): Promise<void> => {
  try {
    const db = getDatabase();
    const now = Date.now();
    await db.runAsync(
      'UPDATE decks SET name = ?, updated_at = ? WHERE id = ?',
      [name, now, deckId]
    );
  } catch (error) {
    console.error('Error in updateDeckName:', error);
    throw error;
  }
};
