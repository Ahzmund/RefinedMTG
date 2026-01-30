import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ManaSymbolsProps {
  manaCost: string;
  size?: number;
}

const ManaSymbols: React.FC<ManaSymbolsProps> = ({ manaCost, size = 20 }) => {
  if (!manaCost) return <Text style={styles.emptyMana}>—</Text>;

  // Parse mana cost string like "{2}{U}{U}" into individual symbols
  const symbols = manaCost.match(/\{[^}]+\}/g) || [];

  const isHybrid = (symbol: string): boolean => {
    const inner = symbol.replace(/[{}]/g, '');
    // Hybrid but NOT phyrexian (phyrexian uses /P)
    return inner.includes('/') && !inner.includes('P');
  };

  const isPhyrexian = (symbol: string): boolean => {
    const inner = symbol.replace(/[{}]/g, '');
    return inner.includes('/P') || inner.includes('P/');
  };

  // Get land symbol for each color
  const getLandSymbol = (color: string): string => {
    if (color === 'W') return '☀'; // Plains - Sun
    if (color === 'U') return '💧'; // Island - Water drop
    if (color === 'B') return '💀'; // Swamp - Skull
    if (color === 'R') return '🔥'; // Mountain - Flame
    if (color === 'G') return '🌲'; // Forest - Tree
    return '';
  };

  const getColorForLetter = (letter: string): string => {
    if (letter === 'W') return '#F9FAE9'; // White (pale yellow-white)
    if (letter === 'U') return '#0E68AB'; // Blue
    if (letter === 'B') return '#1C1616'; // Black (slightly lighter for visibility)
    if (letter === 'R') return '#D3202A'; // Red
    if (letter === 'G') return '#00733E'; // Green
    return '#CAC5C0'; // Colorless/Generic (lighter gray)
  };

  const getHybridColors = (symbol: string): [string, string] | null => {
    const inner = symbol.replace(/[{}]/g, '');
    if (!isHybrid(symbol)) return null;
    
    const parts = inner.split('/');
    if (parts.length !== 2) return null;
    
    return [getColorForLetter(parts[0]), getColorForLetter(parts[1])];
  };

  const getSymbolColor = (symbol: string): string => {
    const inner = symbol.replace(/[{}]/g, '');
    
    // Phyrexian mana - use darker, more saturated colors
    if (isPhyrexian(symbol)) {
      if (inner.includes('W')) return '#C4B5A0'; // Bone/Brown
      if (inner.includes('U')) return '#004B87'; // Darker Blue
      if (inner.includes('B')) return '#0A0501'; // Deeper Black
      if (inner.includes('R')) return '#8B0000'; // Dark Red
      if (inner.includes('G')) return '#004D2B'; // Dark Green
      return '#6B6B6B'; // Dark Gray for colorless phyrexian
    }
    
    // Hybrid mana - handled separately with split square
    if (isHybrid(symbol)) {
      return '#CAC5C0'; // Placeholder, won't be used
    }
    
    // Regular mana colors
    return getColorForLetter(inner);
  };

  const getSymbolText = (symbol: string): string => {
    const inner = symbol.replace(/[{}]/g, '');
    
    // For phyrexian mana, show Phi symbol
    if (isPhyrexian(symbol)) {
      return 'Φ'; // Greek letter Phi (Phyrexian symbol)
    }
    
    // For hybrid mana, no text (split circle shows colors)
    if (isHybrid(symbol)) {
      return '';
    }
    
    // For X, Y, Z, show letter
    if (inner === 'X' || inner === 'Y' || inner === 'Z') {
      return inner;
    }
    
    // For colored mana (W, U, B, R, G), no text - just color
    if (['W', 'U', 'B', 'R', 'G'].includes(inner)) {
      return '';
    }
    
    // For generic mana (numbers), show the number
    return inner;
  };

  const getTextColor = (bgColor: string): string => {
    // Use white text for dark backgrounds, dark text for light backgrounds
    const lightBgs = ['#F9FAE9', '#CAC5C0', '#C4B5A0']; // White and colorless
    return lightBgs.includes(bgColor) ? '#2a2a2a' : '#FFFFFF';
  };

  return (
    <View style={styles.container}>
      {symbols.map((symbol, index) => {
        const inner = symbol.replace(/[{}]/g, '');
        const hybridColors = getHybridColors(symbol);
        const phyrexian = isPhyrexian(symbol);
        
        // Hybrid mana - render split rounded square with symbols
        if (hybridColors && !phyrexian) {
          const [color1, color2] = hybridColors;
          const parts = inner.split('/');
          const symbol1 = getLandSymbol(parts[0]);
          const symbol2 = getLandSymbol(parts[1]);
          
          return (
            <View
              key={`${symbol}-${index}`}
              style={[
                styles.pip,
                {
                  width: size,
                  height: size,
                  borderRadius: size * 0.25, // Rounded square
                  overflow: 'hidden',
                  borderWidth: 1.5,
                  borderColor: '#2a2a2a',
                  position: 'relative',
                },
              ]}
            >
              {/* Create a clean diagonal split using two triangular shapes */}
              {/* Top-left triangle (color1) */}
              <View
                style={{
                  position: 'absolute',
                  width: 0,
                  height: 0,
                  top: 0,
                  left: 0,
                  borderStyle: 'solid',
                  borderLeftWidth: size,
                  borderBottomWidth: size,
                  borderLeftColor: color1,
                  borderBottomColor: 'transparent',
                  borderTopLeftRadius: size * 0.25,
                }}
              />
              {/* Bottom-right triangle (color2) */}
              <View
                style={{
                  position: 'absolute',
                  width: 0,
                  height: 0,
                  bottom: 0,
                  right: 0,
                  borderStyle: 'solid',
                  borderRightWidth: size,
                  borderTopWidth: size,
                  borderRightColor: color2,
                  borderTopColor: 'transparent',
                  borderBottomRightRadius: size * 0.25,
                }}
              />
              {/* Top-left symbol */}
              <Text
                style={{
                  position: 'absolute',
                  fontSize: size * 0.35,
                  top: size * 0.12,
                  left: size * 0.18,
                  textShadowColor: 'rgba(0,0,0,0.3)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                }}
              >
                {symbol1}
              </Text>
              {/* Bottom-right symbol */}
              <Text
                style={{
                  position: 'absolute',
                  fontSize: size * 0.35,
                  bottom: size * 0.12,
                  right: size * 0.18,
                  textShadowColor: 'rgba(0,0,0,0.3)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                }}
              >
                {symbol2}
              </Text>
            </View>
          );
        }
        
        // Phyrexian mana
        if (phyrexian) {
          const color = inner.replace(/\/P|P\//, '');
          const bgColor = getSymbolColor(symbol);
          const landSymbol = getLandSymbol(color);
          
          return (
            <View
              key={`${symbol}-${index}`}
              style={[
                styles.pip,
                {
                  width: size,
                  height: size,
                  borderRadius: size * 0.25, // Rounded square
                  backgroundColor: bgColor,
                  borderWidth: 2,
                  borderColor: '#1a1a1a',
                },
              ]}
            >
              {/* Land symbol */}
              {landSymbol && (
                <Text
                  style={{
                    fontSize: size * 0.4,
                    color: '#fff',
                  }}
                >
                  {landSymbol}
                </Text>
              )}
              {/* Vertical line (Phyrexian indicator) */}
              <View
                style={{
                  position: 'absolute',
                  width: size * 0.12,
                  height: size * 0.7,
                  backgroundColor: '#000',
                  borderRadius: size * 0.06,
                }}
              />
            </View>
          );
        }
        
        // Regular colored mana pip
        const bgColor = getSymbolColor(symbol);
        const text = getSymbolText(symbol);
        const landSymbol = getLandSymbol(inner);
        const textColor = getTextColor(bgColor);
        
        return (
          <View
            key={`${symbol}-${index}`}
            style={[
              styles.pip,
              {
                width: size,
                height: size,
                borderRadius: size * 0.25, // Rounded square
                backgroundColor: bgColor,
                borderWidth: 1.5,
                borderColor: '#2a2a2a',
              },
            ]}
          >
            {landSymbol ? (
              <Text
                style={{
                  fontSize: size * 0.5,
                  color: textColor,
                }}
              >
                {landSymbol}
              </Text>
            ) : text ? (
              <Text
                style={[
                  styles.pipText,
                  {
                    fontSize: size * 0.5,
                    color: textColor,
                    fontWeight: 'bold',
                  },
                ]}
              >
                {text}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  pip: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pipText: {
    fontWeight: 'bold',
  },
  emptyMana: {
    fontSize: 14,
    color: '#999',
  },
});

export default ManaSymbols;
