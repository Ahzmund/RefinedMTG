import * as SQLite from 'expo-sqlite';

const DB_NAME = 'refinedmtg.db';

let db: SQLite.SQLiteDatabase | null = null;

const runMigrations = async (db: SQLite.SQLiteDatabase): Promise<void> => {
  try {
    // Check if new columns exist in cards table
    const tableInfo = await db.getAllAsync<any>('PRAGMA table_info(cards)');
    const columnNames = tableInfo.map((col: any) => col.name);
    
    // Add oracle_text column if it doesn't exist
    if (!columnNames.includes('oracle_text')) {
      console.log('Adding oracle_text column to cards table...');
      await db.execAsync('ALTER TABLE cards ADD COLUMN oracle_text TEXT');
    }
    
    // Add power column if it doesn't exist
    if (!columnNames.includes('power')) {
      console.log('Adding power column to cards table...');
      await db.execAsync('ALTER TABLE cards ADD COLUMN power TEXT');
    }
    
    // Add toughness column if it doesn't exist
    if (!columnNames.includes('toughness')) {
      console.log('Adding toughness column to cards table...');
      await db.execAsync('ALTER TABLE cards ADD COLUMN toughness TEXT');
    }
    
    // Add loyalty column if it doesn't exist
    if (!columnNames.includes('loyalty')) {
      console.log('Adding loyalty column to cards table...');
      await db.execAsync('ALTER TABLE cards ADD COLUMN loyalty TEXT');
    }
    
    // Add defense column if it doesn't exist
    if (!columnNames.includes('defense')) {
      console.log('Adding defense column to cards table...');
      await db.execAsync('ALTER TABLE cards ADD COLUMN defense TEXT');
    }
    
    // Add large_image_url column if it doesn't exist
    if (!columnNames.includes('large_image_url')) {
      console.log('Adding large_image_url column to cards table...');
      await db.execAsync('ALTER TABLE cards ADD COLUMN large_image_url TEXT');
    }
    
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
};

export const initDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  try {
    if (db) {
      console.log('Database already initialized');
      return db;
    }

    console.log('Opening database...');
    db = await SQLite.openDatabaseAsync(DB_NAME);
    console.log('Database opened successfully');

    // Create tables
    console.log('Creating tables...');
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS decks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        folder_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        imported_from TEXT,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        scryfall_id TEXT UNIQUE,
        name TEXT NOT NULL,
        mana_cost TEXT,
        type_line TEXT,
        card_type TEXT,
        image_uri TEXT,
        oracle_text TEXT,
        power TEXT,
        toughness TEXT,
        loyalty TEXT,
        defense TEXT,
        large_image_url TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS deck_cards (
        id TEXT PRIMARY KEY,
        deck_id TEXT NOT NULL,
        card_id TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        is_commander INTEGER DEFAULT 0,
        added_at INTEGER NOT NULL,
        FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE,
        FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS changelogs (
        id TEXT PRIMARY KEY,
        deck_id TEXT NOT NULL,
        change_date INTEGER NOT NULL,
        description TEXT,
        is_import_error INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS changelog_cards (
        id TEXT PRIMARY KEY,
        changelog_id TEXT NOT NULL,
        card_id TEXT NOT NULL,
        action TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        reasoning TEXT,
        FOREIGN KEY (changelog_id) REFERENCES changelogs(id) ON DELETE CASCADE,
        FOREIGN KEY (card_id) REFERENCES cards(id)
      );

      CREATE INDEX IF NOT EXISTS idx_decks_folder ON decks(folder_id);
      CREATE INDEX IF NOT EXISTS idx_deck_cards_deck ON deck_cards(deck_id);
      CREATE INDEX IF NOT EXISTS idx_deck_cards_card ON deck_cards(card_id);
      CREATE INDEX IF NOT EXISTS idx_changelogs_deck ON changelogs(deck_id);
      CREATE INDEX IF NOT EXISTS idx_changelog_cards_changelog ON changelog_cards(changelog_id);
      CREATE INDEX IF NOT EXISTS idx_cards_scryfall ON cards(scryfall_id);
    `);

    // Run migrations for existing databases
    console.log('Running database migrations...');
    await runMigrations(db);
    
    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('CRITICAL: Failed to initialize database:', error);
    throw error;
  }
};

export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
};

export const closeDatabase = async (): Promise<void> => {
  try {
    if (db) {
      await db.closeAsync();
      db = null;
      console.log('Database closed successfully');
    }
  } catch (error) {
    console.error('Error closing database:', error);
    throw error;
  }
};
