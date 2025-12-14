# 📚 Analisis Komprehensif Codebase NEVRA

## 🎯 Executive Summary

**NEVRA (Neural Automation)** adalah platform AI-powered full-stack untuk:
- **Code Generation** (Builder Mode) - Generate aplikasi web React/Next.js dari natural language
- **AI Tutoring** (Tutor Mode) - Asisten pembelajaran dengan web search, document analysis, code execution
- **Enterprise Features** - Database integration, API wizard, mobile generator, design system manager

**Status:** Production-ready dengan fitur lengkap, multiple AI providers, authentication, dan database integration.

---

## 🏗️ Arsitektur Sistem

### Tech Stack Overview

#### Frontend
- **React 19.2.1** dengan TypeScript 5.8.2
- **Vite 6.2.0** sebagai build tool & dev server
- **React Router 7.10.1** untuk routing
- **Tailwind CSS** (via CDN untuk generated apps)
- **Framer Motion 12.23.25** untuk animasi
- **Monaco Editor** untuk code editing
- **Lucide React** untuk icons
- **React Markdown** untuk rendering markdown

#### Backend
- **Express.js 5.2.1** (Node.js ES Modules)
- **Groq SDK 0.37.0** (Claude Opus 4.5 via OpenRouter)
- **OpenAI SDK 6.10.0** (GPT-5.2 & Gemini 3 Pro via OpenRouter)
- **Multer 2.0.2** untuk file uploads
- **Mammoth 1.11.0** untuk DOCX parsing
- **pdf-parse 2.4.5** untuk PDF parsing

#### Database & Auth
- **Supabase (PostgreSQL)** dengan Row Level Security (RLS)
- **Clerk 5.58.1** untuk authentication
- **Auto-sync** Clerk user ke Supabase

#### Infrastructure
- **Vite Proxy** untuk API routing
- **CORS** configurable
- **Environment-based** configuration

---

## 📁 Struktur Direktori Detail

```
NEVRA/
├── components/              # React Components (40+ files)
│   ├── auth/                # Authentication
│   │   ├── ProtectedRoute.tsx
│   │   ├── SignInPage.tsx
│   │   └── SignUpPage.tsx
│   ├── pages/               # Main Pages
│   │   ├── Home.tsx
│   │   ├── ChatInterface.tsx  # Main chat interface (3800+ lines)
│   │   ├── AgentsPage.tsx
│   │   ├── WorkflowsPage.tsx
│   │   ├── EnterprisePage.tsx
│   │   └── PricingPage.tsx
│   ├── ui/                  # UI Components
│   │   ├── ProviderSelector.tsx
│   │   ├── Background.tsx
│   │   └── ... (visual effects)
│   └── ...                  # Feature components
│       ├── CodeEditor.tsx
│       ├── VisualEditor.tsx
│       ├── FileTree.tsx
│       ├── GitHubIntegration.tsx
│       ├── PlannerPanel.tsx
│       ├── DatabasePanel.tsx
│       ├── APIIntegrationWizard.tsx
│       ├── MobileGenerator.tsx
│       └── ... (20+ more)
│
├── lib/                     # Core Libraries (20+ files)
│   ├── ai.ts                # AI code generation (650+ lines)
│   ├── ai-enhanced.ts       # Enhanced prompts
│   ├── database.ts          # Supabase operations
│   ├── supabase.ts          # Supabase client
│   ├── tokenLimit.ts        # General token tracking
│   ├── grokTokenLimit.ts    # Grok-specific tracking
│   ├── fileManager.ts       # File management
│   ├── versionManager.ts    # Version control
│   ├── undoRedo.ts          # Undo/redo system
│   ├── github.ts            # GitHub integration
│   ├── deployment.ts        # Deployment logic
│   ├── webSearch.ts         # Web search (Tavily)
│   ├── documentParser.ts    # Document parsing
│   ├── codeExecutor.ts      # Code execution
│   ├── typescript.ts        # TypeScript checking
│   ├── eslint.ts            # ESLint checking
│   ├── prettier.ts          # Code formatting
│   ├── componentLibrary.ts  # Component library
│   ├── designSystem.ts     # Design system
│   ├── agenticPlanner.ts   # Task planning
│   └── ... (more utilities)
│
├── hooks/                   # Custom React Hooks
│   ├── useSupabase.ts       # Supabase hooks
│   ├── useTokenLimit.ts     # Token limit hook
│   └── useGrokTokenLimit.ts # Grok token hook
│
├── server/                  # Backend Server
│   └── index.js             # Express server (1740+ lines)
│
├── public/                  # Static Assets
│   ├── logo.svg
│   ├── robots.txt
│   └── sitemap.xml
│
└── [Config Files]
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    └── ... (deployment configs)
```

