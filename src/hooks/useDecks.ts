import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllDecks, getDeckById, createDeck, deleteDeck, updateDeckName } from '../database/deckService';
import { Deck, DeckWithCards } from '../types';

export const useDecks = () => {
  return useQuery<Deck[]>({
    queryKey: ['decks'],
    queryFn: getAllDecks,
  });
};

export const useDeck = (deckId: string) => {
  return useQuery<DeckWithCards | null>({
    queryKey: ['deck', deckId],
    queryFn: () => getDeckById(deckId),
    enabled: !!deckId,
  });
};

export const useCreateDeck = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, folderId, importedFrom }: { name: string; folderId?: string; importedFrom?: string }) =>
      createDeck(name, folderId, importedFrom),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks'] });
    },
  });
};

export const useDeleteDeck = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deckId: string) => deleteDeck(deckId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks'] });
    },
  });
};

export const useUpdateDeckName = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ deckId, name }: { deckId: string; name: string }) => updateDeckName(deckId, name),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      queryClient.invalidateQueries({ queryKey: ['deck', variables.deckId] });
    },
  });
};
