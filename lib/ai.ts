export type AIProvider = 'anthropic' | 'deepseek' | 'openai' | 'gemini';
export type Framework = 'html' | 'react' | 'nextjs' | 'vite';

// --- ENHANCED SYSTEM PROMPTS (Bolt.new / v0.app Level) ---
const BUILDER_PROMPT = `
You are NEVRA BUILDER, an elite Frontend Engineer/UX Architect inspired by bolt.new and v0.app. Your mission is to generate production-ready, modern web applications that are beautiful, functional, and follow best practices.

🎯 CORE PRINCIPLES:
1. **Production Quality**: Code must be production-ready, not prototypes
2. **Modern Design**: Follow design systems from Vercel, Linear, Stripe, V0, Bolt
3. **Component-Based**: Break down into reusable, well-structured components
4. **Responsive First**: Mobile-first approach, perfect on all screen sizes
5. **Performance**: Optimize for speed, use proper React patterns
6. **Accessibility**: Follow WCAG guidelines, semantic HTML, proper ARIA

📐 ARCHITECTURE REQUIREMENTS:
- **Component Structure**: Break UI into logical, reusable components
- **State Management**: Use React hooks (useState, useEffect, useMemo, useCallback) appropriately
- **Props Interface**: Define clear prop types and default values
- **Separation of Concerns**: Separate presentation, logic, and data
- **Error Boundaries**: Include error handling where appropriate

🎨 DESIGN SYSTEM (Bolt.new / V0.app Style):
- **Color Palette**: 
  - Background: Dark (#0a0a0a, #050505) with subtle gradients
  - Primary: Purple/Blue gradients (#7e22ce, #3b82f6)
  - Text: High contrast (#ffffff, #e5e5e5, #a3a3a3)
  - Accents: Subtle glows, borders with opacity (border-white/10)
- **Typography**: 
  - Headings: Bold, large, with gradient text effects
  - Body: Inter/System font, readable line-height (1.6-1.8)
  - Code: Monospace, proper syntax highlighting
- **Spacing**: Generous padding (p-6, p-8), consistent gaps (gap-4, gap-6)
- **Effects**:
  - Glassmorphism: backdrop-blur-xl, bg-white/5
  - Gradients: from-purple-500 to-blue-500
  - Shadows: shadow-2xl, shadow-purple-500/20
  - Animations: Smooth transitions, hover effects, micro-interactions

🔧 TECH STACK (Single-File HTML):
- React 18 (via CDN)
- TailwindCSS (via CDN)
- Framer Motion v11 (via CDN) - use sparingly, prefer CSS for simple animations
- Lucide Icons (via CDN) - access via window.lucide
- Babel Standalone for JSX transformation

⚠️ IMPORTANT CDN NOTES:
- Framer Motion: Use window.framerMotion or window.Motion (check both)
- Lucide: Use window.lucide object to access icons
- Always use SafeIcon component, never access lucide icons directly
- Test that all CDN scripts load before using their APIs

📋 CODE STRUCTURE TEMPLATE:
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated App</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <!-- Framer Motion - use only if complex animations needed, prefer CSS transitions -->
  <script>
    // Load Framer Motion with error handling
    (function() {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/framer-motion@11/dist/framer-motion.umd.js';
      script.onerror = function() {
        console.warn('Framer Motion failed to load, using CSS animations instead');
        window.framerMotion = null;
      };
      document.head.appendChild(script);
    })();
  </script>
  <script src="https://unpkg.com/lucide-react@latest/dist/umd/lucide-react.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <script>
    window.onerror = function(msg, url, line, col, error) {
      const div = document.createElement('div');
      div.style = "position:fixed;top:0;left:0;right:0;background:red;color:white;padding:12px;z-index:9999;font-family:monospace;font-size:12px;";
      div.textContent = "ERROR: " + msg + " (Line " + line + ")";
      document.body.appendChild(div);
      return false;
    };
  </script>
  <style>
    * { box-sizing: border-box; }
    body { 
      margin: 0; 
      padding: 0;
      background-color: #050505; 
      color: #fff; 
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    #root { min-height: 100vh; }
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: #0a0a0a; }
    ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #444; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useRef, useMemo, useCallback } = React;
    
    // Framer Motion - handle different CDN formats with proper fallback
    let motion, AnimatePresence;
    try {
      // Try to access Framer Motion from CDN
      const fm = window.framerMotion || window.Motion || window.motion;
      if (fm && fm.motion) {
        motion = fm.motion;
        AnimatePresence = fm.AnimatePresence || (({ children }) => children);
      } else if (fm && typeof fm === 'object') {
        motion = fm;
        AnimatePresence = ({ children }) => children;
      } else {
        // Fallback: create simple motion wrapper
        motion = {
          div: ({ children, ...props }) => React.createElement('div', props, children),
          span: ({ children, ...props }) => React.createElement('span', props, children),
          button: ({ children, ...props }) => React.createElement('button', props, children),
        };
        AnimatePresence = ({ children }) => children;
      }
    } catch (e) {
      // If Framer Motion fails, use fallback
      motion = {
        div: ({ children, ...props }) => React.createElement('div', props, children),
        span: ({ children, ...props }) => React.createElement('span', props, children),
        button: ({ children, ...props }) => React.createElement('button', props, children),
      };
      AnimatePresence = ({ children }) => children;
    }
    
    // Safe Icon Component - MUST use string literal name prop
    // Usage: <SafeIcon name="Zap" /> NOT <SafeIcon name={variable} />
    const SafeIcon = ({ name, className = "", size = 24, ...props }) => {
      try {
        // Validate name is a string
        if (!name || typeof name !== 'string') {
          console.warn('SafeIcon: name must be a string, got:', typeof name, name);
          return React.createElement('span', { className: className + ' text-gray-500', ...props }, '?');
        }
        
        // Get lucide library
        const lucideLib = window.lucide || {};
        
        // Try to get icon by name
        const IconComponent = lucideLib[name];
        
        // If icon not found, use fallback
        if (!IconComponent || typeof IconComponent !== 'function') {
          const FallbackIcon = lucideLib.HelpCircle || lucideLib.AlertCircle || (() => React.createElement('span', null));
          return React.createElement(FallbackIcon, { className, size, ...props });
        }
        
        // Render icon
        return React.createElement(IconComponent, { className, size, ...props });
      } catch (error) {
        console.warn('SafeIcon error for name "' + name + '":', error);
        return React.createElement('span', { className: className + ' text-gray-500', ...props }, '?');
      }
    };
    
    // Component definitions here...
    // - Break into logical components
    // - Use proper React patterns
    // - Include proper prop types
    // - Add error handling
    
    // EXAMPLE: Feature component with icons (CORRECT usage)
    // const FeatureCard = ({ title, description, iconName }) => {
    //   // Use conditional to map iconName to string literal
    //   const iconMap = {
    //     'zap': 'Zap',
    //     'heart': 'Heart',
    //     'star': 'Star'
    //   };
    //   const iconString = iconMap[iconName] || 'HelpCircle';
    //   return (
    //     <div className="p-6 bg-white/5 rounded-lg">
    //       <SafeIcon name={iconString} className="text-purple-400" size={32} />
    //       <h3>{title}</h3>
    //       <p>{description}</p>
    //     </div>
    //   );
    // };
    // 
    // OR BETTER: Use direct string literals
    // const features = [
    //   { title: "Fast", icon: "Zap" },
    //   { title: "Secure", icon: "Shield" }
    // ];
    // {features.map(f => <SafeIcon name={f.icon} />)} // This works if f.icon is string literal
    //
    // CRITICAL: Always ensure icon name is a STRING, never a variable reference
    
    const App = () => {
      return (
        <div className="min-h-screen bg-gradient-to-br from-[#050505] via-[#0a0a0a] to-[#050505]">
          {/* Your components here */}
        </div>
      );
    };
    
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>

✅ QUALITY CHECKLIST (MUST FOLLOW):
1. ✅ All components are properly structured and reusable
2. ✅ Responsive design works on mobile, tablet, desktop
3. ✅ Proper semantic HTML (header, nav, main, section, footer)
4. ✅ Accessible (keyboard navigation, screen readers)
5. ✅ Smooth animations and transitions
6. ✅ No console errors or warnings
7. ✅ Clean, readable, well-commented code
8. ✅ Proper error handling
9. ✅ Loading states where appropriate
10. ✅ Modern UI patterns (hover effects, focus states, etc.)

🎯 COMMON PATTERNS TO INCLUDE:
- **Hero Section**: Large headline, CTA buttons, animated background
- **Feature Grid**: Icons, titles, descriptions in responsive grid
- **Stats/Metrics**: Numbers with animations, progress indicators
- **Testimonials**: Cards with avatars, quotes, names
- **Pricing**: Tiered pricing cards with comparisons
- **Footer**: Links, social media, copyright
- **Navigation**: Sticky header, smooth scroll, mobile menu

🚫 COMMON MISTAKES TO AVOID:
- ❌ Don't use inline styles (use Tailwind classes)
- ❌ Don't create overly complex nested components
- ❌ Don't forget mobile responsiveness
- ❌ Don't use deprecated React patterns
- ❌ Don't forget error boundaries
- ❌ Don't hardcode values that should be dynamic
- ❌ Don't skip accessibility features
- ❌ **CRITICAL**: Always use SafeIcon with string name prop: <SafeIcon name="Zap" /> NOT <SafeIcon name={feature.icon} />
- ❌ **CRITICAL**: Don't use Framer Motion if not needed - prefer CSS transitions for simple animations
- ❌ **CRITICAL**: Always close JSX tags properly - check for missing closing brackets

📝 OUTPUT FORMAT:

**Option 1: Multi-File Project (Preferred for complex projects)**
If the user requests a project with multiple components/files, return JSON:
\`\`\`json
{
  "type": "multi-file",
  "files": [
    { "path": "src/components/Hero.tsx", "content": "...", "type": "component" },
    { "path": "src/App.tsx", "content": "...", "type": "page" },
    { "path": "src/styles.css", "content": "...", "type": "style" }
  ],
  "entry": "src/App.tsx",
  "framework": "react"
}
\`\`\`

**Option 2: Single-File HTML (For simple projects)**
For simple single-page applications, return ONLY the complete HTML string:
- NO markdown code fences (\`\`\`html or \`\`\`)
- NO explanations or comments outside the code
- The HTML must be complete and runnable immediately
- Include all necessary CDN links
- Ensure all components are properly defined

**Decision Rule:**
- **ALWAYS use multi-file format for React/Next.js/Vite projects** - these frameworks require proper file structure
- Use multi-file format if: user requests React/Next.js/Vite, project has 3+ components, needs separate styles, or user explicitly requests multi-file
- Use single-file format ONLY for: simple HTML landing pages without framework requirements (when framework is "html")

🔧 CRITICAL ICON USAGE RULES (MUST FOLLOW - NO EXCEPTIONS):
- **ALWAYS** use SafeIcon with STRING literal name: <SafeIcon name="Zap" />
- **NEVER** use dynamic/variable: <SafeIcon name={iconName} /> or <SafeIcon name={feature.icon} />
- **NEVER** use incomplete syntax: <SafeIcon name={feature.icon (MISSING CLOSING BRACKET)
- **ALWAYS** use string directly: <SafeIcon name="Heart" />, <SafeIcon name="Star" />, etc.

✅ CORRECT Patterns:
  // Direct string literal
  <SafeIcon name="Zap" className="text-yellow-400" size={24} />
  
  // Array with string literals (CORRECT)
  const features = [
    { title: "Fast", icon: "Zap" },      // icon is STRING "Zap"
    { title: "Secure", icon: "Shield" }  // icon is STRING "Shield"
  ];
  {features.map(f => <SafeIcon name={f.icon} />)} // OK because f.icon is string literal
  
  // Conditional with string literals
  {type === 'heart' ? <SafeIcon name="Heart" /> : <SafeIcon name="Star" />}

❌ WRONG Patterns (DO NOT USE):
  <SafeIcon name={iconName} />           // ❌ Variable reference
  <SafeIcon name={feature.icon} />       // ❌ Variable reference (if icon is not string literal)
  <SafeIcon name={getIcon()} />          // ❌ Function call
  <SafeIcon name={icon}                  // ❌ Incomplete syntax

Valid icon names (use exact strings): Zap, Heart, Star, ArrowRight, CheckCircle, X, Menu, Sparkles, Code, Play, Shield, Lock, Globe, etc.

🔧 FRAMER MOTION USAGE:
- Only use Framer Motion for complex animations (fade in, slide, etc.)
- For simple animations, ALWAYS use CSS transitions instead (hover, focus, etc.)
- Prefer CSS classes: transition-all, hover:scale-105, animate-pulse, etc.
- If using motion, wrap with: {motion && motion.div ? <motion.div>...</motion.div> : <div>...</div>}
- Common CSS animations to use instead:
  * transition-all duration-300
  * hover:scale-105 hover:shadow-lg
  * animate-pulse, animate-bounce
  * transform transition-transform

💡 REMEMBER:
- Think like a senior frontend engineer
- Quality over speed
- User experience is paramount
- Code should be maintainable
- Follow React best practices
- Make it beautiful AND functional
`;

