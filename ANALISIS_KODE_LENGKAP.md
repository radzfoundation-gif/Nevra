# 📚 Analisis Kode Lengkap - NEVRA (Neural Automation)

## 🎯 Ringkasan Eksekutif

**NEVRA** adalah platform full-stack AI-powered yang menggabungkan:
- **Code Generation (Builder Mode)** - Generate aplikasi web React/Next.js dari natural language
- **AI Tutoring (Tutor Mode)** - Asisten pembelajaran dengan web search, document analysis, code execution

Platform ini menggunakan arsitektur modern dengan React 19, TypeScript, Express.js, Clerk untuk authentication, dan Supabase untuk database.

---

## 🏗️ Arsitektur & Tech Stack

### Frontend Stack
- **React 19.2.1** dengan TypeScript 5.8.2
- **Vite 6.2.0** sebagai build tool (modern, cepat)
- **React Router 7.10.1** untuk routing
- **Tailwind CSS** untuk styling (via CDN untuk generated apps)
- **Framer Motion 12.23.25** untuk animasi
- **Monaco Editor** untuk code editing
- **Clerk 5.58.1** untuk authentication
- **Supabase 2.87.0** untuk database & real-time

### Backend Stack
- **Express.js 5.2.1** (Node.js)
- **OpenAI SDK 6.10.0** - Unified client untuk semua providers via OpenRouter
- **Multer 2.0.2** untuk file uploads
- **Mammoth 1.11.0** untuk DOCX parsing
- **pdf-parse 2.4.5** untuk PDF parsing
- **Stripe 17.3.1** untuk payment processing

### Database
- **Supabase (PostgreSQL)** dengan Row Level Security (RLS)
- Tabel utama:
  - `users` - User profiles (synced from Clerk)
  - `chat_sessions` - Chat sessions dengan mode (builder/tutor)
  - `messages` - Chat messages dengan code & images
  - `user_preferences` - User settings & subscription
  - `user_api_keys` - Encrypted user API keys
  - `ai_usage` - Token usage tracking

---

## 📁 Struktur Direktori & Organisasi

```
NEVRA/
├── components/              # React components
│   ├── auth/               # Authentication (SignIn, SignUp, ProtectedRoute)
│   ├── pages/              # Page components (Home, ChatInterface, AgentsPage, etc.)
│   ├── ui/                 # Reusable UI components (ProviderSelector, logos, etc.)
│   └── settings/           # Settings components
├── lib/                    # Core libraries & utilities
│   ├── ai.ts              # AI code generation logic (847 lines)
│   ├── database.ts        # Database operations (CRUD untuk users, sessions, messages)
│   ├── supabase.ts        # Supabase client singleton
│   ├── tokenLimit.ts      # Token limit tracking
│   ├── crypto.ts          # API key encryption/decryption
│   ├── fileManager.ts     # File management untuk multi-file projects
│   ├── codebaseExplorer.ts # Codebase analysis
│   └── ...                # Other utilities (deployment, github, etc.)
├── hooks/                 # Custom React hooks
│   ├── useSupabase.ts     # User sync, chat sessions, preferences
│   └── useTokenLimit.ts   # Token limit tracking hook
├── server/                # Express backend server
│   └── index.js           # Main server file (2259 lines)
└── public/                # Static assets
```

---

## 🔑 Fitur Utama & Implementasi

### 1. Authentication & User Management

**Clerk Integration:**
- User authentication via Clerk dengan auto-sync ke Supabase
- Protected routes dengan `ProtectedRoute` component
- JWT token untuk authenticated Supabase requests (bypass RLS)

**Key Files:**
- `App.tsx` - ClerkProvider setup dengan error handling
- `lib/database.ts` - `syncUser()` function
- `hooks/useSupabase.ts` - `useUserSync()` hook
- `components/auth/ProtectedRoute.tsx`

**Flow:**
```
User Sign In → Clerk → UserSyncProvider → syncUser() → Supabase
```

### 2. AI Provider System

**Supported Providers (via OpenRouter):**
1. **Anthropic (Claude Sonnet 4.5)** - Premium, requires credits
2. **DeepSeek (Mistral Devstral 2512)** - Free alternative
3. **OpenAI (GPT-5.2)** - Premium, requires credits
4. **Gemini** - Backward compatibility (uses Claude Sonnet 4.5)

**Unified Architecture:**
- Semua provider menggunakan **OpenRouter API** via OpenAI SDK
- Single `openaiClient` instance dengan baseURL ke OpenRouter
- Model routing via `MODELS` object
- Error handling dengan retry mechanism untuk credit/token limit errors

**Key Features:**
- Auto-fallback jika credit limit habis
- Token limit tracking per provider
- Image support untuk semua providers (vision models)
- Timeout handling (90s untuk DeepSeek, 45s untuk lainnya)

**Key Files:**
- `server/index.js` - Provider routing logic (lines 92-120, 186-826)
- `components/ui/ProviderSelector.tsx` - Provider selector UI
- `lib/ai.ts` - Frontend AI client

### 3. Builder Mode (Code Generation)

