# TeilFair

A fair expense splitting application similar to Splitwise. Split bills between multiple people with custom ratios, track who paid what, and see who owes whom.

## Features

- **No Registration Required**: Access groups via capability links (tokens)
- **Multiple Payers**: Any expense can have multiple people paying
- **Flexible Splitting**: Split equally, by fixed amounts, percentages, or ratios
- **Smart Settlements**: Algorithm minimizes the number of transactions needed
- **Cross-Platform**: Web, iOS, and Android apps with shared business logic
- **Lightweight Backend**: Uses Supabase free tier with Row Level Security

## Architecture

```
teilfair/
├── packages/
│   ├── shared/          # Shared TypeScript types and calculation logic
│   ├── web/             # React web application (Vite)
│   └── mobile/          # React Native mobile app (Expo)
└── supabase/
    └── migrations/      # Database schema and RLS policies
```

### Security Model

TeilFair uses **capability-based security** instead of user accounts:

- Each group has two tokens: `readToken` and `writeToken`
- Share the read link for view-only access
- Share the write link for full edit access
- Tokens are validated via Supabase Row Level Security
- Groups cannot be guessed (cryptographically random IDs and tokens)

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- A Supabase project (free tier works)

### 1. Clone and Install

```bash
git clone https://github.com/your-username/teilfair.git
cd teilfair
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the migration:
   ```bash
   # Copy contents of supabase/migrations/001_initial_schema.sql
   # Paste into SQL Editor and run
   ```
3. Get your project URL and anon key from Settings > API

### 3. Configure Environment

**For Web:**
```bash
cd packages/web
cp .env.example .env
# Edit .env with your Supabase credentials
```

**For Mobile:**
```bash
# Create .env in packages/mobile
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Development Servers

**Web:**
```bash
npm run web
# Opens at http://localhost:5173
```

**Mobile:**
```bash
npm run mobile
# Scan QR code with Expo Go app
```

## Building for Production

### Web
```bash
npm run build:web
# Output in packages/web/dist
```

### Mobile (EAS Build)
```bash
cd packages/mobile
npx eas build --platform android
npx eas build --platform ios
```

## API / Data Model

### Groups
- `id`: UUID
- `name`: Group name
- `currency`: Currency code (EUR, USD, etc.)
- `readToken`: Token for read access
- `writeToken`: Token for write access

### Members
- `id`: UUID
- `groupId`: Parent group
- `name`: Member name

### Expenses
- `id`: UUID
- `groupId`: Parent group
- `description`: What the expense was for
- `totalAmount`: Total cost
- `date`: When it occurred
- `payers`: Who paid (can be multiple people)
- `splits`: How to divide (ratio, fixed, or percentage)

## Calculation Logic

The calculation engine (in `packages/shared/src/calculations.ts`) handles:

1. **Split Types**:
   - `ratio`: Divide proportionally (e.g., 1:1:1 = equal, 2:1 = 2/3 and 1/3)
   - `fixed`: Exact amounts
   - `percentage`: Percentage of total

2. **Settlement Optimization**:
   Uses a greedy algorithm to minimize the number of transactions needed to settle all debts.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## License

MIT
