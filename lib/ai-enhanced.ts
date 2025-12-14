export type AIProvider = 'anthropic' | 'deepseek' | 'openai' | 'gemini';

// --- ENHANCED SYSTEM PROMPTS (Bolt.new / v0.app Level) ---
const BUILDER_PROMPT_ENHANCED = `
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
- Framer Motion (via CDN) for animations
- Lucide Icons (via CDN)
- Babel Standalone for JSX transformation

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
  <script src="https://unpkg.com/framer-motion@10.16.4/dist/framer-motion.js"></script>
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
    const { motion, AnimatePresence } = window.Motion || window.framerMotion || {};
    const lucide = window.lucide;
    
    // Safe Icon Component
    const SafeIcon = ({ name, className = "", size = 24, ...props }) => {
      const lib = window.lucide || {};
      const Icon = lib[name] || lib.HelpCircle || (() => <span />);
      return <Icon className={className} size={size} {...props} />;
    };
    
    // Component definitions here...
    // - Break into logical components
    // - Use proper React patterns
    // - Include proper prop types
    // - Add error handling
    
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

📝 OUTPUT FORMAT:
- Return ONLY the complete HTML string
- NO markdown code fences (\`\`\`html or \`\`\`)
- NO explanations or comments outside the code
- The HTML must be complete and runnable immediately
- Include all necessary CDN links
- Ensure all components are properly defined

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

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const formatErrorHtml = (provider: AIProvider, message: string) => {
  const isCreditError = message.toLowerCase().includes('credit') || message.toLowerCase().includes('insufficient');
  const isOpenRouterProvider = provider === 'openai' || provider === 'anthropic' || provider === 'gemini';
  
  if (isOpenRouterProvider && isCreditError) {
    const providerName = provider === 'openai' ? 'GPT-5.2' : provider === 'anthropic' ? 'Claude Sonnet 4.5' : provider === 'deepseek' ? 'Mistral Devstral' : 'Claude Sonnet 4.5';
    return `<!-- Error Generating Code --> 
      <div class="text-red-500 bg-red-900/20 p-4 rounded-lg border border-red-500/50">
        <strong>⚠️ OpenRouter Credits Insufficient</strong>
        <br/><br/>
        <p class="text-sm mb-2">${message}</p>
        <p class="text-sm mb-3"><strong>Solutions:</strong></p>
        <ul class="text-sm list-disc list-inside space-y-1 mb-3">
          <li><strong>Switch to Mistral Devstral</strong> - Free alternative that doesn't require OpenRouter credits</li>
          ${provider === 'openai' ? '<li>Add credits at <a href="https://openrouter.ai/settings/credits" target="_blank" class="text-blue-400 underline">openrouter.ai/settings/credits</a></li>' : ''}
          <li>Try a shorter prompt to reduce token usage</li>
          ${provider === 'openai' || provider === 'gemini' ? '<li>Check your OpenRouter API key has sufficient credits for ' + providerName + '</li>' : '<li>Note: ' + providerName + ' is free and does not require credits</li>'}
        </ul>
        <span class="text-xs opacity-70">Note: All models use OpenRouter. Mistral Devstral is free, but GPT-5.2 and Claude Sonnet 4.5 require credits. Try <strong>DeepSeek</strong> for a free alternative.</span>
      </div>`;
  }

  // Special handling for Claude Sonnet 4.5 (anthropic) errors
  if (provider === 'anthropic' || provider === 'gemini') {
    const isHtmlError = message.toLowerCase().includes('html') || message.toLowerCase().includes('doctype');
    const isModelError = message.toLowerCase().includes('model') && message.toLowerCase().includes('not found');
    const isKeyError = message.toLowerCase().includes('invalid') && message.toLowerCase().includes('key');
    
    if (isHtmlError || isModelError || isKeyError) {
      return `<!-- Error Generating Code --> 
        <div class="text-red-500 bg-red-900/20 p-4 rounded-lg border border-red-500/50">
          <strong>🚫 Claude Sonnet 4.5 Error</strong>
          <br/><br/>
          <p class="text-sm mb-2">${message}</p>
          <p class="text-sm mb-3"><strong>Possible Causes & Solutions:</strong></p>
          <ul class="text-sm list-disc list-inside space-y-1 mb-3">
            ${isModelError ? '<li><strong>Model not available:</strong> The Claude Sonnet 4.5 model may not be accessible with your OpenRouter API key. Try using Groq (Llama 3) instead.</li>' : ''}
            ${isKeyError ? '<li><strong>Invalid API Key:</strong> Check your OPENROUTER_API_KEY in backend environment variables.</li>' : ''}
            ${isHtmlError ? '<li><strong>API Endpoint Error:</strong> The API returned HTML instead of JSON. This usually means the endpoint is incorrect or the service is down.</li>' : ''}
            <li>Verify your <code class="bg-black/30 px-1 rounded">OPENROUTER_API_KEY</code> is set correctly in backend</li>
            <li>Check if the model <code class="bg-black/30 px-1 rounded">anthropic/claude-sonnet-4.5</code> is available in your OpenRouter account</li>
            <li>Try switching to <strong>Groq (Llama 3)</strong> provider as an alternative</li>
            <li>Check backend logs for detailed error information</li>
          </ul>
          <span class="text-xs opacity-70">Note: Claude Sonnet 4.5 uses OpenRouter API. Make sure your API key has access to the model.</span>
        </div>`;
    }
  }

  // Special handling for DeepSeek errors (uses OpenRouter)
  if (provider === 'deepseek') {
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
            <li><strong>Model Access:</strong> Verify that your OpenRouter API key has access to the model <code class="bg-black/30 px-1 rounded">mistralai/devstral-2512:free</code></li>
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
      const providerName = provider === 'openai' ? 'GPT-5.2' : provider === 'anthropic' ? 'Claude Sonnet 4.5' : provider === 'deepseek' ? 'Mistral Devstral' : 'Claude Sonnet 4.5';
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
      <strong>${provider.toUpperCase()} Error:</strong> ${message}
      <br/>
      <span class="text-sm opacity-70">Check console for details or verify API keys.</span>
    </div>`;
};

export const generateCode = async (
  prompt: string,
  history: any[],
  mode: 'builder' | 'tutor' = 'builder',
  provider: AIProvider = 'anthropic',
  images: string[] = [],
  useEnhanced: boolean = true // New parameter to use enhanced prompt
) => {

  // Use enhanced prompt if enabled, otherwise use original
  const systemPrompt = mode === 'builder' 
    ? (useEnhanced ? BUILDER_PROMPT_ENHANCED : BUILDER_PROMPT_ENHANCED) // For now, always use enhanced
    : TUTOR_PROMPT;

  try {
    const resp = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
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
    return data.content || "";
  } catch (error) {
    console.error(`${provider} Error:`, error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
        ? error 
        : 'Unknown error occurred';
    return formatErrorHtml(provider, errorMessage);
  }
};

// Export enhanced prompt for reference
export { BUILDER_PROMPT_ENHANCED };
