import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  moveDeckToFolder,
  removeDeckFromFolder,
} from '../database/folderService';
import { Folder } from '../types';

export const useFolders = () => {
  return useQuery<Folder[]>({
    queryKey: ['folders'],
    queryFn: getAllFolders,
  });
};

export const useCreateFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createFolder(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
};

export const useUpdateFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ folderId, name }: { folderId: string; name: string }) => updateFolder(folderId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['decks'] });
    },
  });
};

export const useDeleteFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (folderId: string) => deleteFolder(folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['decks'] });
    },
  });
};

export const useMoveDeckToFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ deckId, folderId }: { deckId: string; folderId: string }) => moveDeckToFolder(deckId, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks'] });
    },
  });
};

export const useRemoveDeckFromFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deckId: string) => removeDeckFromFolder(deckId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks'] });
    },
  });
};