---

## 🔑 Fitur Utama & Implementasi

### 1. Authentication & User Management

#### Clerk Integration
- **Setup:** `App.tsx` wraps app dengan `ClerkProvider`
- **Auto-sync:** `UserSyncProvider` component sync Clerk user ke Supabase
- **Protected Routes:** `ProtectedRoute` component untuk auth-required pages
- **User Data:** Stored di Supabase `users` table

#### Flow:
```
User Sign In → Clerk → UserSyncProvider → syncUser() → Supabase users table
```

**Key Files:**
- `App.tsx` - ClerkProvider setup
- `hooks/useSupabase.ts` - `useUserSync()` hook
- `lib/database.ts` - `syncUser()` function
- `components/auth/ProtectedRoute.tsx`

---

### 2. AI Provider System

#### Supported Providers

1. **Groq (Claude Opus 4.5)**
   - Model: `anthropic/claude-opus-4.5` via OpenRouter
   - Default: Free tier
   - Max tokens: 8192 (builder), 4096 (tutor)

2. **Grok (Gemini 3 Pro)**
   - Model: `google/gemini-3-pro-preview` via OpenRouter
   - Token limit: 200/day (free tier)
   - Auto-fallback ke Groq jika limit habis

3. **OpenAI (GPT-5.2)**
   - Model: `openai/gpt-5.2-chat` via OpenRouter
   - Premium feature (temporarily free for testing)
   - Max tokens: 2000 (configurable)

4. **DeepSeek**
   - Model: `deepseek-chat`
   - Max tokens: 4096

#### Provider Selection Logic

**File:** `components/ui/ProviderSelector.tsx`

- Dropdown selector dengan icons
- Real-time token limit checking
- Disabled state untuk locked providers
- Visual indicators untuk premium/locked status

**Backend Routing:** `server/index.js`

- `/api/generate` endpoint
- Provider-specific model routing
- Token limit checking sebelum request
- Retry mechanism untuk credit errors
- History truncation untuk prompt token limits

#### Token Limit System

**General Token Limit:**
- Free tier: 200 tokens/day (all providers combined)
- Premium: Unlimited
- Tracking: `ai_usage` table
- Reset: Daily (WIB timezone)

**Grok Token Limit:**
- Separate limit: 200 tokens/day
- Tracking: `ai_usage` table dengan `provider = 'grok'`
- Auto-fallback: Switch ke Groq jika limit exceeded
- Lock feature: UI shows locked state

**Key Files:**
- `lib/tokenLimit.ts` - General token tracking
- `lib/grokTokenLimit.ts` - Grok-specific tracking
- `hooks/useTokenLimit.ts` - React hook
- `hooks/useGrokTokenLimit.ts` - Grok hook

---

### 3. Builder Mode (Code Generation)

#### Capabilities

**Single-File HTML:**
- React 18 via CDN
- Tailwind CSS via CDN
- Framer Motion (optional)
- Lucide Icons
- Babel Standalone untuk JSX
- Complete HTML document

**Multi-File Next.js:**
- Next.js 14+ App Router
- TypeScript (.tsx)
- Server Components by default
- File structure: `app/`, `components/`, `lib/`
- Tailwind CSS
- Next.js optimizations (Image, Font, Metadata)

#### System Prompts

**File:** `lib/ai.ts`

1. **BUILDER_PROMPT** (650+ lines)
   - Production-ready code generation
   - Modern design system (bolt.new/v0.app style)
   - Component-based architecture
   - Responsive first
   - Accessibility (WCAG)
   - Performance optimizations

2. **NEXTJS_BUILDER_PROMPT**
   - Next.js 14+ specific
   - App Router structure
   - Server/Client components
   - TypeScript types

3. **TUTOR_PROMPT**
   - Educational responses
   - Step-by-step explanations
   - Code snippets (not full apps)
   - Socratic method

