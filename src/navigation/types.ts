export type RootStackParamList = {
  DeckList: undefined;
  DeckDetail: { deckId: string; deckName: string };
  ChangeEntry: { deckId: string; deckName: string };
  ImportDeck: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
