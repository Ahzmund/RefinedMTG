import { getDatabase } from './database';
import { Folder } from '../types';
import uuid from 'react-native-uuid';

export const getAllFolders = async (): Promise<Folder[]> => {
  const db = getDatabase();
  
  const rows = await db.getAllAsync<any>(
    'SELECT id, name, created_at as createdAt FROM folders ORDER BY name ASC'
  );

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
  }));
};

export const createFolder = async (name: string): Promise<string> => {
  const db = getDatabase();
  const id = uuid.v4() as string;
  const now = Date.now();

  await db.runAsync(
    'INSERT INTO folders (id, name, created_at) VALUES (?, ?, ?)',
    [id, name, now]
  );

  return id;
};

export const updateFolder = async (folderId: string, name: string): Promise<void> => {
  const db = getDatabase();
  await db.runAsync(
    'UPDATE folders SET name = ? WHERE id = ?',
    [name, folderId]
  );
};

export const deleteFolder = async (folderId: string): Promise<void> => {
  const db = getDatabase();
  
  // Set all decks in this folder to have no folder
  await db.runAsync(
    'UPDATE decks SET folder_id = NULL WHERE folder_id = ?',
    [folderId]
  );

  // Delete the folder
  await db.runAsync('DELETE FROM folders WHERE id = ?', [folderId]);
};

export const moveDeckToFolder = async (deckId: string, folderId: string): Promise<void> => {
  const db = getDatabase();
  const now = Date.now();
  
  await db.runAsync(
    'UPDATE decks SET folder_id = ?, updated_at = ? WHERE id = ?',
    [folderId, now, deckId]
  );
};

export const removeDeckFromFolder = async (deckId: string): Promise<void> => {
  const db = getDatabase();
  const now = Date.now();
  
  await db.runAsync(
    'UPDATE decks SET folder_id = NULL, updated_at = ? WHERE id = ?',
    [now, deckId]
  );
};
