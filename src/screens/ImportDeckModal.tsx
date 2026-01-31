import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useFolders } from '../hooks/useFolders';
import { importDeckFromDecklist, importDeckFromMoxfield, createEmptyDeck } from '../services/deckImportService';
import { extractDeckIdFromUrl, getMoxfieldDeckUrl } from '../services/moxfieldService';
import { useQueryClient } from '@tanstack/react-query';
import SimpleToast from '../components/SimpleToast';
import MoxfieldWebViewImporter from '../components/MoxfieldWebViewImporter';
import { MoxfieldDeckData } from '../services/moxfieldService';
import CardAutocomplete from '../components/CardAutocomplete';

type CreationMethod = 'empty' | 'moxfield' | 'decklist';

const ImportDeckModal: React.FC = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<CreationMethod>('empty');
  const [deckName, setDeckName] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [moxfieldUrl, setMoxfieldUrl] = useState('');
  const [decklist, setDecklist] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showMoxfieldWebView, setShowMoxfieldWebView] = useState(false);
  const [commander1, setCommander1] = useState('');
  const [commander2, setCommander2] = useState('');
  const [showSideboardConfirm, setShowSideboardConfirm] = useState(false);
  const [parsedSideboard, setParsedSideboard] = useState<string>('');
  const [editedSideboard, setEditedSideboard] = useState<string>('');
  
  const { data: folders } = useFolders();

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
  };

  const handleCreate = async () => {
    // Only require deck name for non-Moxfield methods
    if (method !== 'moxfield' && !deckName.trim()) {
      Alert.alert('Error', 'Please enter a deck name');
      return;
    }

    setIsImporting(true);

    try {
      if (method === 'empty') {
        const commanders = [commander1, commander2].filter(c => c.trim());
        const deckId = await createEmptyDeck(deckName, selectedFolderId || undefined, commanders);
        queryClient.invalidateQueries({ queryKey: ['decks'] });
        showToast('Deck created successfully!');
        setTimeout(() => navigation.goBack(), 1000);
      } else if (method === 'decklist') {
        if (!decklist.trim()) {
          Alert.alert('Error', 'Please enter a decklist');
          setIsImporting(false);
          return;
        }

        // Check if sideboard is present
        const { parseDecklist } = await import('../services/decklistParser');
        const parsed = parseDecklist(decklist);
        
        if (parsed.sideboard.length > 0) {
          // Show sideboard confirmation dialog
          const sideboardText = parsed.sideboard
            .map(card => `${card.quantity} ${card.name}`)
            .join('\n');
          setParsedSideboard(sideboardText);
          setEditedSideboard(sideboardText);
          setShowSideboardConfirm(true);
          setIsImporting(false);
          return;
        }

        // No sideboard, proceed with import
        await performDecklistImport(decklist);
      } else if (method === 'moxfield') {
        if (!moxfieldUrl.trim()) {
          Alert.alert('Error', 'Please enter a Moxfield URL');
          setIsImporting(false);
          return;
        }

        const deckId = extractDeckIdFromUrl(moxfieldUrl);
        if (!deckId) {
          Alert.alert('Error', 'Invalid Moxfield URL');
          setIsImporting(false);
          return;
        }

        // Show WebView to scrape Moxfield
        setShowMoxfieldWebView(true);
      }
    } catch (error: any) {
      console.error('Import error:', error);
      Alert.alert('Error', error.message || 'Failed to create deck');
      setIsImporting(false);
    }
  };

  const handleMoxfieldSuccess = async (deckData: MoxfieldDeckData) => {
    setShowMoxfieldWebView(false);
    
    try {
      const result = await importDeckFromMoxfield(deckData, selectedFolderId || undefined);
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      
      if (result.failedCards.length > 0) {
        showToast(`Deck "${deckData.name}" imported! ${result.successCount} cards imported, ${result.failedCards.length} failed.`);
      } else {
        showToast(`Deck "${deckData.name}" imported successfully! ${result.successCount} cards.`);
      }
      
      setTimeout(() => {
        setIsImporting(false);
        navigation.goBack();
      }, 2000);
    } catch (error: any) {
      console.error('Moxfield import error:', error);
      Alert.alert('Error', error.message || 'Failed to import deck from Moxfield');
      setIsImporting(false);
    }
  };

  const handleMoxfieldError = (error: string) => {
    setShowMoxfieldWebView(false);
    setIsImporting(false);
    Alert.alert('Moxfield Import Failed', error);
  };

  const performDecklistImport = async (decklistText: string) => {
    setIsImporting(true);
    try {
      const commanders = [commander1, commander2].filter(c => c.trim());
      const result = await importDeckFromDecklist(deckName, decklistText, selectedFolderId || undefined, commanders);
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      
      if (result.failedCards.length > 0) {
        showToast(`Deck created! ${result.successCount} cards imported, ${result.failedCards.length} failed.`);
      } else {
        showToast(`Deck created! ${result.successCount} cards imported.`);
      }
      
      setTimeout(() => navigation.goBack(), 1500);
    } catch (error: any) {
      console.error('Import error:', error);
      Alert.alert('Error', error.message || 'Failed to create deck');
    } finally {
      setIsImporting(false);
    }
  };

  const handleSideboardConfirm = async () => {
    setShowSideboardConfirm(false);
    
    // Reconstruct decklist with edited sideboard
    const mainboardOnly = decklist.split(/sideboard/i)[0].trim();
    const reconstructed = editedSideboard.trim() 
      ? `${mainboardOnly}\n\nSIDEBOARD:\n${editedSideboard}`
      : mainboardOnly;
    
    await performDecklistImport(reconstructed);
  };

  const handleSideboardCancel = () => {
    setShowSideboardConfirm(false);
    setIsImporting(false);
  };

  // If showing Moxfield WebView, render that instead
  if (showMoxfieldWebView) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Importing from Moxfield</Text>
          <Pressable
            onPress={() => {
              setShowMoxfieldWebView(false);
              setIsImporting(false);
            }}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={28} color="#666" />
          </Pressable>
        </View>
        <MoxfieldWebViewImporter
          moxfieldUrl={moxfieldUrl}
          onSuccess={handleMoxfieldSuccess}
          onError={handleMoxfieldError}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create New Deck</Text>
            <Pressable onPress={() => navigation.goBack()} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#666" />
            </Pressable>
          </View>

          {/* Method Selection */}
          <View style={styles.methodContainer}>
            <Text style={styles.label}>Creation Method</Text>
            <View style={styles.methodButtons}>
              <Pressable
                style={[styles.methodButton, method === 'empty' && styles.methodButtonActive]}
                onPress={() => setMethod('empty')}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={24}
                  color={method === 'empty' ? '#6200ee' : '#666'}
                />
                <Text style={[styles.methodText, method === 'empty' && styles.methodTextActive]}>
                  Empty
                </Text>
              </Pressable>

              <Pressable
                style={[styles.methodButton, method === 'moxfield' && styles.methodButtonActive]}
                onPress={() => setMethod('moxfield')}
              >
                <Ionicons
                  name="link-outline"
                  size={24}
                  color={method === 'moxfield' ? '#6200ee' : '#666'}
                />
                <Text style={[styles.methodText, method === 'moxfield' && styles.methodTextActive]}>
                  Moxfield URL
                </Text>
              </Pressable>

              <Pressable
                style={[styles.methodButton, method === 'decklist' && styles.methodButtonActive]}
                onPress={() => setMethod('decklist')}
              >
                <Ionicons
                  name="list-outline"
                  size={24}
                  color={method === 'decklist' ? '#6200ee' : '#666'}
                />
                <Text style={[styles.methodText, method === 'decklist' && styles.methodTextActive]}>
                  Decklist
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Deck Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Deck Name{method === 'moxfield' ? ' (Optional - will use Moxfield name)' : ''}
            </Text>
            <TextInput
              style={styles.input}
              value={deckName}
              onChangeText={setDeckName}
              placeholder={method === 'moxfield' ? 'Leave empty to use Moxfield deck name' : 'Enter deck name'}
              placeholderTextColor="#999"
            />
          </View>

          {/* Folder Selection */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Folder (Optional)</Text>
            <Pressable
              style={styles.dropdownButton}
              onPress={() => setShowFolderDropdown(!showFolderDropdown)}
            >
              <Text style={styles.dropdownText}>
                {selectedFolderId
                  ? folders?.find(f => f.id === selectedFolderId)?.name || 'Select folder'
                  : 'No folder'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </Pressable>
            {showFolderDropdown && (
              <View style={styles.dropdown}>
                <Pressable
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedFolderId(null);
                    setShowFolderDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>No folder</Text>
                </Pressable>
                {folders?.map(folder => (
                  <Pressable
                    key={folder.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedFolderId(folder.id);
                      setShowFolderDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{folder.name}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Command Zone (for empty and decklist methods) */}
          {(method === 'empty' || method === 'decklist') && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Command Zone (Optional)</Text>
              <Text style={styles.helperText}>Add up to 2 commanders (legendary creatures/planeswalkers)</Text>
              <CardAutocomplete
                value={commander1}
                onChangeText={setCommander1}
                onSelectCard={(card) => setCommander1(card.name)}
                placeholder="Commander 1 (e.g., Atraxa, Praetors' Voice)"
              />
              <View style={{ marginTop: 8 }}>
                <CardAutocomplete
                  value={commander2}
                  onChangeText={setCommander2}
                  onSelectCard={(card) => setCommander2(card.name)}
                  placeholder="Commander 2 (optional, for Partner)"
                />
              </View>
            </View>
          )}

          {/* Method-specific inputs */}
          {method === 'moxfield' && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Moxfield URL</Text>
              <TextInput
                style={styles.input}
                value={moxfieldUrl}
                onChangeText={setMoxfieldUrl}
                placeholder="https://moxfield.com/decks/..."
                placeholderTextColor="#999"
                autoCapitalize="none"
              />
            </View>
          )}

          {method === 'decklist' && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Decklist</Text>
              <Text style={styles.helperText}>Don't include commanders here - add them in Command Zone above</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={decklist}
                onChangeText={setDecklist}
                placeholder="1 Lightning Bolt&#10;1 Sol Ring&#10;...&#10;&#10;SIDEBOARD:&#10;1 Rest in Peace&#10;1 Grafdigger's Cage"
                placeholderTextColor="#999"
                multiline
                numberOfLines={10}
                textAlignVertical="top"
              />
            </View>
          )}

          {/* Create Button */}
          <Pressable
            style={[styles.createButton, isImporting && styles.createButtonDisabled]}
            onPress={handleCreate}
            disabled={isImporting}
          >
            {isImporting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>Create Deck</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <SimpleToast
        visible={toastVisible}
        message={toastMessage}
        onDismiss={() => setToastVisible(false)}
      />

      {/* Sideboard Confirmation Modal */}
      {showSideboardConfirm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sideboard Detected</Text>
              <Ionicons name="information-circle" size={24} color="#6200ee" />
            </View>
            <Text style={styles.modalDescription}>
              We found a sideboard in your decklist. Please review and confirm the cards below:
            </Text>
            <TextInput
              style={[styles.input, styles.textArea, styles.modalTextArea]}
              value={editedSideboard}
              onChangeText={setEditedSideboard}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              placeholder="No sideboard cards"
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={handleSideboardCancel}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleSideboardConfirm}
              >
                <Text style={styles.modalButtonTextPrimary}>Confirm & Import</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  methodContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  helperText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  methodButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  methodButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    gap: 8,
  },
  methodButtonActive: {
    borderColor: '#6200ee',
    backgroundColor: '#f3e5f5',
  },
  methodText: {
    fontSize: 14,
    color: '#666',
  },
  methodTextActive: {
    color: '#6200ee',
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    minHeight: 150,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  dropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  createButton: {
    backgroundColor: '#6200ee',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  modalTextArea: {
    minHeight: 120,
    maxHeight: 200,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#6200ee',
  },
  modalButtonSecondary: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalButtonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextSecondary: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ImportDeckModal;
