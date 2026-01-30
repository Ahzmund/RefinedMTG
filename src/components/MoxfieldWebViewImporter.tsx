import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { MoxfieldDeckData } from '../services/moxfieldService';

interface MoxfieldWebViewImporterProps {
  moxfieldUrl: string;
  onSuccess: (deckData: MoxfieldDeckData) => void;
  onError: (error: string) => void;
}

const MoxfieldWebViewImporter: React.FC<MoxfieldWebViewImporterProps> = ({
  moxfieldUrl,
  onSuccess,
  onError,
}) => {
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading Moxfield page...');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const extractionAttempted = useRef(false);

  // Enhanced script to extract __NEXT_DATA__ from the page
  const injectedJavaScript = `
    (function() {
      // Wait for page to be fully loaded
      setTimeout(function() {
        try {
          console.log('[Moxfield Debug] Starting extraction...');
          
          // Check if __NEXT_DATA__ exists
          if (!window.__NEXT_DATA__) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              message: 'window.__NEXT_DATA__ not found. Moxfield may have changed their page structure.'
            }));
            return;
          }
          
          console.log('[Moxfield Debug] __NEXT_DATA__ found');
          
          // Navigate to deck data - Moxfield uses Next.js
          const nextData = window.__NEXT_DATA__;
          
          if (!nextData.props || !nextData.props.pageProps) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              message: 'Could not find pageProps in __NEXT_DATA__'
            }));
            return;
          }
          
          const pageProps = nextData.props.pageProps;
          
          // Try different possible locations for deck data
          let deck = null;
          
          // Method 1: Direct deck property
          if (pageProps.deck) {
            deck = pageProps.deck;
          }
          // Method 2: Inside initialState
          else if (pageProps.initialState && pageProps.initialState.deck) {
            deck = pageProps.initialState.deck;
          }
          // Method 3: Inside deckData
          else if (pageProps.deckData) {
            deck = pageProps.deckData;
          }
          
          if (!deck) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              message: 'Could not find deck data. Available keys: ' + Object.keys(pageProps).join(', ')
            }));
            return;
          }
          
          console.log('[Moxfield Debug] Deck found:', deck.name || 'Unnamed');
          
          const deckName = deck.name || 'Imported Deck';
          const cards = [];
          
          // Extract from mainboard
          if (deck.boards && deck.boards.mainboard) {
            const mainboard = deck.boards.mainboard;
            const mainboardKeys = Object.keys(mainboard);
            console.log('[Moxfield Debug] Mainboard found with', mainboardKeys.length, 'entries');
            
            mainboardKeys.forEach(function(cardId) {
              const cardEntry = mainboard[cardId];
              if (cardEntry && cardEntry.card && cardEntry.card.name) {
                cards.push({
                  name: cardEntry.card.name,
                  quantity: cardEntry.quantity || 1,
                  isCommander: false
                });
              }
            });
          } else {
            console.log('[Moxfield Debug] No mainboard found');
          }
          
          // Also add commanders
          if (deck.boards && deck.boards.commanders) {
            const commanders = deck.boards.commanders;
            const commanderKeys = Object.keys(commanders);
            console.log('[Moxfield Debug] Commanders found with', commanderKeys.length, 'entries');
            
            commanderKeys.forEach(function(cardId) {
              const cardEntry = commanders[cardId];
              if (cardEntry && cardEntry.card && cardEntry.card.name) {
                cards.push({
                  name: cardEntry.card.name,
                  quantity: cardEntry.quantity || 1,
                  isCommander: true
                });
              }
            });
          } else {
            console.log('[Moxfield Debug] No commanders found');
          }
          
          // Also check for companions
          if (deck.boards && deck.boards.companions) {
            const companions = deck.boards.companions;
            const companionKeys = Object.keys(companions);
            console.log('[Moxfield Debug] Companions found with', companionKeys.length, 'entries');
            
            companionKeys.forEach(function(cardId) {
              const cardEntry = companions[cardId];
              if (cardEntry && cardEntry.card && cardEntry.card.name) {
                cards.push({
                  name: cardEntry.card.name,
                  quantity: cardEntry.quantity || 1,
                  isCommander: false
                });
              }
            });
          }
          
          console.log('[Moxfield Debug] Total cards extracted:', cards.length);
          
          if (cards.length > 0) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'deckData',
              data: {
                name: deckName,
                cards: cards
              }
            }));
          } else {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              message: 'No cards found in deck boards. Deck may be empty or structure has changed.'
            }));
          }
        } catch (error) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'error',
            message: 'Error extracting deck data: ' + error.message
          }));
        }
      }, 12000); // Wait 12 seconds for page to fully load (Moxfield can be slow)
      
      true;
    })();
  `;

  const handleMessage = (event: any) => {
    if (extractionAttempted.current) {
      return; // Already processed
    }
    
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      if (message.type === 'deckData') {
        extractionAttempted.current = true;
        
        if (message.data && message.data.cards && message.data.cards.length > 0) {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          setLoading(false);
          console.log(`[Moxfield] Successfully extracted ${message.data.cards.length} cards`);
          onSuccess(message.data);
        } else {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          setLoading(false);
          onError('No cards found in deck. The deck may be empty, or please try the decklist method instead.');
        }
      } else if (message.type === 'error') {
        extractionAttempted.current = true;
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        setLoading(false);
        console.error('[Moxfield] Extraction error:', message.message);
        onError(message.message || 'Failed to extract deck data');
      }
    } catch (error) {
      console.error('[Moxfield] Message handling error:', error);
    }
  };

  const handleLoadEnd = () => {
    setLoadingMessage('Page loaded, extracting deck data...');
    
    // Set a timeout in case extraction fails
    timeoutRef.current = setTimeout(() => {
      if (!extractionAttempted.current) {
        setLoading(false);
        onError('Timeout: Could not extract deck data within 30 seconds. The page may have changed structure. Please try the decklist method instead.');
      }
    }, 30000); // 30 second timeout
  };

  const handleError = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setLoading(false);
    onError('Failed to load Moxfield page. Please check the URL and your internet connection.');
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>{loadingMessage}</Text>
          <Text style={styles.loadingSubtext}>This may take up to 30 seconds</Text>
        </View>
      )}
      <WebView
        source={{ uri: moxfieldUrl }}
        onMessage={handleMessage}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        injectedJavaScript={injectedJavaScript}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        style={styles.webview}
        incognito={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
    opacity: 0, // Hide the WebView from user
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
});

export default MoxfieldWebViewImporter;
