export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

export interface Deck {
  id: string;
  name: string;
  folderId?: string;
  folderName?: string;
  createdAt: number;
  updatedAt: number;
  importedFrom?: 'moxfield' | 'manual' | 'empty';
  cardCount?: number;
}

export interface Card {
  id: string;
  scryfallId?: string;
  name: string;
  manaCost?: string;
  typeLine?: string;
  cardType?: string;
  imageUri?: string;
  createdAt: number;
}

export interface DeckCard {
  id: string;
  deckId: string;
  cardId: string;
  quantity: number;
  isCommander: boolean;
  addedAt: number;
  card?: Card;
}

export interface Changelog {
  id: string;
  deckId: string;
  changeDate: number;
  description?: string;
  isImportError: boolean;
  createdAt: number;
  cardsAdded?: ChangelogCard[];
  cardsRemoved?: ChangelogCard[];
}

export interface ChangelogCard {
  id: string;
  changelogId: string;
  cardId: string;
  action: 'added' | 'removed';
  quantity: number;
  reasoning?: string;
  card?: Card;
}

export interface DeckWithCards extends Deck {
  cards: DeckCard[];
  changelogs: Changelog[];
}

export interface ScryfallCard {
  id: string;
  name: string;
  mana_cost?: string;
  type_line?: string;
  image_uris?: {
    normal?: string;
    small?: string;
  };
}

export enum CardType {
  Creature = 'Creature',
  Instant = 'Instant',
  Sorcery = 'Sorcery',
  Enchantment = 'Enchantment',
  Artifact = 'Artifact',
  Land = 'Land',
  Planeswalker = 'Planeswalker',
  Battle = 'Battle',
  Other = 'Other',
}

export interface DeckListItem {
  id: string;
  name: string;
  cardCount: number;
  folderId?: string;
  folderName?: string;
  createdAt: number;
  updatedAt: number;
  importedFrom?: string;
}

export interface CardChangeItem {
  name: string;
  quantity: number;
  reasoning?: string;
  typeLine?: string;
  manaCost?: string;
}

export interface ChangeHistoryItem {
  id: string;
  changeDate: number;
  description?: string;
  isImportError?: boolean;
  cardsAdded: CardChangeItem[];
  cardsRemoved: CardChangeItem[];
}

export interface CardEntity {
  name: string;
  typeLine: string;
  manaCost: string;
  quantity: number;
  cardType: CardType;
  isCommander?: boolean;
}
