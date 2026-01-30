import React from 'react';
import { StyleSheet, Pressable, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FABProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label?: string;
  bottom?: number;
  right?: number;
}

const FAB: React.FC<FABProps> = ({ icon, onPress, label, bottom = 24, right = 24 }) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.fab,
        { bottom, right },
        pressed && styles.fabPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label || 'Action button'}
    >
      <Ionicons name={icon} size={24} color="#fff" />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
});

export default FAB;
