# 📚 Analisis Kode NEVRA (Neural Automation)

## 🎯 Overview

**NEVRA** adalah platform full-stack AI-powered untuk:
- **Code Generation** (Builder Mode) - Generate aplikasi web React/Next.js dari natural language
- **AI Tutoring** (Tutor Mode) - Asisten pembelajaran dengan web search, document analysis, code execution

---

## 🏗️ Arsitektur Aplikasi

### Tech Stack

**Frontend:**
- **React 19** dengan TypeScript
- **Vite** sebagai build tool
- **Tailwind CSS** untuk styling
- **React Router** untuk routing
- **Clerk** untuk authentication
- **Supabase** untuk database & storage
- **Framer Motion** untuk animasi
- **Monaco Editor** untuk code editing

**Backend:**
- **Express.js** (Node.js)
- **Groq SDK** (Llama 3)
- **OpenAI SDK** (GPT-4o via OpenRouter)
- **Multer** untuk file uploads
- **Mammoth** untuk DOCX parsing
- **pdf-parse** untuk PDF parsing

**Database:**
- **Supabase (PostgreSQL)** dengan Row Level Security (RLS)
- Tabel utama: `users`, `chat_sessions`, `messages`, `user_preferences`, `user_api_keys`, `ai_usage`

---

## 📁 Struktur Direktori

```
NEVRA/
├── components/          # React components
│   ├── auth/           # Authentication components
│   ├── pages/          # Page components (Home, ChatInterface, etc.)
│   ├── ui/             # UI components (ProviderSelector, logos, etc.)
│   └── settings/       # Settings components
├── lib/                # Core libraries & utilities
│   ├── ai.ts           # AI code generation logic
│   ├── database.ts     # Database operations
│   ├── supabase.ts     # Supabase client
│   ├── tokenLimit.ts   # Token limit tracking
│   └── ...             # Other utilities
├── hooks/              # Custom React hooks
├── server/             # Express backend server
│   └── index.js        # Main server file
└── public/             # Static assets
```

---

## 🔑 Fitur Utama

### 1. **Authentication & User Management**

**Clerk Integration:**
- User authentication via Clerk
- Auto-sync Clerk user ke Supabase
- Protected routes dengan `ProtectedRoute` component

**File terkait:**
- `App.tsx` - ClerkProvider setup
- `lib/database.ts` - `syncUser()` function
- `hooks/useSupabase.ts` - `useUserSync()` hook
- `components/auth/ProtectedRoute.tsx`

### 2. **AI Provider System**

**Supported Providers:**
1. **Groq (Llama 3.3-70B)** - Default free provider
2. **Grok (Kimi K2)** - Default dengan token limit 200/day
3. **OpenAI (GPT-4o)** - Premium via OpenRouter

**Provider Selection:**
- User bisa pilih provider di UI
- Auto-fallback jika limit habis (Grok → Groq)
- Token tracking per provider

**File terkait:**
- `server/index.js` - Provider routing logic
- `components/ui/ProviderSelector.tsx` - Provider selector UI
- `lib/tokenLimit.ts` - Token limit tracking
- `lib/grokTokenLimit.ts` - Grok-specific token limit

### 3. **Builder Mode (Code Generation)**

**Capabilities:**
- Generate React/Next.js apps dari natural language
- Single-file HTML atau multi-file project
- Support untuk:
  - React components dengan Tailwind CSS
  - Next.js 14+ App Router
  - Framer Motion animations
  - Lucide icons
  - Modern design system (bolt.new/v0.app style)

**System Prompts:**
- `BUILDER_PROMPT` - Standard React/HTML generation
- `NEXTJS_BUILDER_PROMPT` - Next.js specific generation

**File terkait:**
- `lib/ai.ts` - `generateCode()` function
- `lib/ai-enhanced.ts` - Enhanced prompts
- `components/pages/ChatInterface.tsx` - Builder UI

### 4. **Tutor Mode (AI Tutoring)**

