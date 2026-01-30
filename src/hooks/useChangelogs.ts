import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createChangelog, updateChangelogDescription, deleteChangelog, ChangelogCardInput } from '../database/changelogService';

export const useCreateChangelog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      deckId,
      description,
      cardsAdded,
      cardsRemoved,
      isImportError,
    }: {
      deckId: string;
      description: string;
      cardsAdded: ChangelogCardInput[];
      cardsRemoved: ChangelogCardInput[];
      isImportError?: boolean;
    }) => createChangelog(deckId, description, cardsAdded, cardsRemoved, isImportError),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deck', variables.deckId] });
      queryClient.invalidateQueries({ queryKey: ['decks'] });
    },
  });
};

export const useUpdateChangelogDescription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ changelogId, description, deckId }: { changelogId: string; description: string; deckId: string }) =>
      updateChangelogDescription(changelogId, description),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deck', variables.deckId] });
    },
  });
};

export const useDeleteChangelog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ changelogId, deckId }: { changelogId: string; deckId: string }) => deleteChangelog(changelogId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deck', variables.deckId] });
    },
  });
};