**Capabilities:**
- Generate React/Next.js/Vite apps dari natural language
- Support untuk:
  - Single-file HTML (dengan CDN links)
  - Multi-file projects (React, Next.js, Vite)
  - Modern design system (bolt.new/v0.app style)
  - Tailwind CSS, Framer Motion, Lucide icons
  - Production-ready code dengan best practices

**System Prompts:**
- `BUILDER_PROMPT` - Standard React/HTML generation (330 lines)
- `NEXTJS_BUILDER_PROMPT` - Next.js 14+ App Router specific
- `REACT_VITE_BUILDER_PROMPT` - React/Vite specific

**Response Format:**
- Multi-file JSON untuk framework projects
- Single-file HTML untuk simple projects
- Error handling dengan formatted HTML error messages

**Key Files:**
- `lib/ai.ts` - `generateCode()` function (lines 592-846)
- `components/pages/ChatInterface.tsx` - Builder UI (4000+ lines)

**Mode Detection:**
- Auto-detect builder vs tutor mode dari user prompt
- Pattern matching untuk keywords (English & Indonesian)
- Priority system untuk exclusion patterns

### 4. Tutor Mode (AI Tutoring)

**Features:**
- **Web Search** - Real-time search dengan citations (Tavily API, fallback ke DuckDuckGo)
- **Document Analysis** - Upload & parse PDF/DOCX/TXT/MD
- **Code Execution** - Python sandbox dengan timeout (10s)
- **Voice Call** - Speech-to-text & text-to-speech
- **Markdown Rendering** - ReactMarkdown dengan syntax highlighting

**Key Files:**
- `lib/webSearch.ts` - Web search logic
- `lib/documentParser.ts` - Document parsing
- `lib/codeExecutor.ts` - Code execution
- `components/VoiceCall.tsx` - Voice interface
- `server/index.js` - `/api/search`, `/api/parse-document`, `/api/execute-code`

### 5. Database & Storage

**Supabase Tables:**
- `users` - User profiles (synced from Clerk)
- `chat_sessions` - Chat sessions dengan mode (builder/tutor), provider
- `messages` - Chat messages dengan code & images (base64)
- `user_preferences` - User settings, subscription status
- `user_api_keys` - Encrypted user API keys
- `ai_usage` - Token usage tracking per user/provider

**Operations:**
- Row Level Security (RLS) enabled
- Encrypted API keys storage (client-side encryption)
- Real-time subscriptions untuk chat sessions
- Auto-sync user data dari Clerk

**Key Files:**
- `lib/database.ts` - Database operations (CRUD functions)
- `lib/crypto.ts` - API key encryption/decryption
- `lib/supabase.ts` - Supabase client singleton
- `hooks/useSupabase.ts` - React hooks untuk data fetching

### 6. Code Editor & File Management

**Features:**
- Monaco Editor untuk code editing
- File tree navigation
- Multi-file project support
- Version history dengan undo/redo
- Code quality checks (ESLint, TypeScript)
- Code formatting (Prettier)

**Key Files:**
- `components/CodeEditor.tsx` - Monaco editor wrapper
- `components/FileTree.tsx` - File tree component
- `lib/fileManager.ts` - File management
- `lib/versionManager.ts` - Version control
- `lib/undoRedo.ts` - Undo/redo system
- `lib/typescript.ts` - TypeScript checking
- `lib/eslint.ts` - ESLint checking
- `lib/prettier.ts` - Code formatting

### 7. Deployment

**Supported Platforms:**
- **Vercel** - Via API (v13)
- **Netlify** - Via API
- **GitHub** - Direct push via OAuth

**Key Files:**
- `lib/deployment.ts` - Deployment logic
- `lib/github.ts` - GitHub integration
- `server/index.js` - `/api/deploy`, `/api/deploy/status`, `/api/github/*`

### 8. Payment & Subscription

**Stripe Integration:**
- Checkout sessions untuk premium subscription
- Webhook handling untuk subscription events
- Customer portal untuk subscription management
- Currency detection (USD/IDR)

**Key Files:**
- `server/index.js` - `/api/payment/*` endpoints (lines 2005-2253)
- `components/SubscriptionPopup.tsx` - Subscription UI
- `components/pages/PricingPage.tsx` - Pricing page

---

## 🔄 Flow Aplikasi

### 1. User Authentication Flow

```
User → Clerk Sign In → UserSyncProvider → syncUser() → Supabase
     ↓
Get JWT Token → Authenticated Supabase Client → Bypass RLS
```

### 2. Code Generation Flow (Builder Mode)

```
User Prompt → ChatInterface → detectMode('builder') → 
generateCode() → API /api/generate → 
OpenRouter API → AI Provider → Response → 
Parse JSON/HTML → Display in Preview + Code Editor
```

### 3. Tutor Mode Flow

```
User Question → ChatInterface → detectMode('tutor') → 
generateCode(mode='tutor') → AI Response → 
Display Markdown → Optional: Web Search / Document Analysis
```

### 4. Token Limit Flow

```
User Request → checkTokenLimit() → Database Query → 
If exceeded → Show upgrade prompt / Block request
If OK → Allow request → Track usage → Update database
```

---