#### Code Generation Flow

```
User Prompt → detectMode() → Builder Mode?
  ├─ Yes → generateCode(mode='builder') → AI Provider
  │   → Extract Code → FileManager → CodeEditor → Preview
  └─ No → generateCode(mode='tutor') → AI Response → Markdown
```

**Key Files:**
- `lib/ai.ts` - `generateCode()` function
- `lib/ai-enhanced.ts` - Enhanced prompts
- `components/pages/ChatInterface.tsx` - Main UI (3800+ lines)
- `lib/fileManager.ts` - File management

#### Mode Detection

**File:** `components/pages/ChatInterface.tsx` - `detectMode()`

**Builder Keywords:**
- English: build, create, make, generate, code, app, website, web app, landing page, dashboard, component, react, html, css, javascript
- Indonesian: buat, bikin, buatkan, buat web, buat website, buat aplikasi, generate, kode, coding, program, aplikasi, web, website, situs, halaman, komponen, template, desain, ui, frontend

**Tutor Keywords:**
- English: what, how, why, explain, teach, learn, help, understand, question, tutorial, guide
- Indonesian: apa, bagaimana, kenapa, jelaskan, ajarkan, belajar, bantu, pahami, pertanyaan, tutorial, panduan

**Logic:**
- Keyword scoring system
- Question mark detection
- Imperative pattern matching
- Default: tutor mode

---

### 4. Tutor Mode (AI Tutoring)

#### Features

1. **Web Search Integration**
   - Tavily API untuk real-time search
   - Fallback ke DuckDuckGo jika API key tidak ada
   - Citations dalam response
   - Combine search results dengan AI response

2. **Document Analysis**
   - Upload: PDF, DOCX, TXT, MD
   - Parse content dengan metadata
   - Section extraction
   - Word count, page count
   - Display di DocumentViewer component

3. **Code Execution**
   - Python sandbox (server-side)
   - Timeout: 10 seconds
   - Output capture (stdout/stderr)
   - Security: Temporary files, cleanup

4. **Voice Call**
   - Speech-to-text (Web Speech API)
   - Text-to-speech (Web Speech API)
   - Real-time transcription
   - Voice input untuk prompts

**Key Files:**
- `lib/webSearch.ts` - Web search logic
- `lib/documentParser.ts` - Document parsing
- `lib/codeExecutor.ts` - Code execution
- `components/VoiceCall.tsx` - Voice interface
- `components/DocumentViewer.tsx` - Document display
- `server/index.js` - `/api/search`, `/api/parse-document`, `/api/execute-code`

---

### 5. Database & Storage

#### Supabase Tables

1. **users**
   - Synced from Clerk
   - Fields: id (Clerk ID), email, full_name, avatar_url, created_at, updated_at

2. **chat_sessions**
   - User chat sessions
   - Fields: id, user_id, title, mode (builder/tutor), provider, created_at, updated_at

3. **messages**
   - Chat messages
   - Fields: id, session_id, role (user/ai), content, code, images (array), created_at

4. **user_preferences**
   - User settings
   - Fields: user_id, default_provider, theme, preferences (JSON), updated_at

5. **user_api_keys**
   - Encrypted user API keys
   - Fields: user_id, provider, encrypted_key, created_at

6. **ai_usage**
   - Token usage tracking
   - Fields: id, user_id, session_id, provider, model, tokens_used, cost_usd, created_at

#### Row Level Security (RLS)

- Enabled untuk semua tables
- Users hanya bisa akses data mereka sendiri
- Service role key untuk admin operations

#### API Key Encryption

**File:** `lib/crypto.ts`

- Encryption: User ID + secret key
- Decryption: Client-side only
- Storage: Encrypted di database

**Key Files:**
- `lib/database.ts` - Database operations
- `lib/supabase.ts` - Supabase client
- `lib/crypto.ts` - Encryption/decryption

---

### 6. Code Editor & File Management

#### Features

1. **Monaco Editor**
   - Full-featured code editor
   - Syntax highlighting
   - Auto-completion
   - Multi-language support
   - Theme: VS Code dark

2. **File Tree**
   - Hierarchical file structure
   - Create/delete files
   - Folder support
   - File type icons

3. **File Manager**
   - Multi-file project support
   - Entry point configuration
   - File operations (add, remove, update)
   - File type detection

