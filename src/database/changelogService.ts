import { getDatabase } from './database';
import { Changelog, ChangelogCard } from '../types';
import uuid from 'react-native-uuid';

export interface ChangelogCardInput {
  cardId: string;
  quantity: number;
  reasoning?: string;
}

export const createChangelog = async (
  deckId: string,
  description: string,
  cardsAdded: ChangelogCardInput[],
  cardsRemoved: ChangelogCardInput[],
  isImportError: boolean = false
): Promise<string> => {
  const db = getDatabase();
  const id = uuid.v4() as string;
  const now = Date.now();

  // Insert changelog
  await db.runAsync(
    `INSERT INTO changelogs (id, deck_id, change_date, description, is_import_error, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, deckId, now, description || null, isImportError ? 1 : 0, now]
  );

  // Insert added cards
  for (const card of cardsAdded) {
    const cardId = uuid.v4() as string;
    await db.runAsync(
      `INSERT INTO changelog_cards (id, changelog_id, card_id, action, quantity, reasoning)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [cardId, id, card.cardId, 'added', card.quantity, card.reasoning || null]
    );
  }

  // Insert removed cards
  for (const card of cardsRemoved) {
    const cardId = uuid.v4() as string;
    await db.runAsync(
      `INSERT INTO changelog_cards (id, changelog_id, card_id, action, quantity, reasoning)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [cardId, id, card.cardId, 'removed', card.quantity, card.reasoning || null]
    );
  }

  // Update deck's updated_at
  await db.runAsync(
    'UPDATE decks SET updated_at = ? WHERE id = ?',
    [now, deckId]
  );

  return id;
};

export const updateChangelogDescription = async (
  changelogId: string,
  description: string
): Promise<void> => {
  const db = getDatabase();
  await db.runAsync(
    'UPDATE changelogs SET description = ? WHERE id = ?',
    [description, changelogId]
  );
};

export const deleteChangelog = async (changelogId: string): Promise<void> => {
  const db = getDatabase();
  await db.runAsync('DELETE FROM changelogs WHERE id = ?', [changelogId]);
};

export const getChangelogsByDeck = async (deckId: string): Promise<Changelog[]> => {
  const db = getDatabase();
  
  const changelogRows = await db.getAllAsync<any>(
    `SELECT 
      cl.id, cl.deck_id as deckId, cl.change_date as changeDate,
      cl.description, cl.is_import_error as isImportError, cl.created_at as createdAt
    FROM changelogs cl
    WHERE cl.deck_id = ?
    ORDER BY cl.change_date DESC`,
    [deckId]
  );

  const changelogs: Changelog[] = await Promise.all(
    changelogRows.map(async (clRow) => {
      const clCardRows = await db.getAllAsync<any>(
        `SELECT 
          cc.id, cc.changelog_id as changelogId, cc.card_id as cardId,
          cc.action, cc.quantity, cc.reasoning,
          c.name, c.mana_cost as manaCost, c.type_line as typeLine,
          c.card_type as cardType
        FROM changelog_cards cc
        JOIN cards c ON cc.card_id = c.id
        WHERE cc.changelog_id = ?`,
        [clRow.id]
      );
      
      console.log('Changelog card rows:', JSON.stringify(clCardRows, null, 2));

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
            createdAt: 0,
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
            createdAt: 0,
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

  return changelogs;
};
