import React from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CardDetails } from '../types';
import ManaSymbols from './ManaSymbols';

interface CardDetailModalProps {
  visible: boolean;
  cardDetails: CardDetails | null;
  isLoading: boolean;
  showImage: boolean;
  onClose: () => void;
}

const CardDetailModal: React.FC<CardDetailModalProps> = ({
  visible,
  cardDetails,
  isLoading,
  showImage,
  onClose,
}) => {
  if (!visible) return null;
  
  // Debug logging
  if (cardDetails) {
    console.log('CardDetailModal - cardDetails:', JSON.stringify(cardDetails, null, 2));
  }

  const renderStats = () => {
    if (!cardDetails) return null;

    const stats = [];
    
    // Creature stats
    if (cardDetails.power && cardDetails.toughness) {
      stats.push(`${cardDetails.power}/${cardDetails.toughness}`);
    }
    
    // Planeswalker loyalty
    if (cardDetails.loyalty) {
      stats.push(`Loyalty: ${cardDetails.loyalty}`);
    }
    
    // Battle defense
    if (cardDetails.defense) {
      stats.push(`Defense: ${cardDetails.defense}`);
    }

    return stats.length > 0 ? (
      <Text style={styles.stats}>{stats.join(' • ')}</Text>
    ) : null;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#1a1a1a" />
          </Pressable>
          <Text style={styles.headerTitle}>Card Details</Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6200ee" />
              <Text style={styles.loadingText}>Loading card details...</Text>
            </View>
          ) : cardDetails ? (
            <>
              {showImage && cardDetails.largeImageUrl ? (
                <>
                  <View style={styles.imageContainer}>
                    <Image
                      source={{ uri: cardDetails.largeImageUrl }}
                      style={styles.cardImage}
                      resizeMode="contain"
                    />
                  </View>
                  {/* Large close button for image mode */}
                  <Pressable 
                    style={({ pressed }) => [
                      styles.largeCloseButton,
                      pressed && styles.largeCloseButtonPressed,
                    ]}
                    onPress={onClose}
                  >
                    <Ionicons name="close-circle" size={24} color="#fff" />
                    <Text style={styles.largeCloseButtonText}>Close</Text>
                  </Pressable>
                </>
              ) : (
                <View style={styles.textDetails}>
                  <Text style={styles.cardName}>{cardDetails.name}</Text>
                  
                  <View style={styles.manaCostRow}>
                    <Text style={styles.manaCostLabel}>Mana Cost: </Text>
                    <ManaSymbols manaCost={cardDetails.manaCost || ''} size={24} />
                  </View>
                  
                  <Text style={styles.typeLine}>{cardDetails.typeLine}</Text>
                  
                  {renderStats()}

                  {cardDetails.oracleText ? (
                    <View style={styles.oracleTextContainer}>
                      <Text style={styles.oracleTextLabel}>Oracle Text:</Text>
                      <Text style={styles.oracleText}>{cardDetails.oracleText}</Text>
                    </View>
                  ) : null}

                  {cardDetails.cardFaces && cardDetails.cardFaces.length > 0 && (
                    <View style={styles.facesContainer}>
                      {cardDetails.cardFaces.map((face, index) => (
                        <View key={index} style={styles.faceCard}>
                          <Text style={styles.faceName}>{face.name}</Text>
                          <Text style={styles.faceType}>{face.typeLine}</Text>
                          {face.power && face.toughness && (
                            <Text style={styles.faceStats}>{face.power}/{face.toughness}</Text>
                          )}
                          {face.loyalty && (
                            <Text style={styles.faceStats}>Loyalty: {face.loyalty}</Text>
                          )}
                          <Text style={styles.faceOracle}>{face.oracleText}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Large close button for text mode */}
                  <Pressable 
                    style={({ pressed }) => [
                      styles.largeCloseButton,
                      pressed && styles.largeCloseButtonPressed,
                    ]}
                    onPress={onClose}
                  >
                    <Ionicons name="close-circle" size={24} color="#fff" />
                    <Text style={styles.largeCloseButtonText}>Close</Text>
                  </Pressable>
                </View>
              )}
            </>
          ) : (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={64} color="#999" />
              <Text style={styles.errorText}>Failed to load card details</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 8,
    width: 44,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  imageContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  cardImage: {
    width: '100%',
    height: 500,
    borderRadius: 12,
  },
  textDetails: {
    paddingVertical: 8,
  },
  cardName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  manaCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  manaCostLabel: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
  },
  typeLine: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  stats: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 12,
  },
  oracleTextContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  oracleTextLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  oracleText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1a1a1a',
  },
  facesContainer: {
    marginTop: 16,
  },
  faceCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  faceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  faceType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  faceStats: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 8,
  },
  faceOracle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1a1a1a',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  largeCloseButton: {
    marginTop: 32,
    backgroundColor: '#6200ee',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  largeCloseButtonPressed: {
    backgroundColor: '#4a00b8',
  },
  largeCloseButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default CardDetailModal;