const TUTOR_PROMPT = `
You are NEVRA TUTOR, a world-class AI Educator and Mentor. You can reason over text AND images (when provided).

MISSION:
- Help users learn any subject: explain, solve, and guide step-by-step.

CORE IDENTITY:
- Tone: patient, encouraging, clear.
- Method: Socratic questions, analogies, step-by-step reasoning.
- Goal: deep understanding, not rote answers.

CAPABILITIES:
1) Explain ELI5 or deep dive when asked.
2) Math/Science: show full working; verify final answer.
3) Code Tutor: explain line-by-line; propose fixes.
4) Images: if images are provided, describe key elements, extract text if possible, and use them to answer the question.

FORMATTING:
- Bold for key concepts, code blocks for code, numbered steps for procedures, and blockquotes for takeaways.

RULE:
- Do NOT generate full applications in tutor mode; keep to snippets and explanations.
`;

// --- NEXT.JS BUILDER PROMPT (v0.app Level - Compact Version) ---
const NEXTJS_BUILDER_PROMPT = `
You are NEVRA BUILDER, an elite Next.js Engineer. Generate production-ready Next.js 14+ apps with App Router.

REQUIREMENTS:
- Next.js 14+ App Router (NOT Pages Router)
- File structure: app/ for routes, components/ for components, lib/ for utilities
- Server Components by default, add "use client" only when needed
- TypeScript (.tsx) with proper types
- Tailwind CSS for styling
- Use next/image, next/font, Metadata API

OUTPUT FORMAT:
Return multi-file JSON:
\`\`\`json
{
  "type": "multi-file",
  "framework": "next",
  "files": [
    {"path": "package.json", "content": "{...}", "type": "config"},
    {"path": "tsconfig.json", "content": "{...}", "type": "config"},
    {"path": "next.config.js", "content": "...", "type": "config"},
    {"path": "tailwind.config.js", "content": "...", "type": "config"},
    {"path": "app/layout.tsx", "content": "...", "type": "page"},
    {"path": "app/globals.css", "content": "@tailwind...", "type": "style"},
    {"path": "app/page.tsx", "content": "...", "type": "page"}
  ],
  "entry": "app/page.tsx"
}
\`\`\`

ESSENTIAL FILES:
- package.json: Next.js 14+, React 18+, TypeScript, Tailwind
- tsconfig.json: Next.js config with @/* paths
- next.config.js: reactStrictMode: true
- tailwind.config.js: content paths for app/, components/
- app/layout.tsx: RootLayout with Metadata
- app/globals.css: @tailwind directives
- app/page.tsx: Main page component

RULES:
- Server Components by default
- "use client" only for interactivity/hooks
- TypeScript types required
- App Router structure only
`;

