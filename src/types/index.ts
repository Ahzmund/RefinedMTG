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
  oracleText?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  defense?: string;
  largeImageUrl?: string;
  createdAt: number;
  cardFaces?: Array<{
    name: string;
    typeLine: string;
    manaCost?: string;
    oracleText?: string;
    power?: string;
    toughness?: string;
    loyalty?: string;
    defense?: string;
  }>;
}

export interface DeckCard {
  id: string;
  deckId: string;
  cardId: string;
  quantity: number;
  isCommander: boolean;
  isSideboard: boolean;
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
  oracle_text?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  defense?: string;
  image_uris?: {
    normal?: string;
    small?: string;
    large?: string;
  };
  card_faces?: Array<{
    name: string;
    mana_cost?: string;
    type_line?: string;
    oracle_text?: string;
    power?: string;
    toughness?: string;
    loyalty?: string;
    defense?: string;
    image_uris?: {
      normal?: string;
      small?: string;
      large?: string;
    };
  }>;
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
  isSideboard?: boolean;
}

export interface CardDetails {
  name: string;
  typeLine: string;
  manaCost?: string;
  oracleText?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  defense?: string;
  largeImageUrl?: string;
  cardFaces?: Array<{
    name: string;
    typeLine: string;
    oracleText?: string;
    power?: string;
    toughness?: string;
    loyalty?: string;
  }>;
}

export interface CardChangeItemDto {
  name: string;
  typeLine: string;
  manaCost: string;
  quantity: number;
  reasoning?: string;
}
