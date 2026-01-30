import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Alert,
  Pressable,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useDecks } from '../hooks/useDecks';
import { useFolders, useCreateFolder, useDeleteFolder, useUpdateFolder, useMoveDeckToFolder, useRemoveDeckFromFolder } from '../hooks/useFolders';
import DeckCard from '../components/DeckCard';
import FAB from '../components/FAB';
import { DeckListItem, Folder } from '../types';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'DeckList'>;

const DeckListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { data: decks, isLoading: isLoadingDecks, error, refetch, isRefetching } = useDecks();
  const { data: folders, isLoading: isLoadingFolders } = useFolders();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingDeckId, setDeletingDeckId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['uncategorized']));
  
  // Folder management modals
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [movingDeck, setMovingDeck] = useState<DeckListItem | null>(null);
  const [deletingDeck, setDeletingDeck] = useState<DeckListItem | null>(null);
  
  const { mutate: createFolder, isPending: isCreatingFolder } = useCreateFolder();
  const { mutate: updateFolder, isPending: isUpdatingFolder } = useUpdateFolder();
  const { mutate: deleteFolder, isPending: isDeletingFolder } = useDeleteFolder();
  const { mutate: moveDeckToFolder } = useMoveDeckToFolder();
  const { mutate: removeDeckFromFolder } = useRemoveDeckFromFolder();

  // Group decks by folder
  const groupedDecks = useMemo(() => {
    if (!decks) return { uncategorized: [], byFolder: {} };
    
    const query = searchQuery.toLowerCase();
    const filtered = searchQuery
      ? decks.filter(d => d?.name?.toLowerCase()?.includes(query))
      : decks;
    
    const result: { uncategorized: DeckListItem[]; byFolder: Record<string, DeckListItem[]> } = {
      uncategorized: [],
      byFolder: {},
    };
    
    filtered.forEach(deck => {
      if (!deck?.folderId) {
        result.uncategorized.push(deck);
      } else {
        if (!result.byFolder[deck.folderId]) {
          result.byFolder[deck.folderId] = [];
        }
        result.byFolder[deck.folderId].push(deck);
      }
    });
    
    return result;
  }, [decks, searchQuery]);

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleDeckPress = (deck: DeckListItem) => {
    navigation.navigate('DeckDetail', { deckId: deck?.id, deckName: deck?.name });
  };

  const handleImportPress = () => {
    navigation.navigate('ImportDeck');
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      Alert.alert('Error', 'Folder name cannot be empty');
      return;
    }
    createFolder(newFolderName, {
      onSuccess: () => {
        setNewFolderName('');
        setShowCreateFolderModal(false);
      },
      onError: (err: any) => {
        Alert.alert('Error', err?.message || 'Failed to create folder');
      },
    });
  };

  const handleUpdateFolder = () => {
    if (!editingFolder || !editFolderName.trim()) return;
    updateFolder(
      { folderId: editingFolder.id, name: editFolderName },
      {
        onSuccess: () => {
          setEditingFolder(null);
          setEditFolderName('');
        },
        onError: (err: any) => {
          Alert.alert('Error', err?.message || 'Failed to update folder');
        },
      }
    );
  };

  const handleDeleteFolder = (folder: Folder) => {
    console.log('handleDeleteFolder called for folder:', folder);
    Alert.alert(
      'Delete Folder',
      `Delete "${folder?.name}"? Decks will be moved to Uncategorized.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            console.log('Deleting folder:', folder.id);
            deleteFolder(folder.id, {
              onSuccess: () => {
                console.log('Folder deleted successfully');
                Alert.alert('Success', `Folder "${folder.name}" deleted successfully`);
              },
              onError: (err: any) => {
                console.error('Delete folder error:', err);
                Alert.alert('Error', err?.message || 'Failed to delete folder');
              },
            });
          },
        },
      ]
    );
  };

  const handleMoveDeck = (deck: DeckListItem, folderId: string | null) => {
    if (folderId === null) {
      removeDeckFromFolder(deck.id, {
        onSuccess: () => setMovingDeck(null),
        onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to move deck'),
      });
    } else {
      moveDeckToFolder(
        { folderId, deckId: deck.id },
        {
          onSuccess: () => setMovingDeck(null),
          onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to move deck'),
        }
      );
    }
  };

  const handleDeleteDeck = (deck: DeckListItem) => {
    Alert.alert(
      'Delete Deck',
      `Delete "${deck?.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingDeckId(deck.id);
              console.log('Deleting deck:', deck.id);
              const result = await deckApi.deleteDeck(deck.id);
              console.log('Delete result:', result);
              await refetch();
              Alert.alert('Success', `Deck "${deck.name}" deleted successfully`);
            } catch (err: any) {
              console.error('Delete deck error:', err);
              Alert.alert('Error', err?.message || 'Failed to delete deck');
            } finally {
              setDeletingDeckId(null);
            }
          },
        },
      ]
    );
  };

  if (isLoadingDecks || isLoadingFolders) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load decks</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Decks</Text>
      </View>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search decks..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable style={styles.folderButton} onPress={() => setShowCreateFolderModal(true)}>
          <View style={styles.folderIconContainer}>
            <Ionicons name="folder" size={24} color="#6200ee" />
            <View style={styles.plusIconContainer}>
              <Ionicons name="add-circle" size={14} color="#6200ee" />
            </View>
          </View>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={['#6200ee']} />
        }
      >
        {/* Folders */}
        {folders?.map(folder => (
          <View key={folder?.id} style={styles.folderContainer}>
            <View style={styles.folderHeader}>
              <Pressable
                style={styles.folderHeaderLeft}
                onPress={() => toggleFolder(folder.id)}
              >
                <Ionicons
                  name={expandedFolders.has(folder.id) ? 'folder-open' : 'folder'}
                  size={24}
                  color="#6200ee"
                />
                <Text style={styles.folderName}>{folder?.name || 'Unnamed'}</Text>
                <Text style={styles.folderCount}>({groupedDecks.byFolder[folder.id]?.length || 0})</Text>
              </Pressable>
              <View style={styles.folderActions}>
                <Pressable 
                  onPress={() => { 
                    setEditingFolder(folder); 
                    setEditFolderName(folder.name); 
                  }} 
                  style={styles.iconButton}
                >
                  <Ionicons name="pencil" size={18} color="#666" />
                </Pressable>
                <Pressable 
                  onPress={() => {
                    handleDeleteFolder(folder);
                  }} 
                  style={styles.iconButton}
                >
                  <Ionicons name="trash" size={18} color="#d32f2f" />
                </Pressable>
              </View>
            </View>
            {expandedFolders.has(folder.id) && (
              <View style={styles.folderContent}>
                {groupedDecks.byFolder[folder.id]?.map(deck => (
                  <DeckCard
                    key={deck?.id}
                    deck={deck}
                    onPress={() => handleDeckPress(deck)}
                    onLongPress={() => setMovingDeck(deck)}
                    onMenuPress={() => setMovingDeck(deck)}
                    isDeleting={deletingDeckId === deck.id}
                  />
                )) || <Text style={styles.emptyFolderText}>No decks</Text>}
              </View>
            )}
          </View>
        ))}

        {/* Uncategorized */}
        {groupedDecks.uncategorized.length > 0 && (
          <View style={styles.folderContainer}>
            <Pressable
              style={styles.folderHeader}
              onPress={() => toggleFolder('uncategorized')}
            >
              <View style={styles.folderHeaderLeft}>
                <Ionicons name="documents" size={24} color="#999" />
                <Text style={[styles.folderName, { color: '#999' }]}>Uncategorized</Text>
                <Text style={styles.folderCount}>({groupedDecks.uncategorized.length})</Text>
              </View>
            </Pressable>
            {expandedFolders.has('uncategorized') && (
              <View style={styles.folderContent}>
                {groupedDecks.uncategorized.map(deck => (
                  <DeckCard
                    key={deck?.id}
                    deck={deck}
                    onPress={() => handleDeckPress(deck)}
                    onLongPress={() => setMovingDeck(deck)}
                    onMenuPress={() => setMovingDeck(deck)}
                    isDeleting={deletingDeckId === deck.id}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {!folders?.length && !groupedDecks.uncategorized.length && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No decks yet</Text>
            <Text style={styles.emptySubtext}>Tap + to import a deck</Text>
          </View>
        )}

        {/* Footer hint */}
        <View style={styles.footerHint}>
          <Ionicons name="information-circle-outline" size={16} color="#999" />
          <Text style={styles.footerHintText}>Long press to organize</Text>
        </View>
      </ScrollView>

      <FAB icon="add-outline" onPress={handleImportPress} label="Import deck" />

      {/* Create Folder Modal */}
      <Modal visible={showCreateFolderModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Folder</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Folder name"
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalButton} onPress={() => { setShowCreateFolderModal(false); setNewFolderName(''); }}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.modalButtonPrimary]} onPress={handleCreateFolder} disabled={isCreatingFolder}>
                {isCreatingFolder ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonTextPrimary}>Create</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Folder Modal */}
      <Modal visible={!!editingFolder} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rename Folder</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Folder name"
              value={editFolderName}
              onChangeText={setEditFolderName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalButton} onPress={() => { setEditingFolder(null); setEditFolderName(''); }}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.modalButtonPrimary]} onPress={handleUpdateFolder} disabled={isUpdatingFolder}>
                {isUpdatingFolder ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonTextPrimary}>Save</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Move/Delete Deck Modal */}
      <Modal visible={!!movingDeck} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Organize "{movingDeck?.name}"</Text>
            <Text style={styles.modalSubtitle}>Move to folder:</Text>
            <ScrollView style={styles.folderList}>
              <Pressable style={styles.folderOption} onPress={() => handleMoveDeck(movingDeck!, null)}>
                <Ionicons name="documents" size={20} color="#999" />
                <Text style={styles.folderOptionText}>Uncategorized</Text>
              </Pressable>
              {folders?.map(folder => (
                <Pressable key={folder?.id} style={styles.folderOption} onPress={() => handleMoveDeck(movingDeck!, folder.id)}>
                  <Ionicons name="folder" size={20} color="#6200ee" />
                  <Text style={styles.folderOptionText}>{folder?.name || 'Unnamed'}</Text>
                </Pressable>
              ))}
            </ScrollView>
            
            {/* Delete Section */}
            <View style={styles.deleteSection}>
              <Pressable 
                style={styles.deleteButton} 
                onPress={() => { 
                  const deckToDelete = movingDeck;
                  setMovingDeck(null);
                  setDeletingDeck(deckToDelete);
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#fff" />
                <Text style={styles.deleteButtonText}>Delete Deck</Text>
              </Pressable>
            </View>
            
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalButton, styles.modalButtonPrimary]} onPress={() => setMovingDeck(null)}>
                <Text style={styles.modalButtonTextPrimary}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={!!deletingDeck} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 'auto' }]}>
            <Text style={styles.modalTitle}>Delete Deck</Text>
            <Text style={styles.modalSubtitle}>
              Delete "{deletingDeck?.name}"? This cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <Pressable 
                style={styles.modalButton} 
                onPress={() => setDeletingDeck(null)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={[styles.modalButton, { backgroundColor: '#d32f2f' }]} 
                onPress={async () => {
                  if (deletingDeck) {
                    try {
                      setDeletingDeckId(deletingDeck.id);
                      setDeletingDeck(null);
                      await deckApi.deleteDeck(deletingDeck.id);
                      await refetch();
                    } catch (err: any) {
                      console.error('Delete deck error:', err);
                      Alert.alert('Error', err?.message || 'Failed to delete deck');
                    } finally {
                      setDeletingDeckId(null);
                    }
                  }
                }}
              >
                <Text style={[styles.modalButtonTextPrimary, { color: '#fff' }]}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#6200ee', paddingVertical: 16, paddingHorizontal: 16 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  errorText: { fontSize: 18, fontWeight: 'bold', color: '#d32f2f', marginBottom: 8 },
  errorMessage: { fontSize: 14, color: '#666', textAlign: 'center' },
  searchContainer: { flexDirection: 'row', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0', gap: 12 },
  searchInput: { flex: 1, height: 48, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, paddingHorizontal: 16, fontSize: 16, backgroundColor: '#f9f9f9' },
  folderButton: { padding: 8, borderWidth: 1, borderColor: '#6200ee', borderRadius: 8 },
  folderIconContainer: { position: 'relative', width: 24, height: 24 },
  plusIconContainer: { position: 'absolute', bottom: -2, right: -4, backgroundColor: '#fff', borderRadius: 7 },
  scrollView: { flex: 1 },
  folderContainer: { marginVertical: 8, marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  folderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fafafa' },
  folderHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  folderName: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },
  folderCount: { fontSize: 14, color: '#999' },
  folderActions: { flexDirection: 'row', gap: 12 },
  iconButton: { padding: 4 },
  folderContent: { paddingVertical: 8 },
  emptyFolderText: { padding: 16, textAlign: 'center', color: '#999', fontStyle: 'italic' },
  emptyContainer: { padding: 48, alignItems: 'center' },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#999', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#999' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 16, padding: 24, maxHeight: '70%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 12 },
  modalInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 24 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalButton: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, backgroundColor: '#f5f5f5' },
  modalButtonPrimary: { backgroundColor: '#6200ee' },
  modalButtonText: { fontSize: 16, fontWeight: '600', color: '#666' },
  modalButtonTextPrimary: { fontSize: 16, fontWeight: '600', color: '#fff' },
  folderList: { maxHeight: 300, marginBottom: 12 },
  folderOption: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  folderOptionText: { fontSize: 16, color: '#1a1a1a' },
  deleteSection: { marginTop: 12, marginBottom: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#d32f2f', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  deleteButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  footerHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 6 },
  footerHintText: { fontSize: 14, color: '#999' },
});

export default DeckListScreen;