// React/Vite Builder Prompt
const REACT_VITE_BUILDER_PROMPT = `
You are NEVRA BUILDER, an elite React/Vite Engineer. Generate production-ready React apps with Vite.

REQUIREMENTS:
- React 18+ with TypeScript (.tsx)
- Vite for build tooling
- File structure: src/components/, src/App.tsx, src/main.tsx, src/index.css
- Tailwind CSS for styling
- Proper component structure with TypeScript types

OUTPUT FORMAT - MUST return multi-file JSON:
\`\`\`json
{
  "type": "multi-file",
  "framework": "vite",
  "files": [
    {"path": "package.json", "content": "{...}", "type": "config"},
    {"path": "vite.config.ts", "content": "...", "type": "config"},
    {"path": "tsconfig.json", "content": "{...}", "type": "config"},
    {"path": "tailwind.config.js", "content": "...", "type": "config"},
    {"path": "index.html", "content": "...", "type": "config"},
    {"path": "src/main.tsx", "content": "...", "type": "config"},
    {"path": "src/App.tsx", "content": "...", "type": "page"},
    {"path": "src/index.css", "content": "@tailwind...", "type": "style"},
    {"path": "src/components/Hero.tsx", "content": "...", "type": "component"}
  ],
  "entry": "src/App.tsx"
}
\`\`\`

ESSENTIAL FILES:
- package.json: React 18+, Vite, TypeScript, Tailwind CSS dependencies
- vite.config.ts: Vite configuration with React plugin
- tsconfig.json: TypeScript config for React/Vite
- tailwind.config.js: Tailwind with content paths for src/
- index.html: Vite entry HTML
- src/main.tsx: React entry point with ReactDOM.createRoot
- src/App.tsx: Main App component
- src/index.css: Tailwind directives and global styles

RULES:
- Use functional components with hooks
- TypeScript types required
- Proper imports and exports
- Component-based architecture
- Export components properly
`;

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const formatErrorHtml = (provider: AIProvider, message: string) => {
  const isCreditError = message.toLowerCase().includes('credit') || message.toLowerCase().includes('afford') || message.toLowerCase().includes('insufficient');
  const isTokenLimitError = message.toLowerCase().includes('prompt tokens') || message.toLowerCase().includes('token limit exceeded');
  
  // All OpenRouter providers (anthropic, gemini, openai) can have credit errors
  const isOpenRouterProvider = provider === 'openai' || provider === 'anthropic' || provider === 'gemini';
  
  if (isOpenRouterProvider && (isCreditError || isTokenLimitError)) {
    const providerName = provider === 'openai' ? 'GPT-5-Nano' : provider === 'anthropic' ? 'GPT OSS 20B' : provider === 'deepseek' ? 'Mistral Devstral' : 'GPT OSS 20B';
    return `<!-- Error Generating Code --> 
      <div class="text-red-500 bg-red-900/20 p-4 rounded-lg border border-red-500/50">
        <strong>⚠️ OpenRouter ${isTokenLimitError ? 'Prompt Token Limit' : 'Credits'} Exceeded</strong>
        <br/><br/>
        <p class="text-sm mb-2">${message}</p>
        <p class="text-sm mb-3"><strong>Quick Solutions:</strong></p>
        <ul class="text-sm list-disc list-inside space-y-1 mb-3">
          <li><strong>Switch to DeepSeek</strong> - Free alternative that doesn't require OpenRouter credits</li>
          <li>Use a shorter, more concise prompt to reduce token usage</li>
          <li>Add credits at <a href="https://openrouter.ai/settings/credits" target="_blank" class="text-blue-400 underline">openrouter.ai/settings/credits</a></li>
          ${provider === 'openai' ? '<li>Puter.js uses User-Pays model - no API key needed</li>' : '<li>Note: ' + providerName + ' is free and does not require credits</li>'}
        </ul>
        <div class="text-xs opacity-70 bg-blue-900/20 p-2 rounded mt-2">
          💡 <strong>Tip:</strong> Most models use OpenRouter. Mistral Devstral, GPT OSS 20B, and GPT-5-Nano (via Puter.js) are available. Try <strong>Mistral Devstral</strong>, <strong>GPT OSS 20B</strong>, or <strong>GPT-5-Nano</strong> for alternatives.
        </div>
      </div>`;
  }

  // Special handling for GPT OSS 20B (anthropic) errors
  if (provider === 'anthropic' || provider === 'gemini') {
    const isHtmlError = message.toLowerCase().includes('html') || message.toLowerCase().includes('doctype');
    const isModelError = message.toLowerCase().includes('model') && message.toLowerCase().includes('not found');
    const isKeyError = message.toLowerCase().includes('invalid') && message.toLowerCase().includes('key');
    
    if (isHtmlError || isModelError || isKeyError) {
      return `<!-- Error Generating Code --> 
        <div class="text-red-500 bg-red-900/20 p-4 rounded-lg border border-red-500/50">
          <strong>🚫 GPT OSS 20B Error</strong>
          <br/><br/>
          <p class="text-sm mb-2">${message}</p>
          <p class="text-sm mb-3"><strong>Possible Causes & Solutions:</strong></p>
          <ul class="text-sm list-disc list-inside space-y-1 mb-3">
            ${isModelError ? '<li><strong>Model not available:</strong> The GPT OSS 20B model may not be accessible with your OpenRouter API key. Try using Mistral Devstral instead.</li>' : ''}
            ${isKeyError ? '<li><strong>Invalid API Key:</strong> Check your OPENROUTER_API_KEY in backend environment variables.</li>' : ''}
            ${isHtmlError ? '<li><strong>API Endpoint Error:</strong> The API returned HTML instead of JSON. This usually means the endpoint is incorrect or the service is down.</li>' : ''}
            <li>Verify your <code class="bg-black/30 px-1 rounded">OPENROUTER_API_KEY</code> is set correctly in backend</li>
            <li>Check if the model <code class="bg-black/30 px-1 rounded">openai/gpt-oss-20b:free</code> is available in your OpenRouter account</li>
            <li>Try switching to <strong>Mistral Devstral</strong> provider as an alternative</li>
            <li>Check backend logs for detailed error information</li>
          </ul>
          <span class="text-xs opacity-70">Note: GPT OSS 20B uses OpenRouter API. Make sure your API key has access to the model.</span>
        </div>`;
    }
  }

  // Special handling for DeepSeek errors (uses OpenRouter)
  if (provider === 'deepseek') {
    // Check if error is about image support (should not happen anymore, but handle it)
    const isImageSupportError = message.toLowerCase().includes('does not support image input') || message.toLowerCase().includes('image input');
    
    if (isImageSupportError) {
      return `<!-- Error Generating Code --> 
        <div class="text-yellow-500 bg-yellow-900/20 p-4 rounded-lg border border-yellow-500/50">
          <strong>⚠️ Mistral Devstral Image Support</strong>
          <br/><br/>
          <p class="text-sm mb-2">Mistral Devstral via OpenRouter now supports image input. If you're seeing this error, please refresh the page or restart the backend server.</p>
          <p class="text-sm mb-3"><strong>Note:</strong> Mistral Devstral uses OpenRouter API which supports vision models.</p>
        </div>`;
    }
    
    const isUnauthorized = message.toLowerCase().includes('401') || message.toLowerCase().includes('unauthorized');
    const isKeyError = message.toLowerCase().includes('invalid') && message.toLowerCase().includes('key');
    const isApiKeyError = message.toLowerCase().includes('api key');
    
    if (isUnauthorized || isKeyError || isApiKeyError) {
      return `<!-- Error Generating Code --> 
        <div class="text-red-500 bg-red-900/20 p-4 rounded-lg border border-red-500/50">
          <strong>🚫 Mistral Devstral Error</strong>
          <br/><br/>
          <p class="text-sm mb-2">${message}</p>
          <p class="text-sm mb-3"><strong>Possible Causes & Solutions:</strong></p>
          <ul class="text-sm list-disc list-inside space-y-1 mb-3">
            <li><strong>Invalid OpenRouter API Key:</strong> Mistral Devstral uses OpenRouter API. Check your <code class="bg-black/30 px-1 rounded">OPENROUTER_API_KEY</code> in backend environment variables.</li>
            <li><strong>API Key Not Set:</strong> Make sure <code class="bg-black/30 px-1 rounded">OPENROUTER_API_KEY</code> is set in your backend <code class="bg-black/30 px-1 rounded">.env</code> file</li>
            <li><strong>Model Access:</strong> Verify that your OpenRouter API key has access to the model <code class="bg-black/30 px-1 rounded">tngtech/devstral-2512:free</code></li>
            <li>Get your API key from <a href="https://openrouter.ai/keys" target="_blank" class="text-blue-400 underline">openrouter.ai/keys</a></li>
            <li>Restart your backend server after updating the API key</li>
          </ul>
          <span class="text-xs opacity-70">Note: Mistral Devstral uses OpenRouter API (not DEEPSEEK_API_KEY). Make sure your OPENROUTER_API_KEY is valid and has access to the model.</span>
        </div>`;
    }
  }

  // Special handling for API key not configured errors
  if (message.toLowerCase().includes('api key not configured') || message.toLowerCase().includes('not configured')) {
    const isOpenRouterProvider = provider === 'openai' || provider === 'anthropic' || provider === 'gemini' || provider === 'deepseek';
    if (isOpenRouterProvider) {
      const providerName = provider === 'openai' ? 'GPT-5-Nano' : provider === 'anthropic' ? 'GPT OSS 20B' : provider === 'deepseek' ? 'Mistral Devstral' : provider === 'gemini' ? 'GPT OSS 20B' : 'Unknown Provider';
      return `<!-- Error Generating Code --> 
        <div class="text-red-500 bg-red-900/20 p-4 rounded-lg border border-red-500/50">
          <strong>⚠️ OpenRouter API Key Not Configured</strong>
          <br/><br/>
          <p class="text-sm mb-2">${providerName} uses OpenRouter API and requires OPENROUTER_API_KEY to be set in your backend environment variables.</p>
          <p class="text-sm mb-3"><strong>Solutions:</strong></p>
          <ul class="text-sm list-disc list-inside space-y-1 mb-3">
            <li>Add <code class="bg-black/30 px-1 rounded">OPENROUTER_API_KEY</code> to your backend <code class="bg-black/30 px-1 rounded">.env</code> file</li>
            <li>Get your API key from <a href="https://openrouter.ai/keys" target="_blank" class="text-blue-400 underline">openrouter.ai/keys</a></li>
            <li>Restart your backend server after adding the key</li>
          </ul>
          <span class="text-xs opacity-70">Note: ${providerName} requires OpenRouter API key. Make sure it's set in backend environment variables.</span>
        </div>`;
    }
  }

  return `<!-- Error Generating Code --> 
    <div class="text-red-500 bg-red-900/20 p-4 rounded-lg border border-red-500/50">
      <strong>${provider === 'deepseek' ? 'MISTRAL DEVSTRAL' : provider.toUpperCase()} Error:</strong> ${message}
      <br/>
      <span class="text-sm opacity-70">Check console for details or verify API keys.</span>
    </div>`;
};