## 🔐 Security

### 1. API Key Encryption
- User API keys di-encrypt sebelum disimpan di database
- Encryption key: User ID + secret
- Decryption hanya di client-side
- **File:** `lib/crypto.ts`

### 2. Row Level Security (RLS)
- Supabase RLS enabled untuk semua tables
- Users hanya bisa akses data mereka sendiri
- Authenticated requests via JWT token bypass RLS

### 3. CORS Configuration
- Configurable CORS origin via `CORS_ORIGIN` env var
- Default: allow all (development)
- Production: specific origins

### 4. Environment Variables
- Sensitive keys di `.env.local` (not committed)
- Backend keys di server environment
- Frontend keys dengan `VITE_` prefix

---

## 📊 Token & Usage Tracking

### Token Limits

**Free Tier:**
- General: 200 tokens/day (all providers combined)
- Per-provider tracking

**Premium:**
- Unlimited tokens

### Tracking Implementation

- Tracked in `ai_usage` table
- Reset daily (WIB timezone)
- Per-provider tracking
- Real-time updates via hooks

**Key Files:**
- `lib/tokenLimit.ts` - Token limit logic
- `hooks/useTokenLimit.ts` - React hook
- `components/TokenBadge.tsx` - UI component

---

## 🎨 Design System

### Color Palette
- Background: Dark (#050505, #0a0a0a)
- Primary: Purple/Blue gradients (#7e22ce, #3b82f6)
- Text: High contrast (#ffffff, #e5e5e5, #a3a3a3)
- Accents: Subtle glows, borders with opacity

### Typography
- Headings: Bold, large, dengan gradient text effects
- Body: Inter/System font, readable line-height
- Code: Monospace, proper syntax highlighting

### Effects
- Glassmorphism: backdrop-blur-xl, bg-white/5
- Gradients: from-purple-500 to-blue-500
- Shadows: shadow-2xl, shadow-purple-500/20
- Animations: Smooth transitions, hover effects

---

## 🐛 Issues & Improvements

### Current Issues

1. **Code Duplication:**
   - `/api/deploy` endpoint duplikat di `server/index.js` (lines 838-951 dan 1012-1125)
   - `/api/deploy/status` endpoint duplikat (lines 954-1009 dan 1128-1183)
   - **Fix:** Hapus duplikat, keep hanya satu versi

2. **Error Handling:**
   - Beberapa error handling bisa lebih robust
   - Missing error boundaries di beberapa components
   - **Fix:** Add comprehensive error boundaries

3. **Performance:**
   - Large components (ChatInterface.tsx 4000+ lines)
   - Bisa di-split menjadi smaller components
   - **Fix:** Refactor ke smaller, focused components

4. **Type Safety:**
   - Beberapa `any` types masih ada
   - Missing type definitions untuk beberapa interfaces
   - **Fix:** Add proper TypeScript types

### Recommended Improvements

1. **Code Organization:**
   - Split `ChatInterface.tsx` menjadi smaller components
   - Extract mode detection logic ke separate utility
   - Create shared types file

2. **Testing:**
   - Add unit tests untuk critical functions
   - Add integration tests untuk API endpoints
   - Add E2E tests untuk user flows

3. **Documentation:**
   - Add JSDoc comments untuk public APIs
   - Create architecture diagrams
   - Add inline comments untuk complex logic

4. **Performance:**
   - Implement code splitting untuk routes
   - Add lazy loading untuk heavy components
   - Optimize bundle size (currently ~1MB+)

---

## 📈 Code Quality Metrics

### Strengths
✅ Modern tech stack (React 19, TypeScript, Vite)
✅ Good separation of concerns (lib/, components/, hooks/)
✅ Comprehensive error handling
✅ Real-time features (Supabase subscriptions)
✅ Security best practices (RLS, encryption)
✅ Multi-provider AI support
✅ Production-ready features (deployment, payments)

### Areas for Improvement
⚠️ Large component files (ChatInterface.tsx 4000+ lines)
⚠️ Code duplication (deployment endpoints)
⚠️ Missing tests
⚠️ Some `any` types
⚠️ Could benefit from more code splitting

---

## 🚀 Deployment

### Current Setup
- Frontend: Vite build → Static hosting
- Backend: Express.js → Railway/Node.js hosting
- Database: Supabase (managed PostgreSQL)

### Environment Variables Required

**Frontend (.env.local):**
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
VITE_API_BASE_URL=/api
```

**Backend (.env):**
```
OPENROUTER_API_KEY=sk-or-...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
PORT=8788
CORS_ORIGIN=true
```

---

## 📝 Kesimpulan

NEVRA adalah platform yang sangat lengkap dengan:
- ✅ Arsitektur modern dan scalable
- ✅ Fitur-fitur production-ready
- ✅ Security best practices
- ✅ Multi-provider AI support
- ✅ Real-time capabilities
- ✅ Comprehensive error handling

**Rekomendasi:**
1. Refactor large components
2. Remove code duplication
3. Add comprehensive tests
4. Improve type safety
5. Add performance optimizations

Platform ini siap untuk production dengan beberapa improvements yang disarankan di atas.