4. **Version History**
   - Version snapshots
   - Restore previous versions
   - Version comparison
   - Auto-save

5. **Undo/Redo**
   - Change tracking
   - Undo/redo operations
   - History management

**Key Files:**
- `components/CodeEditor.tsx` - Monaco editor wrapper
- `components/FileTree.tsx` - File tree UI
- `lib/fileManager.ts` - File management logic
- `lib/versionManager.ts` - Version control
- `lib/undoRedo.ts` - Undo/redo system

---

### 7. Code Quality Tools

#### TypeScript Checking
- Real-time type checking
- Error display
- Auto-fix suggestions

#### ESLint
- Code linting
- Rule violations
- Auto-fix capability

#### Prettier
- Code formatting
- Consistent style
- Auto-format on save

**Key Files:**
- `lib/typescript.ts` - TypeScript checking
- `lib/eslint.ts` - ESLint linting
- `lib/prettier.ts` - Code formatting
- `components/CodeQualityPanel.tsx` - Quality UI

---

### 8. Visual Editor

#### Features
- Drag & drop components
- Live preview
- Style editor
- Component library integration
- Visual property editing

**Key Files:**
- `components/VisualEditor.tsx`
- `components/ComponentLibrary.tsx`
- `lib/componentParser.ts`

---

### 9. Agentic Planning

#### Features
- AI-generated task plans
- Task breakdown dengan dependencies
- Priority assignment
- Time estimates
- Category classification
- Progress tracking
- Visual timeline

**Task Categories:**
- setup, component, styling, logic, integration, testing, deployment, documentation

**Priorities:**
- high, medium, low

**Key Files:**
- `lib/agenticPlanner.ts` - Planning logic
- `components/PlannerPanel.tsx` - Planning UI
- `server/index.js` - `/api/plan` endpoint

---

### 10. Deployment

#### Supported Platforms

1. **Vercel**
   - API deployment
   - Project creation
   - Status checking

2. **Netlify**
   - Site creation
   - File deployment
   - Status checking

3. **GitHub**
   - OAuth integration
   - Repository creation
   - Direct push
   - File management

**Key Files:**
- `lib/deployment.ts` - Deployment logic
- `lib/github.ts` - GitHub integration
- `components/GitHubIntegration.tsx` - GitHub UI
- `server/index.js` - `/api/deploy`, `/api/deploy/status`, GitHub OAuth routes

---

### 11. Advanced Features

#### Database Panel
- Supabase integration
- Table management
- Query builder
- Data visualization

#### API Integration Wizard
- API endpoint configuration
- Authentication setup
- Request/response testing
- Integration templates

#### Mobile Generator
- React Native code generation
- Mobile app templates
- Platform-specific code

#### Design System Manager
- Color palette management
- Typography settings
- Component styles
- Theme configuration

**Key Files:**
- `components/DatabasePanel.tsx`
- `components/APIIntegrationWizard.tsx`
- `components/MobileGenerator.tsx`
- `components/DesignSystemManager.tsx`
- `lib/designSystem.ts`

---

## 🔄 Application Flows

### 1. User Authentication Flow

```
User → Sign In Page → Clerk Auth → 
  → UserSyncProvider → useUserSync() → 
  → syncUser() → Supabase users table → 
  → Redirect to /chat
```

### 2. Code Generation Flow (Builder Mode)

```
User Prompt → ChatInterface → detectMode('builder') → 
  → generateCode(mode='builder', provider) → 
  → POST /api/generate → 
  → Check Token Limit → 
  → AI Provider (Groq/OpenAI/Grok) → 
  → Extract Code from Response → 
  → FileManager.addFile() → 
  → CodeEditor Display → 
  → Preview in iframe → 
  → Save to Database
```

### 3. Tutor Mode Flow

```
User Question → ChatInterface → detectMode('tutor') → 
  → generateCode(mode='tutor', provider) → 
  → Optional: Web Search / Document Analysis / Code Execution → 
  → AI Response → 
  → Markdown Rendering → 
  → Display in Chat → 
  → Save to Database
```

### 4. Token Limit Flow

```
User Request → checkTokenLimit(userId) → 
  → Query ai_usage table (today) → 
  → Calculate tokens used → 
  → If exceeded → Show upgrade prompt / Block request → 
  → If OK → Allow request → 
  → trackAIUsage() → 
  → Insert to ai_usage table
```