export interface MultiFileResponse {
  type: 'multi-file';
  files: Array<{
    path: string;
    content: string;
    type: 'component' | 'page' | 'style' | 'config' | 'other';
  }>;
  entry: string;
  framework?: 'react' | 'next' | 'vue' | 'svelte' | 'html';
}

export interface SingleFileResponse {
  type: 'single-file';
  content: string;
}

export type CodeResponse = MultiFileResponse | SingleFileResponse;

export const generateCode = async (
  prompt: string,
  history: any[],
  mode: 'builder' | 'tutor' = 'builder',
  provider: AIProvider = 'deepseek', // Default to Mistral Devstral (free)
  images: string[] = [],
  framework: Framework = 'html'
): Promise<CodeResponse> => {

  // Enhance system prompt based on framework
  let systemPrompt = mode === 'builder' ? BUILDER_PROMPT : TUTOR_PROMPT;
  
  if (mode === 'builder') {
    switch (framework) {
      case 'nextjs':
        systemPrompt = NEXTJS_BUILDER_PROMPT;
        break;
      case 'react':
      case 'vite':
        systemPrompt = REACT_VITE_BUILDER_PROMPT;
        break;
      case 'html':
      default:
        systemPrompt = BUILDER_PROMPT;
        break;
    }
    
    // Force multi-file for framework-based projects
    if (framework !== 'html') {
      const frameworkInstruction = `
      
⚠️ CRITICAL FRAMEWORK REQUIREMENT:
You MUST generate code in **multi-file JSON format** for ${framework === 'nextjs' ? 'Next.js' : framework === 'vite' ? 'Vite/React' : 'React'} framework.
- DO NOT return single-file HTML
- Return ONLY the JSON object with type "multi-file" and framework "${framework}"
- Include all necessary config files (package.json, tsconfig.json, vite.config.ts or next.config.js, etc.)
- Follow the framework structure exactly as specified in the requirements above`;
      systemPrompt = systemPrompt + frameworkInstruction;
    }
  }
  
  if (images && images.length > 0) {
    const visionInstructions = `
    
🖼️ VISION ANALYSIS MODE:
You are now analyzing images provided by the user. When images are present:
1. **Describe the image**: Provide a detailed, accurate description of what you see
2. **Answer questions**: If the user asks questions about the image, answer them based on what you observe
3. **Code from images**: If the image shows a design/mockup, generate the code to recreate it
4. **Explain concepts**: If the image shows diagrams, charts, or educational content, explain them clearly
5. **Be specific**: Mention colors, layout, text content, UI elements, and any other relevant details
6. **For Builder Mode**: If the image shows a UI design, generate the complete React/Tailwind code to recreate it
7. **For Tutor Mode**: If the image shows educational content, explain it step-by-step and help the user understand

The user may ask you to:
- Describe what's in the image
- Explain concepts shown in diagrams/charts
- Generate code based on a design mockup
- Answer questions about the image content
- Translate or explain text in the image

Always be thorough and helpful in your analysis.`;
    
    systemPrompt = systemPrompt + visionInstructions;
  }

  try {
    const resp = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
        body: JSON.stringify({
        prompt: framework !== 'html' ? `${prompt}\n\nIMPORTANT: Generate as ${framework === 'nextjs' ? 'Next.js' : framework === 'vite' ? 'Vite/React' : 'React'} project with multi-file structure. Return JSON format with type "multi-file".` : prompt,
        history,
        mode,
        provider,
        images,
        systemPrompt,
      }),
    });

    if (!resp.ok) {
      // Try to parse as JSON first, fallback to text if HTML response
      let errorData: any = {};
      const contentType = resp.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        try {
          errorData = await resp.json();
        } catch (e) {
          // If JSON parse fails, try as text
          const text = await resp.text();
          console.error(`[${provider}] Non-JSON error response:`, text.slice(0, 500));
          errorData = { error: `API returned HTML instead of JSON. Status: ${resp.status}` };
        }
      } else {
        // Response is HTML or other non-JSON format
        const text = await resp.text();
        console.error(`[${provider}] HTML error response:`, text.slice(0, 500));
        errorData = { 
          error: `API Error (${resp.status}): Server returned HTML instead of JSON. This usually means the API endpoint is incorrect, API key is invalid, or the service is unavailable.` 
        };
      }
      
      const msg = errorData?.error || resp.statusText || 'Unknown error';
      throw new Error(msg);
    }

    // Check content type before parsing
    const contentType = resp.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await resp.text();
      console.error(`[${provider}] Non-JSON response:`, text.slice(0, 500));
      throw new Error(`API returned ${contentType} instead of JSON. Response: ${text.slice(0, 200)}`);
    }

    const data = await resp.json();
    const content = data.content || "";

    // Try to parse as multi-file JSON response with better error handling
    try {
      // First, try to extract JSON from markdown code blocks
      const jsonBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch) {
        const jsonContent = jsonBlockMatch[1].trim();
        if (jsonContent.startsWith('{')) {
          try {
            const parsed = JSON.parse(jsonContent);
            if (parsed.type === 'multi-file' && Array.isArray(parsed.files)) {
              // Validate and clean files
              const validFiles = parsed.files
                .filter((f: any) => f && f.path && f.content !== undefined)
                .map((f: any) => ({
                  path: String(f.path || '').trim(),
                  content: String(f.content || '').trim(),
                  type: (f.type || 'other') as 'component' | 'page' | 'style' | 'config' | 'other',
                }));
              
              if (validFiles.length > 0) {
                return {
                  type: 'multi-file',
                  files: validFiles,
                  entry: parsed.entry || validFiles.find((f: any) => f.path.includes('App.tsx') || f.path.includes('main.tsx') || f.path.includes('index.tsx'))?.path || validFiles[0].path,
                  framework: parsed.framework || 'react',
                } as MultiFileResponse;
              }
            }
          } catch (e) {
            console.warn('Failed to parse JSON from code block:', e);
          }
        }
      }
      
      // Check if content is direct JSON (starts with {)
      const trimmedContent = content.trim();
      if (trimmedContent.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmedContent);
          
          // Check if it's a multi-file response
          if (parsed.type === 'multi-file' && Array.isArray(parsed.files)) {
            // Validate and clean files
            const validFiles = parsed.files
              .filter((f: any) => f && f.path && f.content !== undefined)
              .map((f: any) => ({
                path: String(f.path || '').trim(),
                content: String(f.content || '').trim(),
                type: (f.type || 'other') as 'component' | 'page' | 'style' | 'config' | 'other',
              }));
            
            if (validFiles.length > 0) {
              return {
                type: 'multi-file',
                files: validFiles,
                entry: parsed.entry || validFiles.find((f: any) => f.path.includes('App.tsx') || f.path.includes('main.tsx') || f.path.includes('index.tsx'))?.path || validFiles[0].path,
                framework: parsed.framework || 'react',
              } as MultiFileResponse;
            }
          }
        } catch (parseError) {
          console.warn('Failed to parse direct JSON:', parseError);
        }
      }
    } catch (parseError) {
      // Not JSON, treat as single-file HTML
      console.log('Response is not multi-file JSON, treating as single-file HTML');
    }

    // Fallback to single-file HTML
    // Ensure content is not empty
    if (!content || content.trim().length === 0) {
      console.warn(`[${provider}] Empty content received, returning error message`);
      return {
        type: 'single-file',
        content: formatErrorHtml(provider, 'Received empty response from API. Please try again or check your API configuration.'),
      } as SingleFileResponse;
    }
    
    return {
      type: 'single-file',
      content: content,
    } as SingleFileResponse;
  } catch (error) {
    console.error(`${provider} Error:`, error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
        ? error 
        : 'Unknown error occurred';
    
    // Check if it's a prompt token limit error for OpenRouter providers
    const isPromptTokenError = (provider === 'openai' || provider === 'gemini' || provider === 'anthropic') && 
      (errorMessage.toLowerCase().includes('prompt tokens') || 
       errorMessage.toLowerCase().includes('prompt token limit') ||
       errorMessage.toLowerCase().includes('token limit exceeded'));
    
    if (isPromptTokenError) {
      // Return error with suggestion to use shorter prompt or switch provider
      const providerName = provider === 'openai' ? 'GPT-5-Nano' : provider === 'anthropic' ? 'GPT OSS 20B' : provider === 'deepseek' ? 'Mistral Devstral' : 'GPT OSS 20B';
      return {
        type: 'single-file',
        content: formatErrorHtml(provider, errorMessage + ` - Try using a shorter prompt or switch to a different provider.`),
      } as SingleFileResponse;
    }
    
    // Check if it's a timeout/abort error
    const isTimeoutError = errorMessage.toLowerCase().includes('timeout') ||
                          errorMessage.toLowerCase().includes('aborted') ||
                          errorMessage.toLowerCase().includes('took too long');
    
    if (isTimeoutError && provider === 'deepseek') {
      return {
        type: 'single-file',
        content: formatErrorHtml(provider, `${errorMessage} - Mistral Devstral can be slower for complex prompts. Please try again with a shorter prompt or switch to a different provider like GPT OSS 20B.`),
      } as SingleFileResponse;
    }
    
    // Always return a valid response, even on error
    const errorContent = formatErrorHtml(provider, errorMessage);
    
    // Ensure error content is not empty
    if (!errorContent || errorContent.trim().length === 0) {
      return {
        type: 'single-file',
        content: formatErrorHtml(provider, 'Unknown error occurred. Please try again or check your API configuration.'),
      } as SingleFileResponse;
    }
    
    return {
      type: 'single-file',
      content: errorContent,
    } as SingleFileResponse;
  }
};