**Features:**
- **Web Search** - Real-time search dengan citations (Tavily API)
- **Document Analysis** - Upload & parse PDF/DOCX/TXT/MD
- **Code Execution** - Python/JavaScript sandbox
- **Voice Call** - Speech-to-text & text-to-speech

**File terkait:**
- `lib/webSearch.ts` - Web search logic
- `lib/documentParser.ts` - Document parsing
- `lib/codeExecutor.ts` - Code execution
- `components/VoiceCall.tsx` - Voice interface

### 5. **Database & Storage**

**Supabase Tables:**
- `users` - User profiles (synced from Clerk)
- `chat_sessions` - Chat sessions
- `messages` - Chat messages dengan code & images
- `user_preferences` - User settings
- `user_api_keys` - Encrypted user API keys
- `ai_usage` - Token usage tracking

**Operations:**
- Row Level Security (RLS) enabled
- Encrypted API keys storage
- Auto-sync user data

**File terkait:**
- `lib/database.ts` - Database operations
- `lib/crypto.ts` - API key encryption/decryption
- `lib/supabase.ts` - Supabase client

### 6. **Code Editor & File Management**

**Features:**
- Monaco Editor untuk code editing
- File tree navigation
- Multi-file project support
- Version history dengan undo/redo
- Code quality checks (ESLint, TypeScript)

**File terkait:**
- `components/CodeEditor.tsx` - Monaco editor wrapper
- `components/FileTree.tsx` - File tree component
- `lib/fileManager.ts` - File management
- `lib/versionManager.ts` - Version control
- `lib/undoRedo.ts` - Undo/redo system

### 7. **Deployment**

**Supported Platforms:**
- **Vercel** - Via API
- **Netlify** - Via API
- **GitHub** - Direct push

**File terkait:**
- `lib/deployment.ts` - Deployment logic
- `components/DeployButton.tsx` - Deployment UI
- `lib/github.ts` - GitHub integration
- `server/index.js` - `/api/deploy` endpoint

### 8. **Visual Editor**

**Features:**
- Drag & drop components
- Live preview
- Style editor
- Component library

**File terkait:**
- `components/VisualEditor.tsx`
- `components/ComponentLibrary.tsx`
- `lib/componentParser.ts`

### 9. **Agentic Planning**

**Features:**
- AI-generated task plans
- Task breakdown dengan dependencies
- Progress tracking
- Visual timeline

**File terkait:**
- `lib/agenticPlanner.ts` - Planning logic
- `components/PlannerPanel.tsx` - Planning UI
- `server/index.js` - `/api/plan` endpoint

---

## 🔄 Flow Aplikasi

### 1. **User Authentication Flow**

```
User → Clerk Sign In → UserSyncProvider → syncUser() → Supabase
```

### 2. **Code Generation Flow (Builder Mode)**

```
User Prompt → ChatInterface → generateCode() → API /api/generate → 
AI Provider (Groq/OpenAI/Grok) → Response → Extract Code → 
Display in Preview + Code Editor
```

### 3. **Tutor Mode Flow**

```
User Question → ChatInterface → generateCode(mode='tutor') → 
AI Response → Display Markdown/Code → 
Optional: Web Search / Document Analysis / Code Execution
```

### 4. **Token Limit Flow**

```
User Request → checkTokenLimit() → Database Query → 
If exceeded → Show upgrade prompt / Block request
If OK → Allow request → Track usage → Update database
```

---

## 🔐 Security

### 1. **API Key Encryption**
- User API keys di-encrypt sebelum disimpan
- Encryption key: User ID + secret
- Decryption hanya di client-side

**File:** `lib/crypto.ts`

### 2. **Row Level Security (RLS)**
- Supabase RLS enabled untuk semua tables
- Users hanya bisa akses data mereka sendiri

### 3. **CORS Configuration**
- Configurable CORS origin
- Default: allow all (development)
- Production: specific origins

---

## 📊 Token & Usage Tracking

### Token Limits

**Free Tier:**
- General: 200 tokens/day (all providers combined)
- Grok (Kimi K2): 200 tokens/day (separate limit)

**Premium:**
- Unlimited tokens

### Tracking

