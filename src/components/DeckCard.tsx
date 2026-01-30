import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { DeckListItem } from '../types';
import { Ionicons } from '@expo/vector-icons';

interface DeckCardProps {
  deck: DeckListItem;
  onPress: () => void;
  onLongPress?: () => void;
  onMenuPress?: () => void;
  isDeleting?: boolean;
}

const DeckCard: React.FC<DeckCardProps> = ({ deck, onPress, onLongPress, onMenuPress, isDeleting = false }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
        isDeleting && styles.cardDeleting,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={isDeleting}
      accessibilityRole="button"
      accessibilityLabel={`View deck ${deck.name}`}
      accessibilityHint="Long press to organize"
    >
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={2}>
          {deck.name}
        </Text>
        <View style={styles.headerActions}>
          {isDeleting && (
            <ActivityIndicator size="small" color="#d32f2f" style={styles.deleteIndicator} />
          )}
          {onMenuPress && !isDeleting && (
            <Pressable 
              onPress={(e) => {
                e.stopPropagation();
                onMenuPress();
              }}
              style={styles.menuButton}
              hitSlop={8}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#666" />
            </Pressable>
          )}
        </View>
      </View>
      <View style={styles.info}>
        <Text style={styles.cardCount}>{deck.cardCount} cards</Text>
        <Text style={styles.date}>Modified: {formatDate(deck.lastModified)}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardPressed: {
    opacity: 0.7,
  },
  cardDeleting: {
    opacity: 0.5,
  },
  header: {
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuButton: {
    padding: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
  },
  deleteIndicator: {
    marginLeft: 8,
  },
  info: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardCount: {
    fontSize: 14,
    color: '#6200ee',
    fontWeight: '600',
  },
  date: {
    fontSize: 14,
    color: '#666',
  },
});

export default DeckCard;