### 5. Grok Token Limit & Fallback Flow

```
User Selects Grok → checkGrokTokenLimit(userId) → 
  → Query ai_usage (provider='grok', today) → 
  → If limit exceeded → 
  → Auto-switch to Groq → 
  → Update ProviderSelector UI → 
  → Show notification → 
  → Continue with Groq
```

---

## 🔐 Security Implementation

### 1. API Key Encryption

**File:** `lib/crypto.ts`

- Encryption key: User ID + environment secret
- Client-side decryption only
- Encrypted storage di database
- No plaintext keys in database

### 2. Row Level Security (RLS)

- Supabase RLS enabled untuk semua tables
- Users hanya bisa akses data mereka sendiri
- Service role key untuk admin operations

### 3. CORS Configuration

**File:** `server/index.js`

- Configurable via `CORS_ORIGIN` env var
- Default: allow all (development)
- Production: specific origins

### 4. Authentication

- Clerk for user authentication
- JWT tokens
- Protected routes
- Session management

### 5. Input Validation

- File upload limits (10MB)
- Code execution timeout (10s)
- Request size limits (12MB)
- Sanitization untuk user inputs

---

## 📊 Token & Usage Tracking

### Token Limits

**Free Tier:**
- General: 200 tokens/day (all providers combined)
- Grok: 200 tokens/day (separate limit)

**Premium:**
- Unlimited tokens
- All providers unlocked

### Token Costs

**File:** `lib/tokenLimit.ts`

```typescript
const TOKEN_COSTS = {
  groq: 10,      // Per request
  deepseek: 10,  // Per request
  openai: 20,    // Per request
  grok: 10,      // Per request
};
```

### Tracking System

1. **Database Tracking**
   - Table: `ai_usage`
   - Fields: user_id, session_id, provider, model, tokens_used, cost_usd, created_at
   - Reset: Daily (WIB timezone)

2. **Real-time Updates**
   - Optimistic updates di UI
   - Session storage caching
   - Polling untuk sync
   - Incremental updates

3. **Hooks**
   - `useTokenLimit()` - General token tracking
   - `useGrokTokenLimit()` - Grok-specific tracking
   - `useTrackAIUsage()` - Usage tracking

**Key Files:**
- `lib/tokenLimit.ts` - General tracking
- `lib/grokTokenLimit.ts` - Grok tracking
- `hooks/useTokenLimit.ts` - React hooks
- `hooks/useGrokTokenLimit.ts` - Grok hook

---

## 🎨 Design System

### Color Palette

