# RefinedMTG - Local-First Version

**Version**: 2.0 (Local-First Architecture)  
**Date**: January 30, 2026

## Overview

This is the **local-first version** of RefinedMTG - a Magic: The Gathering deck management app that stores all data locally on the user's device using SQLite. No server required, no hosting costs, no user accounts.

---

## Key Features

### ✅ Fully Local Storage
- All decks, cards, and changelogs stored in SQLite database on device
- Works completely offline after initial card data fetch
- No backend server required
- Zero hosting costs

### ✅ Deck Management
- Create empty decks
- Import from pasted decklists
- Organize decks into folders
- Search and filter decks

### ✅ Card Management
- Automatic card data fetching from Scryfall API
- Local caching of card data
- Card categorization by type
- Commander designation support

### ✅ Changelog System
- Track all deck changes over time
- Add/remove cards with optional reasoning
- View complete change history
- Import error tracking with visual indicators

### ✅ Copy Features
- Copy entire decklists to clipboard
- Copy individual changelog entries
- Toast notifications for feedback

---

## Architecture

### Technology Stack

**Frontend**:
- React Native with Expo SDK 54
- TypeScript
- React Query (TanStack Query) for state management
- React Native Paper for UI components
- React Navigation for routing

**Local Storage**:
- Expo SQLite for structured data
- Full relational database on device
- ~5-10MB for typical user data

**External APIs** (called directly from app):
- **Scryfall API**: Card data lookup
- **Moxfield** (future): Deck import via WebView

---

## Database Schema

### Tables
- `decks` - Deck metadata
- `cards` - Card data from Scryfall
- `deck_cards` - Junction table linking decks to cards
- `changelogs` - Change history entries
- `changelog_cards` - Cards in each changelog entry
- `folders` - Deck organization

All tables use TEXT primary keys (UUIDs) and INTEGER timestamps.

---

## Development

### Prerequisites
- Node.js 22.13.0
- npm or pnpm
- Expo CLI

### Installation

```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run on web
npx expo start --web

# Run on iOS (requires Mac)
npx expo start --ios

# Run on Android
npx expo start --android
```

### Project Structure

```
RefinedMTG-v2/
├── App.tsx                 # Main app entry point
├── src/
│   ├── database/          # SQLite database layer
│   │   ├── database.ts    # Database initialization
│   │   ├── deckService.ts # Deck operations
│   │   ├── cardService.ts # Card operations
│   │   ├── folderService.ts # Folder operations
│   │   └── changelogService.ts # Changelog operations
│   ├── services/          # Business logic
│   │   ├── scryfallService.ts # Scryfall API integration
│   │   ├── decklistParser.ts # Decklist parsing
│   │   ├── moxfieldService.ts # Moxfield integration
│   │   └── deckImportService.ts # Deck import logic
│   ├── hooks/             # React Query hooks
│   │   ├── useDecks.ts
│   │   ├── useFolders.ts
│   │   └── useChangelogs.ts
│   ├── screens/           # UI screens
│   │   ├── DeckListScreen.tsx
│   │   ├── DeckDetailScreen.tsx
│   │   ├── ImportDeckModal.tsx
│   │   └── ChangeEntryScreen.tsx
│   ├── components/        # Reusable UI components
│   ├── types/             # TypeScript types
│   └── navigation/        # Navigation configuration
└── package.json
```

---

## Deployment

### Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### App Store Submission

1. Build production version using EAS
2. Download IPA file
3. Upload to App Store Connect
4. Submit for review

**Cost**: $99/year for Apple Developer account (no hosting costs!)

---

## Key Differences from Server-Based Version

| Feature | Server-Based | Local-First |
|---------|-------------|-------------|
| Data Storage | PostgreSQL on server | SQLite on device |
| Hosting Cost | $5-50/month | $0 |
| Internet Required | Yes | Only for card lookups |
| User Accounts | Yes | No |
| Backend Server | Required | None |
| Moxfield Import | Puppeteer scraping | WebView (planned) |
| Privacy | Data on server | Data on device |

---

## Known Limitations

1. **Moxfield Import**: WebView implementation not yet complete. Use decklist paste instead.
2. **Private Decks**: Cannot import private Moxfield decks (API limitation).
3. **Data Backup**: No automatic backup yet (iCloud sync planned for future).
4. **Web Testing**: Some native features (alerts, toasts) don't work in web browser. Test on real device via Expo Go.

---

## Future Enhancements

- [ ] Complete Moxfield WebView import
- [ ] iCloud backup and sync
- [ ] Export decks to various formats
- [ ] Card price tracking
- [ ] Deck statistics and analysis
- [ ] Proxy printing support

---

## Testing

### On iPhone (Recommended)

1. Install Expo Go app from App Store
2. Scan QR code from `npx expo start`
3. App will load on your phone
4. All features work natively

### On Web Browser (Limited)

1. Run `npx expo start --web`
2. Open browser to localhost:8081
3. Note: Some features (alerts, toasts) won't work

---

## Troubleshooting

### Database Not Initialized
- Make sure `initDatabase()` is called in App.tsx
- Check console for errors

### Cards Not Loading
- Check internet connection
- Verify Scryfall API is accessible
- Check console for API errors

### Build Errors
- Run `npm install` to ensure all dependencies are installed
- Clear cache with `npx expo start --clear`
- Check that all TypeScript types are correct

---

## Support

For issues or questions, please check:
- Expo documentation: https://docs.expo.dev
- React Native documentation: https://reactnative.dev
- Scryfall API docs: https://scryfall.com/docs/api

---

## License

Private project - All rights reserved

---

**Ready to deploy to the App Store!** 🚀