- Tracked in `ai_usage` table
- Reset daily (WIB timezone)
- Per-provider tracking

**File terkait:**
- `lib/tokenLimit.ts` - General token limit
- `lib/grokTokenLimit.ts` - Grok token limit
- `hooks/useTokenLimit.ts` - React hook
- `hooks/useGrokTokenLimit.ts` - Grok hook

---

## 🎨 Design System

### Color Palette
- Background: Dark (#050505, #0a0a0a)
- Primary: Purple/Blue gradients (#7e22ce, #3b82f6)
- Text: High contrast (#ffffff, #e5e5e5, #a3a3a3)

### Typography
- Font: Inter (Google Fonts)
- Headings: Bold dengan gradient effects
- Code: Monospace dengan syntax highlighting

### Components Style
- Glassmorphism: `backdrop-blur-xl`, `bg-white/5`
- Gradients: `from-purple-500 to-blue-500`
- Shadows: `shadow-2xl`, `shadow-purple-500/20`
- Smooth transitions & animations

---

## 🚀 Deployment

### Frontend
- **Development:** `npm run dev` (Vite dev server, port 3000)
- **Production:** `npm run build` → Static files
- **Hosting:** Vercel, Netlify, Railway, atau static hosting

### Backend
- **Development:** `npm run api` (Express server, port 8788)
- **Production:** Railway, Render, atau Node.js hosting
- **Environment Variables:** Required untuk API keys

---

## 📝 Environment Variables

### Frontend (.env.local)
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
VITE_API_BASE_URL=http://localhost:8788
```

### Backend (.env)
```env
GROQ_API_KEY=...
OPENROUTER_API_KEY=...
DEEPSEEK_API_KEY=...
TAVILY_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
CORS_ORIGIN=true
```

---

## 🔧 Key Functions & APIs

### Frontend (`lib/ai.ts`)
- `generateCode()` - Main code generation function

### Frontend (`lib/database.ts`)
- `syncUser()` - Sync Clerk user to Supabase
- `createChatSession()` - Create new chat
- `saveMessage()` - Save chat message
- `getUserApiKeys()` - Get user API keys (decrypted)
- `saveUserApiKey()` - Save encrypted API key

### Backend (`server/index.js`)
- `POST /api/generate` - Generate code/text
- `POST /api/deploy` - Deploy to Vercel/Netlify
- `POST /api/search` - Web search
- `POST /api/parse-document` - Parse uploaded document
- `POST /api/execute-code` - Execute Python code
- `POST /api/plan` - Generate task plan

---

## 🐛 Known Issues & Technical Debt

1. **PDF Parsing** - Butuh improvement untuk complex PDFs
2. **Python Execution** - Perlu secure runtime (sandbox)
3. **Web Search Fallback** - Perlu improve quality
4. **Code Quality** - Perlu lebih banyak TypeScript types
5. **Error Handling** - Perlu better error messages di beberapa tempat

---

## 📚 Dokumentasi Tambahan

- `CLERK_SETUP.md` - Clerk authentication setup
- `SUPABASE_SETUP.md` - Supabase database setup
- `GROK_DEFAULT_SETUP.md` - Grok provider configuration
- `UNIFIED_API_KEYS.md` - API keys management
- `ROADMAP.md` - Development roadmap
- `NEW_FEATURES.md` - New features documentation

---

## 💡 Kesimpulan

NEVRA adalah platform yang sangat lengkap dengan:
- ✅ Modern tech stack (React 19, TypeScript, Tailwind)
- ✅ Multiple AI providers (Groq, OpenAI, Grok)
- ✅ Complete authentication (Clerk + Supabase)
- ✅ Rich features (Builder, Tutor, Deployment, etc.)
- ✅ Secure API key management
- ✅ Token limit tracking
- ✅ Multi-file project support
- ✅ Code quality tools

**Saran Improvement:**
1. Add comprehensive test coverage
2. Improve error handling & user feedback
3. Add more TypeScript types
4. Optimize bundle size (code splitting)
5. Add analytics & monitoring

---

*Dokumen ini dibuat berdasarkan analisis kode pada: $(date)*