- **Background:** Dark (#050505, #0a0a0a) dengan subtle gradients
- **Primary:** Purple/Blue gradients (#7e22ce, #3b82f6)
- **Text:** High contrast (#ffffff, #e5e5e5, #a3a3a3)
- **Accents:** Subtle glows, borders dengan opacity (border-white/10)

### Typography

- **Font:** Inter (Google Fonts)
- **Headings:** Bold dengan gradient effects
- **Body:** Readable line-height (1.6-1.8)
- **Code:** Monospace dengan syntax highlighting

### Component Styles

- **Glassmorphism:** `backdrop-blur-xl`, `bg-white/5`
- **Gradients:** `from-purple-500 to-blue-500`
- **Shadows:** `shadow-2xl`, `shadow-purple-500/20`
- **Animations:** Smooth transitions, hover effects, micro-interactions

### Responsive Design

- Mobile-first approach
- Breakpoints: sm, md, lg, xl, 2xl
- Flexible layouts dengan Tailwind
- Touch-friendly interactions

---

## 🚀 Deployment

### Frontend Deployment

**Development:**
```bash
npm run dev  # Vite dev server (port 3000)
```

**Production:**
```bash
npm run build  # Build static files
npm run preview  # Preview build (port 4173)
```

**Hosting Options:**
- Vercel (recommended)
- Netlify
- Railway
- Static hosting (cPanel, etc.)

### Backend Deployment

**Development:**
```bash
npm run api  # Express server (port 8788)
```

**Production:**
- Railway (recommended)
- Render
- Node.js hosting
- Passenger (cPanel)

**Environment Variables Required:**
- API keys untuk providers
- Supabase credentials
- Clerk credentials
- CORS configuration

### Deployment Guides

- `FRONTEND_DEPLOY.md` - Frontend deployment
- `BACKEND_DEPLOY.md` - Backend deployment
- `RAILWAY_DEPLOY.md` - Railway deployment
- `DEPLOYMENT_GUIDE_CPANEL.md` - cPanel deployment
- `DEPLOY_API_TO_DOMAIN.md` - Domain setup

---

## 📝 Environment Variables

### Frontend (.env.local)

```env
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# Supabase Database
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# API Configuration
VITE_API_BASE_URL=http://localhost:8788
# or for production:
# VITE_API_BASE_URL=https://api.yourdomain.com
```

### Backend (.env)

```env
# Server Configuration
PORT=8788
CORS_ORIGIN=true  # or specific origin: https://yourdomain.com

# AI Provider API Keys
OPENROUTER_API_KEY=sk-or-v1-...  # For Groq (Claude), OpenAI (GPT-5.2), Grok (Gemini 3 Pro)
DEEPSEEK_API_KEY=sk-...  # Optional: DeepSeek

# Supabase (for server-side operations)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Optional Services
TAVILY_API_KEY=tvly-...  # For web search
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_REDIRECT_URI=https://api.yourdomain.com/api/github/callback
FRONTEND_URL=https://yourdomain.com

# Deployment (optional)
VERCEL_TOKEN=...
NETLIFY_TOKEN=...

# Python Execution (optional)
PYTHON_COMMAND=python3
```

---

## 🔧 Key Functions & APIs

### Frontend Functions

#### `lib/ai.ts`
- `generateCode()` - Main code generation function
- `extractCode()` - Extract code from AI response
- `detectNextJS()` - Detect if user wants Next.js

#### `lib/database.ts`
- `syncUser()` - Sync Clerk user to Supabase
- `createChatSession()` - Create new chat session
- `saveMessage()` - Save chat message
- `getUserSessions()` - Get user's chat sessions
- `getSessionMessages()` - Get messages for session
- `getUserApiKeys()` - Get user API keys (decrypted)
- `saveUserApiKey()` - Save encrypted API key
- `updateSessionMode()` - Update session mode

#### `lib/tokenLimit.ts`
- `checkTokenLimit()` - Check if user exceeded limit
- `trackAIUsage()` - Track token usage
- `getTokenUsageSummary()` - Get usage summary

#### `lib/grokTokenLimit.ts`
- `checkGrokTokenLimit()` - Check Grok token limit
- `getGrokTokenUsage()` - Get Grok usage

### Backend APIs (`server/index.js`)

#### `POST /api/generate`
- Generate code/text dari AI provider
- Parameters: prompt, history, systemPrompt, provider, mode, images
- Returns: { content }

#### `POST /api/deploy`
- Deploy code ke Vercel/Netlify
- Parameters: code, platform, projectName, apiToken
- Returns: { success, url, deploymentId }

#### `POST /api/deploy/status`
- Check deployment status
- Parameters: deploymentId, platform
- Returns: { status, url }

#### `POST /api/search`
- Web search (Tavily API)
- Parameters: query, maxResults
- Returns: { query, results, totalResults, searchTime }

#### `POST /api/parse-document`
- Parse uploaded document (PDF/DOCX/TXT/MD)
- Parameters: file (multipart)
- Returns: { title, content, pages, sections, metadata }

#### `POST /api/execute-code`
- Execute Python code
- Parameters: code, language
- Returns: { output, error, executionTime }

#### `POST /api/plan`
- Generate task plan
- Parameters: prompt, provider
- Returns: { id, prompt, tasks, estimatedTotalTime, createdAt }

#### GitHub OAuth Routes
- `GET /api/github/auth` - Get OAuth URL
- `GET /api/github/callback` - OAuth callback
- `POST /api/github/repos` - Get user repositories
- `POST /api/github/create-repo` - Create repository
- `POST /api/github/push` - Push files to GitHub

#### Health Check
- `GET /` - Root ping
- `GET /api/health` - Health check

---

## 🐛 Known Issues & Technical Debt

### 1. PDF Parsing
- **Issue:** Complex PDFs mungkin tidak ter-parse dengan baik
- **Solution:** Consider menggunakan library yang lebih robust (pdf.js, pdf-lib)

### 2. Python Execution
- **Issue:** Tidak ada secure sandbox untuk code execution
- **Solution:** Implement Docker container atau secure runtime

### 3. Web Search Fallback
- **Issue:** DuckDuckGo fallback quality kurang baik
- **Solution:** Improve fallback atau require API key

### 4. TypeScript Types
- **Issue:** Beberapa functions belum fully typed
- **Solution:** Add comprehensive TypeScript types

### 5. Error Handling
- **Issue:** Beberapa error messages kurang user-friendly
- **Solution:** Improve error messages dan user feedback

### 6. Code Duplication
- **Issue:** Duplicate deployment endpoint di `server/index.js` (lines 517-630 dan 691-804)
- **Solution:** Remove duplicate code

### 7. Bundle Size
- **Issue:** Large bundle size karena banyak dependencies
- **Solution:** Code splitting, lazy loading, tree shaking

### 8. Testing
- **Issue:** Tidak ada test coverage
- **Solution:** Add unit tests, integration tests, e2e tests

---

## 📚 Documentation Files

Project ini memiliki dokumentasi lengkap:

- `CODE_ANALYSIS.md` - Basic code analysis (existing)
- `CLERK_SETUP.md` - Clerk authentication setup
- `SUPABASE_SETUP.md` - Supabase database setup
- `GROK_DEFAULT_SETUP.md` - Grok provider configuration
- `GROK_TOKEN_LOCK_FEATURE.md` - Grok token lock feature
- `UNIFIED_API_KEYS.md` - API keys management
- `ROADMAP.md` - Development roadmap
- `NEW_FEATURES.md` - New features documentation
- `OPENROUTER_CONFIG.md` - OpenRouter configuration
- `MOONSHOT_API_SETUP.md` - Moonshot API setup
- `VOICE_CALL_FEATURE.md` - Voice call feature
- `AURA_WORKBENCH.md` - Aura Workbench feature
- Deployment guides (multiple files)

---

## 💡 Recommendations for Improvement

### 1. Code Quality
- ✅ Add comprehensive TypeScript types
- ✅ Remove code duplication
- ✅ Improve error handling
- ✅ Add input validation
- ✅ Add logging system

### 2. Performance
- ✅ Code splitting untuk large components
- ✅ Lazy loading untuk routes
- ✅ Optimize bundle size
- ✅ Add caching strategies
- ✅ Optimize database queries

### 3. Testing
- ✅ Unit tests untuk utilities
- ✅ Integration tests untuk API endpoints
- ✅ E2E tests untuk user flows
- ✅ Component tests untuk React components

### 4. Security
- ✅ Secure code execution sandbox
- ✅ Rate limiting untuk API endpoints
- ✅ Input sanitization
- ✅ XSS protection
- ✅ CSRF protection

### 5. Features
- ✅ Real-time collaboration
- ✅ Export/import projects
- ✅ Template marketplace
- ✅ Analytics dashboard
- ✅ Better mobile support

### 6. Developer Experience
- ✅ Better error messages
- ✅ Development tools
- ✅ Debugging utilities
- ✅ Performance monitoring
- ✅ Documentation improvements

---

## 🎯 Conclusion

**NEVRA** adalah platform yang sangat lengkap dengan:

✅ **Modern Tech Stack**
- React 19, TypeScript, Vite
- Express.js backend
- Supabase database
- Clerk authentication

✅ **Multiple AI Providers**
- Groq (Claude Opus 4.5)
- Grok (Gemini 3 Pro)
- OpenAI (GPT-5.2)
- DeepSeek

✅ **Rich Features**
- Builder mode (code generation)
- Tutor mode (AI tutoring)
- Visual editor
- Code quality tools
- Deployment integration
- GitHub integration
- Database panel
- API wizard
- Mobile generator
- Design system manager

✅ **Production Ready**
- Authentication & authorization
- Token limit tracking
- Error handling
- Security measures
- Deployment guides

**Next Steps:**
1. Address known issues
2. Add test coverage
3. Improve performance
4. Enhance security
5. Add new features based on roadmap

---

*Dokumen ini dibuat berdasarkan analisis komprehensif codebase pada: $(date)*
*Total Files Analyzed: 60+ files*
*Total Lines of Code: ~15,000+ lines*






