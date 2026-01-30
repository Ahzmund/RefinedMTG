import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import SimpleToast from './SimpleToast';
import { ChangeHistoryItem as ChangeHistoryType } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { deleteChangelog } from '../database/changelogService';

interface ChangeHistoryItemProps {
  change: ChangeHistoryType;
  deckId: string;
}

const ChangeHistoryItem: React.FC<ChangeHistoryItemProps> = ({ change, deckId }) => {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(change.description || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const queryClient = useQueryClient();

  // Debug logging
  console.log('ChangeHistoryItem received change:', {
    id: change.id,
    description: change.description,
    changeDate: change.changeDate
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSaveDescription = async () => {
    setIsUpdating(true);
    try {
      await apiClient.put(`/api/decks/changes/${change.id}/description`, {
        description,
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['deck', deckId] });
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update description');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteImportError = async () => {
    Alert.alert(
      'Delete Import Error Entry',
      'Are you sure you want to delete this import error entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChangelog(change.id);
              queryClient.invalidateQueries({ queryKey: ['deck', deckId] });
              queryClient.invalidateQueries({ queryKey: ['changelogs', deckId] });
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Failed to delete entry');
            }
          },
        },
      ]
    );
  };

  const handleCopyAddedCards = async () => {
    if (change.cardsAdded.length === 0) {
      Alert.alert('No Cards', 'No cards were added in this change.');
      return;
    }

    // Format: "quantity cardname" per line
    const cardList = change.cardsAdded
      .map(card => `${card.quantity} ${card.name}`)
      .join('\n');

    try {
      await Clipboard.setStringAsync(cardList);
      setShowToast(true);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      Alert.alert('Error', 'Failed to copy cards');
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        accessibilityRole="button"
        accessibilityLabel={`Toggle change details from ${formatDate(change.changeDate)}`}
      >
        <View style={styles.headerLeft}>
          <View style={styles.dateRow}>
            <Text style={[styles.date, change.isImportError && styles.errorDate]}>
              {formatDate(change.changeDate)}
            </Text>
            {change.isImportError && (
              <Text style={styles.errorLabel}> - Import Errors</Text>
            )}
          </View>
          {!change.isImportError && (
            <Text style={styles.summary}>
              {change.cardsAdded.length > 0 && `+${change.cardsAdded.length} added `}
              {change.cardsRemoved.length > 0 && `-${change.cardsRemoved.length} removed`}
            </Text>
          )}
        </View>
        <View style={styles.headerRight}>
          {change.isImportError && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                handleDeleteImportError();
              }}
              style={styles.deleteButton}
              accessibilityRole="button"
              accessibilityLabel="Delete import error entry"
            >
              <Ionicons name="close-circle" size={24} color="#d32f2f" />
            </Pressable>
          )}
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={24}
            color="#666"
          />
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.content}>
          {/* Description Section */}
          <View style={styles.descriptionSection}>
            <View style={styles.descriptionHeader}>
              <Text style={styles.descriptionTitle}>Overall Description</Text>
              {!isEditing && (
                <Pressable onPress={() => setIsEditing(true)} disabled={isUpdating}>
                  <Ionicons name="pencil" size={20} color="#6200ee" />
                </Pressable>
              )}
            </View>
            {isEditing ? (
              <View>
                <TextInput
                  style={styles.descriptionInput}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Add a description for this change..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                  editable={!isUpdating}
                />
                <View style={styles.editButtons}>
                  <Pressable
                    style={[styles.editButton, styles.cancelButton]}
                    onPress={() => {
                      setDescription(change.description || '');
                      setIsEditing(false);
                    }}
                    disabled={isUpdating}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.editButton, styles.saveButton]}
                    onPress={handleSaveDescription}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <Text style={styles.descriptionText}>
                {description || 'No description provided'}
              </Text>
            )}
          </View>

          {change.cardsAdded.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Cards Added</Text>
                <Pressable
                  style={styles.copyButton}
                  onPress={handleCopyAddedCards}
                  accessibilityRole="button"
                  accessibilityLabel="Copy added cards to clipboard"
                >
                  <Ionicons name="copy-outline" size={18} color="#6200ee" />
                  <Text style={styles.copyButtonText}>Copy</Text>
                </Pressable>
              </View>
              {change.cardsAdded.map((card, index) => (
                <View key={`added-${index}`} style={styles.cardItem}>
                  <View style={styles.cardItemHeader}>
                    <Text style={styles.cardName}>{card.name}</Text>
                    <Text style={styles.cardQuantity}>×{card.quantity}</Text>
                  </View>
                  <Text style={styles.cardReasoning}>{card.reasoning}</Text>
                </View>
              ))}
            </View>
          )}

          {change.cardsRemoved.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cards Removed</Text>
              {change.cardsRemoved.map((card, index) => (
                <View key={`removed-${index}`} style={styles.cardItem}>
                  <View style={styles.cardItemHeader}>
                    <Text style={styles.cardName}>{card.name}</Text>
                    <Text style={styles.cardQuantity}>×{card.quantity}</Text>
                  </View>
                  <Text style={styles.cardReasoning}>{card.reasoning}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <SimpleToast
        visible={showToast}
        message="Copied!"
        onDismiss={() => setShowToast(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    padding: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  errorDate: {
    color: '#d32f2f',
  },
  errorLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  summary: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  section: {
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f5f0ff',
    gap: 4,
  },
  copyButtonText: {
    fontSize: 12,
    color: '#6200ee',
    fontWeight: '600',
  },
  cardItem: {
    marginBottom: 12,
  },
  cardItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  cardQuantity: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  cardReasoning: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  descriptionSection: {
    marginTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  descriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  descriptionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  descriptionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1a1a1a',
    backgroundColor: '#fff',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  editButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  saveButton: {
    backgroundColor: '#6200ee',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ChangeHistoryItem;
