import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import multer from 'multer';
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createRequire } from 'module';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const execAsync = promisify(exec);
const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Debug logging helper (must be after __dirname is defined)
const DEBUG_LOG_PATH = path.join(__dirname, '..', '.cursor', 'debug.log');
const debugLog = (data) => {
  try {
    const logDir = path.dirname(DEBUG_LOG_PATH);
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const logEntry = JSON.stringify({...data, timestamp: Date.now()}) + '\n';
    fs.appendFileSync(DEBUG_LOG_PATH, logEntry, 'utf8');
  } catch (e) { console.error('Debug log error:', e); }
};

// Note: pdf-parse will be imported dynamically when needed

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY?.trim() || '', {
  apiVersion: '2024-12-18.acacia',
});

// Initialize Supabase client for subscription updates
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️ STRIPE_SECRET_KEY not set. Stripe integration will not work.');
}
if (!supabase) {
  console.warn('⚠️ Supabase credentials not set. Subscription updates will not work.');
}

const app = express();
const PORT = process.env.PORT || 8788;

// CORS configuration: use CORS_ORIGIN if set, otherwise allow all origins
const corsOrigin = process.env.CORS_ORIGIN 
  ? (process.env.CORS_ORIGIN === 'true' ? true : process.env.CORS_ORIGIN)
  : true;

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: '12mb' }));
// Stripe webhook needs raw body for signature verification
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));

// Ensure uploads directory exists (skip in Vercel serverless)
const uploadsDir = process.env.VERCEL 
  ? '/tmp/uploads' // Vercel serverless uses /tmp
  : path.join(__dirname, 'uploads');
  
if (!process.env.VERCEL && !fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
} else if (process.env.VERCEL && !fs.existsSync('/tmp')) {
  // /tmp should exist in Vercel, but just in case
  try {
    fs.mkdirSync('/tmp', { recursive: true });
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  } catch (e) {
    console.warn('Could not create uploads directory:', e);
  }
}

// Configure multer for file uploads
const upload = multer({
  dest: uploadsDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// #region agent log
const OPENROUTER_KEY_RAW = process.env.OPENROUTER_API_KEY;
const OPENROUTER_KEY_TRIMMED = OPENROUTER_KEY_RAW?.trim();
// Puter.js API - No API key needed (User-Pays model)
// Puter.js is serverless and doesn't require API keys
debugLog({location:'server/index.js:52',message:'OPENROUTER_API_KEY env check',data:{rawExists:!!OPENROUTER_KEY_RAW,rawLength:OPENROUTER_KEY_RAW?.length||0,trimmedExists:!!OPENROUTER_KEY_TRIMMED,trimmedLength:OPENROUTER_KEY_TRIMMED?.length||0,firstChars:OPENROUTER_KEY_TRIMMED?.substring(0,10)||'N/A'},sessionId:'debug-session',runId:'run1',hypothesisId:'A'});
// #endregion

const PROVIDER_KEYS = {
  anthropic: OPENROUTER_KEY_TRIMMED || null, // GPT OSS 20B (Free) via OpenRouter
  deepseek: OPENROUTER_KEY_TRIMMED || null, // Mistral AI Devstral 2512 (free) via OpenRouter
  openai: true, // GPT-5-Nano via Puter.js (no API key needed - User-Pays model)
  gemini: OPENROUTER_KEY_TRIMMED || null, // GPT OSS 20B (Free) via OpenRouter (backward compatibility)
};

// #region agent log
debugLog({location:'server/index.js:58',message:'PROVIDER_KEYS initialized',data:{anthropic:!!PROVIDER_KEYS.anthropic,deepseek:!!PROVIDER_KEYS.deepseek,openai:!!PROVIDER_KEYS.openai,gemini:!!PROVIDER_KEYS.gemini,deepseekKeyLength:PROVIDER_KEYS.deepseek?.length||0},sessionId:'debug-session',runId:'run1',hypothesisId:'C'});
// #endregion

// Debug: Log API key status (without exposing actual keys)
console.log('🔑 API Key Status:', {
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? `Set (${process.env.OPENROUTER_API_KEY.substring(0, 10)}...)` : 'NOT SET',
  PUTER_JS: 'No API key needed (User-Pays model)',
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY ? `Set (${process.env.DEEPSEEK_API_KEY.substring(0, 10)}...)` : 'NOT SET',
  Providers: {
    anthropic: PROVIDER_KEYS.anthropic ? 'Configured' : 'Missing',
    openai: PROVIDER_KEYS.openai ? 'Configured (Puter.js)' : 'Missing',
    gemini: PROVIDER_KEYS.gemini ? 'Configured' : 'Missing',
    deepseek: PROVIDER_KEYS.deepseek ? 'Configured' : 'Missing',
  }
});

const MODELS = {
  anthropic: 'openai/gpt-oss-20b:free', // GPT OSS 20B (Free) via OpenRouter - replaced Claude Sonnet
  deepseek: 'mistralai/devstral-2512:free', // Free Mistral AI Devstral 2512 via OpenRouter
  openai: 'gpt-5-nano', // GPT-5-Nano via Puter.js - replaced MiniCPM V2.6
  gemini: 'openai/gpt-oss-20b:free', // GPT OSS 20B (Free) via OpenRouter - backward compatibility
};

// Max tokens configuration (can be overridden via env)
const MAX_TOKENS = {
  anthropic: {
    builder: parseInt(process.env.ANTHROPIC_MAX_TOKENS_BUILDER) || 8192,
    tutor: parseInt(process.env.ANTHROPIC_MAX_TOKENS_TUTOR) || 4096,
  },
  deepseek: {
    builder: parseInt(process.env.DEEPSEEK_MAX_TOKENS_BUILDER) || 8192,
    tutor: parseInt(process.env.DEEPSEEK_MAX_TOKENS_TUTOR) || 4096,
  },
  openai: parseInt(process.env.OPENROUTER_MAX_TOKENS) || 2000, // Default safe value
  gemini: {
    builder: parseInt(process.env.GEMINI_MAX_TOKENS_BUILDER) || 4096,
    tutor: parseInt(process.env.GEMINI_MAX_TOKENS_TUTOR) || 4096,
  },
};

// Initialize SDK clients
// Most providers use OpenRouter via OpenAI SDK, but OpenAI provider now uses Puter.js
// #region agent log
const hasOpenaiKey = !!PROVIDER_KEYS.openai;
// Puter.js doesn't use API key (User-Pays model), so openaiKeyLength is 0
const openaiKeyLength = typeof PROVIDER_KEYS.openai === 'string' ? PROVIDER_KEYS.openai.length : 0;
const openaiKeyFirstChars = typeof PROVIDER_KEYS.openai === 'string' ? PROVIDER_KEYS.openai.substring(0,10) : 'Puter.js (no key)';
debugLog({location:'server/index.js:97',message:'Before openaiClient init',data:{hasKey:hasOpenaiKey,keyLength:openaiKeyLength,firstChars:openaiKeyFirstChars},sessionId:'debug-session',runId:'run1',hypothesisId:'C'});
// #endregion

// OpenRouter client for anthropic, deepseek, gemini
const openaiClient = OPENROUTER_KEY_TRIMMED ? new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: OPENROUTER_KEY_TRIMMED,
  defaultHeaders: {
    'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://rlabs-studio.cloud',
    'X-Title': process.env.OPENROUTER_SITE_NAME || 'Nevra',
  },
}) : null;

// Puter.js API configuration for GPT-5-Nano
// Puter.js uses User-Pays model - no API key needed
// API endpoint: https://api.puter.com/v1/ai/chat (or similar)
const PUTER_API_BASE = process.env.PUTER_API_BASE || 'https://api.puter.com/v1';

// #region agent log
debugLog({location:'server/index.js:104',message:'After openaiClient init',data:{clientExists:!!openaiClient,baseURL:openaiClient?.baseURL||'N/A'},sessionId:'debug-session',runId:'run1',hypothesisId:'C'});
// #endregion

// Helper: Truncate history to fit within token limit
const truncateHistory = (history = [], maxMessages = 3) => {
  // Keep only the last N messages to reduce token usage
  return history.slice(-maxMessages);
};

const formatHistory = (history = []) =>
  history
    .map((msg) => ({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.parts?.[0]?.text ?? '',
    }))
    .filter((msg) => msg.content);

const buildOpenAIUserContent = (prompt, images = []) => {
  const content = [{ type: 'text', text: prompt }];
  images.forEach((img) => {
    content.push({
      type: 'image_url',
      image_url: { url: img },
    });
  });
  return content;
};


app.post('/api/generate', async (req, res) => {
  // #region agent log
  debugLog({location:'server/index.js:132',message:'/api/generate endpoint called',data:{provider:req.body?.provider,mode:req.body?.mode},sessionId:'debug-session',runId:'run1',hypothesisId:'F'});
  // #endregion
  
  // Ensure response is always sent, even on unexpected errors
  let responseSent = false;
  let provider = 'deepseek'; // Default to Mistral Devstral (free)
  let mode = 'builder';
  let prompt = '';
  
  const sendResponse = (status, data) => {
    if (!responseSent) {
      responseSent = true;
      return res.status(status).json(data);
    }
  };

  const body = req.body || {};
  prompt = body.prompt || '';
  const history = body.history || [];
  const systemPrompt = body.systemPrompt;
  provider = body.provider || 'deepseek'; // Default to Mistral Devstral (free)
  mode = body.mode || 'builder';
  const images = body.images || [];

  console.log(`[${provider}] /api/generate called`, { 
    hasPrompt: !!prompt, 
    hasSystemPrompt: !!systemPrompt, 
    mode, 
    historyLength: history?.length || 0,
    imagesCount: images?.length || 0
  });

  if (!prompt || !systemPrompt) {
    console.error(`[${provider}] Missing required fields:`, { hasPrompt: !!prompt, hasSystemPrompt: !!systemPrompt });
    return sendResponse(400, { error: 'Missing prompt or systemPrompt' });
  }

  if (!PROVIDER_KEYS[provider]) {
    // Provide more helpful error messages
    if (provider === 'openai') {
      // GPT-5-Nano uses Puter.js (User-Pays model, no API key needed)
      // Puter.js doesn't require API keys, so we just check if provider is enabled
      if (!PROVIDER_KEYS.openai) {
        return sendResponse(500, { 
          error: `Puter.js provider not configured. Provider "${provider}" uses Puter.js for GPT-5-Nano. No API key needed (User-Pays model).`,
        });
      }
    } else if (provider === 'anthropic' || provider === 'gemini') {
      // OpenRouter providers
      const envValue = process.env.OPENROUTER_API_KEY;
      const hasEnvButEmpty = envValue !== undefined && (!envValue || envValue.trim() === '');
      
      return sendResponse(500, { 
        error: `OpenRouter API key not configured. Provider "${provider}" uses OpenRouter. ${hasEnvButEmpty ? 'OPENROUTER_API_KEY exists but is empty. Please check your .env file.' : 'Please set OPENROUTER_API_KEY in your environment variables and restart the server.'}`,
        debug: process.env.NODE_ENV === 'development' ? {
          hasEnvVar: envValue !== undefined,
          isEmpty: hasEnvButEmpty,
          keyLength: envValue?.length || 0
        } : undefined
      });
    }
    return sendResponse(500, { error: `${provider} API key not configured` });
  }

  // Providers that support image input via OpenRouter
  const imageSupportedProviders = ['openai', 'gemini', 'anthropic', 'deepseek'];
  if (!imageSupportedProviders.includes(provider) && images.length) {
    return sendResponse(400, { error: `${provider} does not support image input. Use ${imageSupportedProviders.join(', ')} provider.` });
  }

  const controller = new AbortController();
  // Mistral Devstral can take longer, use 90 seconds for deepseek, 45 for others
  const timeoutDuration = provider === 'deepseek' ? 90_000 : 45_000;
  const timeout = setTimeout(() => controller.abort(), timeoutDuration);

  try {
    // Enhance system prompt for free models (Mistral Devstral and GPT OSS 20B) to ensure they follow NEVRA guidelines
    let enhancedSystemPrompt = systemPrompt;
    if (provider === 'deepseek') {
      if (mode === 'tutor') {
        // For tutor mode, ensure Mistral Devstral follows NEVRA Tutor guidelines
        enhancedSystemPrompt = systemPrompt + `

⚠️ IMPORTANT FOR MISTRAL DEVSTRAL IN TUTOR MODE:
- You are NEVRA TUTOR, a world-class AI Educator and Mentor
- Be patient, encouraging, and clear in your explanations
- Use Socratic questions, analogies, and step-by-step reasoning
- Help users achieve deep understanding, not just rote answers
- Format responses with bold for key concepts, code blocks for code, numbered steps for procedures
- Do NOT generate full applications in tutor mode; keep to snippets and explanations
- If images are provided, describe key elements and use them to answer questions
- Always be thorough and helpful in your analysis`;
      } else {
        // For builder mode, use existing guidelines
        enhancedSystemPrompt = systemPrompt + `

⚠️ IMPORTANT FOR MISTRAL DEVSTRAL:
- You MUST follow all NEVRA guidelines exactly as specified above
- Generate code that matches the exact format and structure required
- Use the same component patterns, styling approach, and architecture as other NEVRA providers
- Ensure your output is production-ready and follows all design system requirements
- Pay special attention to the code structure template and component patterns
- Always include proper error handling and React best practices`;
      }
    } else if (provider === 'anthropic' || provider === 'gemini') {
      // GPT OSS 20B (replaced Claude Sonnet) - same enhancements as Mistral Devstral
      if (mode === 'tutor') {
        enhancedSystemPrompt = systemPrompt + `

⚠️ IMPORTANT FOR GPT OSS 20B IN TUTOR MODE:
- You are NEVRA TUTOR, a world-class AI Educator and Mentor
- Be patient, encouraging, and clear in your explanations
- Use Socratic questions, analogies, and step-by-step reasoning
- Help users achieve deep understanding, not just rote answers
- Format responses with bold for key concepts, code blocks for code, numbered steps for procedures
- Do NOT generate full applications in tutor mode; keep to snippets and explanations
- If images are provided, describe key elements and use them to answer questions
- Always be thorough and helpful in your analysis`;
      } else {
        enhancedSystemPrompt = systemPrompt + `

⚠️ IMPORTANT FOR GPT OSS 20B:
- You MUST follow all NEVRA guidelines exactly as specified above
- Generate code that matches the exact format and structure required
- Use the same component patterns, styling approach, and architecture as other NEVRA providers
- Ensure your output is production-ready and follows all design system requirements
- Pay special attention to the code structure template and component patterns
- Always include proper error handling and React best practices`;
      }
    } else if (provider === 'openai') {
      // GPT-5-Nano via Puter.js - same enhancements
      if (mode === 'tutor') {
        enhancedSystemPrompt = systemPrompt + `

⚠️ IMPORTANT FOR GPT-5-NANO IN TUTOR MODE:
- You are NEVRA TUTOR, a world-class AI Educator and Mentor
- Be patient, encouraging, and clear in your explanations
- Use Socratic questions, analogies, and step-by-step reasoning
- Help users achieve deep understanding, not just rote answers
- Format responses with bold for key concepts, code blocks for code, numbered steps for procedures
- Do NOT generate full applications in tutor mode; keep to snippets and explanations
- If images are provided, describe key elements and use them to answer questions
- Always be thorough and helpful in your analysis`;
      } else {
        enhancedSystemPrompt = systemPrompt + `

⚠️ IMPORTANT FOR GPT-5-NANO:
- You MUST follow all NEVRA guidelines exactly as specified above
- Generate code that matches the exact format and structure required
- Use the same component patterns, styling approach, and architecture as other NEVRA providers
- Ensure your output is production-ready and follows all design system requirements
- Pay special attention to the code structure template and component patterns
- Always include proper error handling and React best practices`;
      }
    }
    
    const messagesBase = [
      { role: 'system', content: enhancedSystemPrompt },
      ...formatHistory(history),
    ];

    let content;

    switch (provider) {
      case 'openai': {
        // GPT-5-Nano via Puter.js API
        // Build messages for Puter.js API (OpenAI-compatible format)
        // messagesBase already has system and history, we just need to add user message
        const puterMessages = [...messagesBase];

        // Add user message with images if any
        if (images && images.length > 0) {
          // GPT-5-Nano supports images via OpenAI-compatible format
          const imageContents = images.map(img => ({
            type: 'image_url',
            image_url: { url: img }
          }));
          puterMessages.push({
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              ...imageContents
            ]
          });
        } else {
          puterMessages.push({
            role: 'user',
            content: prompt
          });
        }

        // Use configurable max_tokens
        const baseMaxTokens = MAX_TOKENS.openai;
        // Adjust temperature based on mode
        const temperature = mode === 'tutor' ? 0.7 : 0.5;

        try {
          // Puter.js API endpoint (OpenAI-compatible format)
          // Note: Puter.js uses User-Pays model, no API key needed
          const puterResponse = await fetch(`${PUTER_API_BASE}/ai/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // No Authorization header needed for Puter.js (User-Pays model)
            },
            body: JSON.stringify({
              model: MODELS.openai,
              messages: puterMessages,
              temperature: temperature,
              max_tokens: baseMaxTokens,
              stream: false,
            }),
            signal: controller.signal,
          });

          if (!puterResponse.ok) {
            const errorText = await puterResponse.text();
            let errorData;
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { error: errorText || puterResponse.statusText };
            }
            
            const errorMsg = errorData?.error?.message || errorData?.error || errorText || puterResponse.statusText;
            console.error(`[${provider}] Puter.js API error:`, errorMsg);
            
            return sendResponse(puterResponse.status || 500, {
              error: `Puter.js API Error (GPT-5-Nano): ${errorMsg}`,
              detail: errorData?.error || errorMsg,
            });
          }

          const puterData = await puterResponse.json();
          // Puter.js response format may vary, try multiple possible formats
          content = puterData.choices?.[0]?.message?.content || 
                   puterData.message?.content?.[0]?.text || 
                   puterData.message?.content || 
                   puterData.output_text || 
                   puterData.response || 
                   '';
          
          if (!content) {
            console.error(`[${provider}] No content in Puter.js response:`, puterData);
            return sendResponse(500, { 
              error: 'Puter.js API response missing content',
              detail: JSON.stringify(puterData)
            });
          }
          
          console.log(`[${provider}] Puter.js API success, content length: ${content.length}`);
        } catch (fetchErr) {
          const errorMsg = fetchErr?.message || String(fetchErr);
          console.error(`[${provider}] Puter.js API fetch error:`, errorMsg);
          
          // Check for timeout/abort
          if (fetchErr?.name === 'AbortError' || errorMsg.toLowerCase().includes('aborted') || errorMsg.toLowerCase().includes('timeout')) {
            return sendResponse(504, {
              error: `Puter.js API Error (GPT-5-Nano): Request timeout - The request took too long to complete. Please try again with a shorter prompt.`,
              detail: 'Request timeout'
            });
          }
          
          return sendResponse(500, {
            error: `Puter.js API Error (GPT-5-Nano): ${errorMsg}`,
            detail: errorMsg,
          });
        }
        
        break;
      }
      case 'anthropic':
      default: {
        // GPT OSS 20B (Free) via OpenRouter - replaced Claude Sonnet
        if (!openaiClient) {
          return sendResponse(500, { error: 'OpenRouter client not initialized' });
        }

        const messages = [
          ...messagesBase,
          { role: 'user', content: buildOpenAIUserContent(prompt, images) },
        ];

        // Use configurable max_tokens, with retry mechanism for credit errors
        const baseMaxTokens = mode === 'builder' ? MAX_TOKENS.anthropic.builder : MAX_TOKENS.anthropic.tutor;
        // Try with different max_tokens values if credit limit error occurs
        const maxTokensOptions = [baseMaxTokens, Math.floor(baseMaxTokens * 0.75), Math.floor(baseMaxTokens * 0.5), Math.floor(baseMaxTokens * 0.25)];
        let anthropicContent = null;
        let lastError = null;

        for (const maxTokens of maxTokensOptions) {
          try {
            const completion = await openaiClient.chat.completions.create({
              model: MODELS.anthropic,
              messages,
              // Adjust temperature based on mode: higher for tutor (more natural), lower for builder (more structured)
              temperature: mode === 'tutor' ? 0.7 : 0.5,
              max_tokens: maxTokens,
            }, {
              signal: controller.signal,
            });

            anthropicContent = completion.choices[0]?.message?.content;
            break; // Success, exit loop
          } catch (sdkErr) {
            const errorMsg = sdkErr?.error?.message || sdkErr?.message || String(sdkErr);
            lastError = sdkErr;
            
            // Check for prompt token limit error
            const isPromptTokenError = errorMsg.toLowerCase().includes('prompt tokens') || 
                                     errorMsg.toLowerCase().includes('prompt token limit');
            
            if (isPromptTokenError) {
              // Try with shorter history by truncating older messages
              console.log(`[${provider}] Prompt token limit hit, retrying with shorter history...`);
              
              // Truncate history to last 2 messages (roughly ~800 tokens)
              const truncatedHistory = history.slice(-2);
              const truncatedMessages = [
                { role: 'system', content: systemPrompt },
                ...formatHistory(truncatedHistory),
                { role: 'user', content: buildOpenAIUserContent(prompt, images) },
              ];
              
              try {
                const retryCompletion = await openaiClient.chat.completions.create({
                  model: MODELS.anthropic,
                  messages: truncatedMessages,
                  temperature: 0.5,
                  max_tokens: Math.floor(baseMaxTokens * 0.5), // Use half tokens as safety
                }, {
                  signal: controller.signal,
                });
                
                anthropicContent = retryCompletion.choices[0]?.message?.content;
                console.log(`[${provider}] Success with truncated history`);
                break; // Success, exit loop
              } catch (retryErr) {
                const retryErrorMsg = retryErr?.error?.message || retryErr?.message || String(retryErr);
                console.error(`[${provider}] Retry with truncated history also failed:`, retryErrorMsg);
                // Continue to return error
              }
            }
            
            // If it's a credit limit error, try with lower max_tokens
            if (errorMsg.toLowerCase().includes('credit') || errorMsg.toLowerCase().includes('afford')) {
              console.log(`[${provider}] Credit limit hit with ${maxTokens} tokens, retrying with lower value...`);
              continue; // Try next lower value
            }
            
            // If it's not a credit error, break and return error
            console.error(`[${provider}] SDK error:`, sdkErr);
            return sendResponse(sdkErr?.status || 500, {
              error: `OpenRouter API Error (GPT OSS 20B): ${errorMsg}`,
              detail: sdkErr?.error || errorMsg,
            });
          }
        }

        // If all attempts failed due to credits
        if (!anthropicContent && lastError) {
          const errorMsg = lastError?.error?.message || lastError?.message || String(lastError);
          return sendResponse(lastError?.status || 500, {
            error: `OpenRouter API Error (GPT OSS 20B): ${errorMsg}`,
            detail: lastError?.error || errorMsg,
          });
        }
        
        content = anthropicContent;
        break;
      }
      case 'deepseek': {
        // Mistral AI Devstral 2512 (free) via OpenRouter
        // #region agent log
        debugLog({location:'server/index.js:378',message:'DeepSeek handler entry',data:{openaiClientExists:!!openaiClient,providerKeyExists:!!PROVIDER_KEYS.deepseek,model:MODELS.deepseek,mode:mode},sessionId:'debug-session',runId:'run1',hypothesisId:'F'});
        // #endregion

        if (!openaiClient) {
          return sendResponse(500, { error: 'OpenRouter client not initialized' });
        }

        const messages = [
          ...messagesBase,
          { role: 'user', content: buildOpenAIUserContent(prompt, images) },
        ];

        // Use configurable max_tokens, with retry mechanism for credit errors
        const baseMaxTokens = mode === 'builder' ? MAX_TOKENS.deepseek.builder : MAX_TOKENS.deepseek.tutor;
        // Try with different max_tokens values if credit limit error occurs
        const maxTokensOptions = [baseMaxTokens, Math.floor(baseMaxTokens * 0.75), Math.floor(baseMaxTokens * 0.5), Math.floor(baseMaxTokens * 0.25)];
        let deepseekContent = null;
        let lastError = null;

        for (const maxTokens of maxTokensOptions) {
          try {
            // #region agent log
            debugLog({location:'server/index.js:398',message:'Before API call',data:{model:MODELS.deepseek,maxTokens:maxTokens,messagesCount:messages.length,apiKeyLength:typeof PROVIDER_KEYS.openai === 'string' ? PROVIDER_KEYS.openai.length : 0},sessionId:'debug-session',runId:'run1',hypothesisId:'D'});
            // #endregion

            const completion = await openaiClient.chat.completions.create({
              model: MODELS.deepseek,
              messages,
              // Adjust temperature based on mode: higher for tutor (more natural), lower for builder (more structured)
              temperature: mode === 'tutor' ? 0.7 : 0.3,
              max_tokens: maxTokens,
              top_p: 0.9, // Add top_p for better control
            }, {
              signal: controller.signal,
            });

            // #region agent log
            debugLog({location:'server/index.js:407',message:'API call success',data:{hasContent:!!completion.choices?.[0]?.message?.content},sessionId:'debug-session',runId:'run1',hypothesisId:'D'});
            // #endregion

            deepseekContent = completion.choices[0]?.message?.content;
            break; // Success, exit loop
          } catch (sdkErr) {
            // #region agent log
            const errorMsg = sdkErr?.error?.message || sdkErr?.message || String(sdkErr);
            const errorStatus = sdkErr?.status || sdkErr?.response?.status || 'unknown';
            const errorCode = sdkErr?.code || 'unknown';
            const fullError = JSON.stringify(sdkErr, Object.getOwnPropertyNames(sdkErr)).substring(0,500);
            debugLog({location:'server/index.js:410',message:'API call error caught',data:{errorMsg:errorMsg,status:errorStatus,code:errorCode,is401:errorStatus===401||errorMsg.toLowerCase().includes('401')||errorMsg.toLowerCase().includes('unauthorized'),fullError:fullError},sessionId:'debug-session',runId:'run1',hypothesisId:'E'});
            // #endregion

            lastError = sdkErr;
            
            // Check for abort/timeout error
            const isAbortError = sdkErr?.name === 'AbortError' || 
                               errorMsg.toLowerCase().includes('aborted') ||
                               errorMsg.toLowerCase().includes('timeout') ||
                               errorCode === 'ECONNABORTED';
            
            if (isAbortError) {
              console.error(`[${provider}] Request timeout/aborted after ${timeoutDuration/1000}s`);
              // Try one more time with shorter history if this is the first attempt
              if (maxTokens === baseMaxTokens) {
                console.log(`[${provider}] Retrying with shorter history due to timeout...`);
                const truncatedHistory = history.slice(-2);
                const truncatedMessages = [
                  { role: 'system', content: enhancedSystemPrompt },
                  ...formatHistory(truncatedHistory),
                  { role: 'user', content: buildOpenAIUserContent(prompt, images) },
                ];
                
                // Create new controller for retry
                const retryController = new AbortController();
                const retryTimeout = setTimeout(() => retryController.abort(), timeoutDuration);
                
                try {
                  const retryCompletion = await openaiClient.chat.completions.create({
                    model: MODELS.deepseek,
                    messages: truncatedMessages,
                    temperature: mode === 'tutor' ? 0.7 : 0.3, // Adjust based on mode
                    max_tokens: Math.floor(baseMaxTokens * 0.5),
                    top_p: 0.9,
                  }, {
                    signal: retryController.signal,
                  });
                  
                  clearTimeout(retryTimeout);
                  deepseekContent = retryCompletion.choices[0]?.message?.content;
                  console.log(`[${provider}] Success with retry after timeout`);
                  break; // Success, exit loop
                } catch (retryErr) {
                  clearTimeout(retryTimeout);
                  const retryErrorMsg = retryErr?.error?.message || retryErr?.message || String(retryErr);
                  console.error(`[${provider}] Retry after timeout also failed:`, retryErrorMsg);
                  // Continue to return timeout error
                }
              }
              
              // If retry failed or not attempted, return timeout error
              return sendResponse(504, {
                error: `OpenRouter API Error (Mistral Devstral): Request timeout - The request took too long to complete (${timeoutDuration/1000}s). Mistral Devstral can be slower for complex prompts. Please try again with a shorter prompt or switch to a different provider.`,
                detail: 'Request timeout - try with shorter prompt or different provider'
              });
            }
            
            // Check for prompt token limit error
            const isPromptTokenError = errorMsg.toLowerCase().includes('prompt tokens') || 
                                     errorMsg.toLowerCase().includes('prompt token limit');
            
            if (isPromptTokenError) {
              // Try with shorter history by truncating older messages
              console.log(`[${provider}] Prompt token limit hit, retrying with shorter history...`);
              
              // Truncate history to last 2 messages (roughly ~800 tokens)
              const truncatedHistory = history.slice(-2);
              const truncatedMessages = [
                { role: 'system', content: enhancedSystemPrompt },
                ...formatHistory(truncatedHistory),
                { role: 'user', content: buildOpenAIUserContent(prompt, images) },
              ];
              
              try {
                const retryCompletion = await openaiClient.chat.completions.create({
                  model: MODELS.deepseek,
                  messages: truncatedMessages,
                  temperature: mode === 'tutor' ? 0.7 : 0.3, // Adjust based on mode
                  max_tokens: Math.floor(baseMaxTokens * 0.5), // Use half tokens as safety
                  top_p: 0.9,
                }, {
                  signal: controller.signal,
                });
                
                deepseekContent = retryCompletion.choices[0]?.message?.content;
                console.log(`[${provider}] Success with truncated history`);
                break; // Success, exit loop
              } catch (retryErr) {
                const retryErrorMsg = retryErr?.error?.message || retryErr?.message || String(retryErr);
                console.error(`[${provider}] Retry with truncated history also failed:`, retryErrorMsg);
                // Continue to return error
              }
            }
            
            // If it's a credit limit error, try with lower max_tokens
            if (errorMsg.toLowerCase().includes('credit') || errorMsg.toLowerCase().includes('afford')) {
              console.log(`[${provider}] Credit limit hit with ${maxTokens} tokens, retrying with lower value...`);
              continue; // Try next lower value
            }
            
            // If it's not a credit error, break and return error
            console.error(`[${provider}] SDK error:`, sdkErr);
            // #region agent log
            debugLog({location:'server/index.js:456',message:'Returning error response',data:{status:sdkErr?.status||500,errorMsg:errorMsg,willReturn401:sdkErr?.status===401},sessionId:'debug-session',runId:'run1',hypothesisId:'E'});
            // #endregion
            return sendResponse(sdkErr?.status || 500, {
              error: `OpenRouter API Error (Mistral Devstral): ${errorMsg}`,
              detail: sdkErr?.error || errorMsg,
            });
          }
        }

        // If all attempts failed due to credits
        if (!deepseekContent && lastError) {
          const errorMsg = lastError?.error?.message || lastError?.message || String(lastError);
          // #region agent log
          debugLog({location:'server/index.js:515',message:'All attempts failed, returning error',data:{status:lastError?.status||500,errorMsg:errorMsg,willReturn401:lastError?.status===401},sessionId:'debug-session',runId:'run1',hypothesisId:'E'});
          // #endregion
          return sendResponse(lastError?.status || 500, {
            error: `OpenRouter API Error (Mistral Devstral): ${errorMsg}`,
            detail: lastError?.error || errorMsg,
          });
        }
        
        content = deepseekContent;
        break;
      }
      case 'gemini': {
        // GPT OSS 20B (Free) via OpenRouter - backward compatibility
        if (!openaiClient) {
          return sendResponse(500, { error: 'OpenRouter client not initialized' });
        }

        const messages = [
          ...messagesBase,
          { role: 'user', content: buildOpenAIUserContent(prompt, images) },
        ];

        // Use configurable max_tokens, with retry mechanism for credit errors
        const baseMaxTokens = mode === 'builder' ? MAX_TOKENS.gemini.builder : MAX_TOKENS.gemini.tutor;
        // Try with different max_tokens values if credit limit error occurs
        const maxTokensOptions = [baseMaxTokens, Math.floor(baseMaxTokens * 0.75), Math.floor(baseMaxTokens * 0.5), Math.floor(baseMaxTokens * 0.25)];
        let geminiContent = null;
        let lastError = null;

        for (const maxTokens of maxTokensOptions) {
          try {
            const completion = await openaiClient.chat.completions.create({
              model: MODELS.gemini,
              messages,
              // Adjust temperature based on mode: higher for tutor (more natural), lower for builder (more structured)
              temperature: mode === 'tutor' ? 0.7 : 0.5,
              max_tokens: maxTokens,
            }, {
              signal: controller.signal,
            });

            geminiContent = completion.choices[0]?.message?.content;
            break; // Success, exit loop
          } catch (sdkErr) {
            const errorMsg = sdkErr?.error?.message || sdkErr?.message || String(sdkErr);
            lastError = sdkErr;
            
            // Check for prompt token limit error
            const isPromptTokenError = errorMsg.toLowerCase().includes('prompt tokens') || 
                                     errorMsg.toLowerCase().includes('prompt token limit');
            
            if (isPromptTokenError) {
              // Try with shorter history by truncating older messages
              console.log(`[${provider}] Prompt token limit hit, retrying with shorter history...`);
              
              // Truncate history to last 2 messages (roughly ~800 tokens)
              const truncatedHistory = history.slice(-2);
              const truncatedMessages = [
                { role: 'system', content: systemPrompt },
                ...formatHistory(truncatedHistory),
                { role: 'user', content: buildOpenAIUserContent(prompt, images) },
              ];
              
              try {
                const retryCompletion = await openaiClient.chat.completions.create({
                  model: MODELS.gemini,
                  messages: truncatedMessages,
                  temperature: mode === 'tutor' ? 0.7 : 0.5, // Adjust based on mode
                  max_tokens: Math.floor(baseMaxTokens * 0.5), // Use half tokens as safety
                }, {
                  signal: controller.signal,
                });
                
                geminiContent = retryCompletion.choices[0]?.message?.content;
                console.log(`[${provider}] Success with truncated history`);
                break; // Success, exit loop
              } catch (retryErr) {
                const retryErrorMsg = retryErr?.error?.message || retryErr?.message || String(retryErr);
                console.error(`[${provider}] Retry with truncated history also failed:`, retryErrorMsg);
                // Continue to return error
              }
            }
            
            // If it's a credit limit error, try with lower max_tokens
            if (errorMsg.toLowerCase().includes('credit') || errorMsg.toLowerCase().includes('afford')) {
              console.log(`[${provider}] Credit limit hit with ${maxTokens} tokens, retrying with lower value...`);
              continue; // Try next lower value
            }
            
            // If it's not a credit error, break and return error
            console.error(`[${provider}] SDK error:`, sdkErr);
            return sendResponse(sdkErr?.status || 500, {
              error: `OpenRouter API Error (GPT OSS 20B): ${errorMsg}`,
              detail: sdkErr?.error || errorMsg,
            });
          }
        }

        // If all attempts failed due to credits
        if (!geminiContent && lastError) {
          const errorMsg = lastError?.error?.message || lastError?.message || String(lastError);
          return sendResponse(lastError?.status || 500, {
            error: `OpenRouter API Error (GPT OSS 20B): ${errorMsg}`,
            detail: lastError?.error || errorMsg,
          });
        }
        
        content = geminiContent;
        break;
      }
    }

    if (!content) {
      console.error(`[${provider}] No content in response`);
      return sendResponse(500, { 
        error: `${provider.toUpperCase()} response missing content`
      });
    }

    return sendResponse(200, { content });
  } catch (err) {
    // Clear timeout in case of error
    clearTimeout(timeout);
    
    // Log error details for debugging
    console.error(`[${provider}] Error in /api/generate:`, {
      name: err?.name,
      message: err?.message,
      stack: err?.stack?.substring(0, 500),
      provider,
      mode,
      hasPrompt: !!prompt
    });
    
    if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
      const providerName = provider === 'deepseek' ? 'Mistral Devstral' : 
                          provider === 'anthropic' ? 'GPT OSS 20B' :
                          provider === 'openai' ? 'GPT-5-Nano' : 
                          provider === 'gemini' ? 'GPT OSS 20B' : provider;
      return sendResponse(504, { 
        error: `OpenRouter API Error (${providerName}): Request timeout - The request took too long to complete. This may happen with complex prompts. Please try again with a shorter prompt or switch to a different provider.`,
        detail: 'Request timeout after 90 seconds (Mistral Devstral) or 45 seconds (other providers)'
      });
    }
    
    // Handle network errors
    if (err?.message?.includes('fetch') || err?.message?.includes('network') || err?.code === 'ECONNREFUSED') {
      return sendResponse(500, { 
        error: 'Network error - Unable to connect to API service. Please check your internet connection and try again.',
        detail: err?.message || 'Network connection failed'
      });
    }
    
    // Handle API key errors
    if (err?.message?.includes('401') || err?.message?.includes('unauthorized') || err?.message?.includes('Invalid API key')) {
      return sendResponse(500, { 
        error: `API authentication failed. Please verify your ${provider === 'deepseek' ? 'OPENROUTER_API_KEY' : 'API key'} is correct and has sufficient credits.`,
        detail: err?.message || 'Authentication error'
      });
    }
    
    // Generic error response
    const errorMessage = err?.message || err?.toString() || 'Unknown error occurred';
    return sendResponse(500, { 
      error: `API Error: ${errorMessage}`,
      detail: err?.stack?.substring(0, 500) || errorMessage
    });
  } finally {
    clearTimeout(timeout);
    
    // Ensure response is sent even if something went wrong
    // Check both responseSent flag and res.headersSent to avoid double response
    if (!responseSent && !res.headersSent) {
      console.error(`[${provider}] Warning: No response sent for /api/generate request`);
      try {
        responseSent = true;
        res.status(500).json({ 
          error: 'Internal server error - No response generated. Please check server logs.',
          detail: 'The server encountered an unexpected error and could not generate a response.'
        });
      } catch (finalErr) {
        // Only log if it's not the headers already sent error
        if (finalErr.code !== 'ERR_HTTP_HEADERS_SENT') {
          console.error('Failed to send final error response:', finalErr);
        }
      }
    }
  }
});

// Root ping for platform health checks
app.get('/', (_req, res) => {
  res.type('text/html').send('<h1>Nevra API OK</h1>');
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Deployment endpoint
app.post('/api/deploy', async (req, res) => {
  const { code, platform, projectName, apiToken } = req.body || {};

  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  if (!platform || !['vercel', 'netlify'].includes(platform)) {
    return res.status(400).json({ error: 'Platform must be vercel or netlify' });
  }

  try {
    if (platform === 'vercel') {
      const token = apiToken || process.env.VERCEL_TOKEN;
      if (!token) {
        return res.status(500).json({ error: 'Vercel token not configured. Add VERCEL_TOKEN to .env' });
      }

      // Create Vercel deployment
      // Note: Vercel API v13 requires different format - using simplified approach
      const vercelResponse = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectName || `nevra-${Date.now()}`,
          files: [
            {
              file: '/index.html',
              data: Buffer.from(code).toString('base64'),
            },
          ],
          projectSettings: {
            framework: null,
          },
        }),
      });

      if (!vercelResponse.ok) {
        const error = await vercelResponse.json();
        return res.status(500).json({ 
          error: `Vercel deployment failed: ${error.error?.message || JSON.stringify(error)}` 
        });
      }

      const deployment = await vercelResponse.json();
      return res.json({
        success: true,
        url: deployment.url ? `https://${deployment.url}` : undefined,
        deploymentId: deployment.id,
      });
    } else if (platform === 'netlify') {
      const token = apiToken || process.env.NETLIFY_TOKEN;
      if (!token) {
        return res.status(500).json({ error: 'Netlify token not configured. Add NETLIFY_TOKEN to .env' });
      }

      // Create Netlify site
      const siteResponse = await fetch('https://api.netlify.com/api/v1/sites', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectName || `nevra-${Date.now()}`,
        }),
      });

      if (!siteResponse.ok) {
        const error = await siteResponse.json();
        return res.status(500).json({ 
          error: `Netlify site creation failed: ${error.message || 'Unknown error'}` 
        });
      }

      const site = await siteResponse.json();

      // Deploy files using Netlify API
      const formData = new FormData();
      const blob = new Blob([code], { type: 'text/html' });
      formData.append('file', blob, 'index.html');

      const deployResponse = await fetch(`https://api.netlify.com/api/v1/sites/${site.id}/deploys`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!deployResponse.ok) {
        const error = await deployResponse.json();
        return res.status(500).json({ 
          error: `Netlify deployment failed: ${error.message || 'Unknown error'}` 
        });
      }

      const deployment = await deployResponse.json();
      return res.json({
        success: true,
        url: `https://${site.subdomain}.netlify.app`,
        deploymentId: deployment.id,
      });
    }
  } catch (error) {
    console.error('Deployment error:', error);
    return res.status(500).json({ 
      error: `Deployment failed: ${error.message || 'Unknown error'}` 
    });
  }
});

// Deployment status endpoint
app.post('/api/deploy/status', async (req, res) => {
  const { deploymentId, platform } = req.body || {};

  if (!deploymentId || !platform) {
    return res.status(400).json({ error: 'deploymentId and platform are required' });
  }

  try {
    if (platform === 'vercel') {
      const token = process.env.VERCEL_TOKEN;
      if (!token) {
        return res.status(500).json({ error: 'Vercel token not configured' });
      }

      const response = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return res.status(500).json({ error: 'Failed to get deployment status' });
      }

      const deployment = await response.json();
      return res.json({
        status: deployment.readyState === 'READY' ? 'ready' : 'building',
        url: deployment.url ? `https://${deployment.url}` : undefined,
      });
    } else if (platform === 'netlify') {
      const token = process.env.NETLIFY_TOKEN;
      if (!token) {
        return res.status(500).json({ error: 'Netlify token not configured' });
      }

      const response = await fetch(`https://api.netlify.com/api/v1/deploys/${deploymentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return res.status(500).json({ error: 'Failed to get deployment status' });
      }

      const deployment = await response.json();
      return res.json({
        status: deployment.state === 'ready' ? 'ready' : 'building',
        url: deployment.deploy_ssl_url,
      });
    }
  } catch (error) {
    console.error('Status check error:', error);
    return res.status(500).json({ error: 'Failed to get deployment status' });
  }
});

// GitHub OAuth Routes
app.get('/api/github/auth', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: 'GitHub Client ID not configured' });
  }
  
  const redirectUri = process.env.GITHUB_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/github/callback`;
  const scope = 'repo';
  const state = req.query.state || Math.random().toString(36).substring(7);
  
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;
  
  res.json({ authUrl, state });
});

app.get('/api/github/callback', async (req, res) => {
  const { code, state } = req.query;
  
  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/?github_error=no_code`);
  }
  
  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const redirectUri = process.env.GITHUB_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/github/callback`;
    
    if (!clientId || !clientSecret) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/?github_error=not_configured`);
    }
    
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    
    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/?github_error=${tokenData.error}`);
    }
    
    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/?github_token=${tokenData.access_token}&state=${state}`);
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/?github_error=server_error`);
  }
});

app.post('/api/github/repos', async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(401).json({ error: 'GitHub token required' });
  }
  
  try {
    const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch repositories' });
    }
    
    const repos = await response.json();
    res.json({ repos: repos.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      url: repo.html_url,
      defaultBranch: repo.default_branch,
    })) });
  } catch (error) {
    console.error('GitHub repos error:', error);
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

app.post('/api/github/create-repo', async (req, res) => {
  const { token, name, description, isPrivate } = req.body;
  
  if (!token || !name) {
    return res.status(400).json({ error: 'Token and repository name required' });
  }
  
  try {
    const response = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        description: description || '',
        private: isPrivate || false,
        auto_init: true,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json({ error: error.message || 'Failed to create repository' });
    }
    
    const repo = await response.json();
    res.json({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      url: repo.html_url,
      defaultBranch: repo.default_branch,
    });
  } catch (error) {
    console.error('GitHub create repo error:', error);
    res.status(500).json({ error: 'Failed to create repository' });
  }
});

app.post('/api/github/push', async (req, res) => {
  const { token, repo, files, commitMessage, branch } = req.body;
  
  if (!token || !repo || !files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'Token, repository, and files required' });
  }
  
  try {
    const repoFullName = typeof repo === 'string' ? repo : repo.fullName;
    const targetBranch = branch || 'main';
    const message = commitMessage || 'Update from NEVRA';
    
    // Get current tree SHA
    const refResponse = await fetch(`https://api.github.com/repos/${repoFullName}/git/ref/heads/${targetBranch}`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    
    let baseTreeSha;
    if (refResponse.ok) {
      const refData = await refResponse.json();
      const commitResponse = await fetch(`https://api.github.com/repos/${repoFullName}/git/commits/${refData.object.sha}`, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (commitResponse.ok) {
        const commitData = await commitResponse.json();
        baseTreeSha = commitData.tree.sha;
      }
    }
    
    // Create blobs for all files
    const blobPromises = files.map(async (file) => {
      const content = typeof file === 'string' ? file : file.content;
      const path = typeof file === 'string' ? 'index.html' : (file.path || file.name || 'index.html');
      const blobContent = Buffer.from(content).toString('base64');
      
      const blobResponse = await fetch(`https://api.github.com/repos/${repoFullName}/git/blobs`, {
        method: 'POST',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: blobContent,
          encoding: 'base64',
        }),
      });
      
      if (!blobResponse.ok) {
        throw new Error(`Failed to create blob for ${path}`);
      }
      
      const blobData = await blobResponse.json();
      return {
        path,
        mode: '100644',
        type: 'blob',
        sha: blobData.sha,
      };
    });
    
    const treeItems = await Promise.all(blobPromises);
    
    // Create tree
    const treeResponse = await fetch(`https://api.github.com/repos/${repoFullName}/git/trees`, {
      method: 'POST',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeItems,
      }),
    });
    
    if (!treeResponse.ok) {
      const error = await treeResponse.json();
      throw new Error(error.message || 'Failed to create tree');
    }
    
    const treeData = await treeResponse.json();
    
    // Get current commit SHA
    let parentSha = null;
    if (refResponse.ok) {
      const refData = await refResponse.json();
      parentSha = refData.object.sha;
    }
    
    // Create commit
    const commitResponse = await fetch(`https://api.github.com/repos/${repoFullName}/git/commits`, {
      method: 'POST',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        tree: treeData.sha,
        parents: parentSha ? [parentSha] : [],
      }),
    });
    
    if (!commitResponse.ok) {
      const error = await commitResponse.json();
      throw new Error(error.message || 'Failed to create commit');
    }
    
    const commitData = await commitResponse.json();
    
    // Update branch reference
    const updateRefResponse = await fetch(`https://api.github.com/repos/${repoFullName}/git/refs/heads/${targetBranch}`, {
      method: 'PATCH',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sha: commitData.sha,
      }),
    });
    
    if (!updateRefResponse.ok) {
      const error = await updateRefResponse.json();
      throw new Error(error.message || 'Failed to update branch');
    }
    
    res.json({
      success: true,
      url: `https://github.com/${repoFullName}`,
      commitSha: commitData.sha,
    });
  } catch (error) {
    console.error('GitHub push error:', error);
    res.status(500).json({ error: error.message || 'Failed to push to GitHub' });
  }
});

// Web Search endpoint (for Tutor mode)
app.post('/api/search', async (req, res) => {
  const { query, maxResults = 10 } = req.body || {};

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    // Use Tavily API for web search (free tier available)
    // Alternative: SerpAPI, Google Custom Search, or DuckDuckGo
    const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
    
    if (!TAVILY_API_KEY) {
      // Fallback: Use DuckDuckGo HTML scraping (no API key needed)
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      
      // For now, return mock results (implement actual search later)
      const mockResults = [
        {
          title: `Search results for: ${query}`,
          url: searchUrl,
          snippet: `Search results for "${query}". To enable real web search, add TAVILY_API_KEY to your environment variables.`,
          source: 'DuckDuckGo',
        },
      ];

      return res.json({
        query,
        results: mockResults.slice(0, maxResults),
        totalResults: mockResults.length,
        searchTime: 0.5,
      });
    }

    // Use Tavily API for real search
    const tavilyResponse = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        max_results: maxResults,
        search_depth: 'basic',
      }),
    });

    if (!tavilyResponse.ok) {
      throw new Error(`Tavily API error: ${tavilyResponse.statusText}`);
    }

    const tavilyData = await tavilyResponse.json();
    
    const results = (tavilyData.results || []).map((result) => ({
      title: result.title || 'No title',
      url: result.url || '',
      snippet: result.content || '',
      source: new URL(result.url || '').hostname,
      relevanceScore: result.score,
    }));

    res.json({
      query,
      results,
      totalResults: tavilyData.results?.length || 0,
      searchTime: tavilyData.query_time || 0,
    });
  } catch (error) {
    console.error('Web search error:', error);
    res.status(500).json({ 
      error: error?.message || 'Web search failed',
      query,
      results: [],
      totalResults: 0,
      searchTime: 0,
    });
  }
});

// Document parsing endpoint
app.post('/api/parse-document', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const filePath = file.path;
    const fileName = file.originalname;
    const fileExt = path.extname(fileName).toLowerCase();

    let content = '';
    let pages = 0;
    let metadata = {};

    try {
      // Parse based on file type
      if (fileExt === '.pdf') {
        // pdf-parse v2+ exports PDFParse class, create wrapper function
        const pdfParseModule = require('pdf-parse');
        const PDFParse = pdfParseModule.PDFParse;
        
        if (!PDFParse || typeof PDFParse !== 'function') {
          throw new Error(`pdf-parse PDFParse class not found. Please reinstall: npm install pdf-parse`);
        }
        
        const dataBuffer = fs.readFileSync(filePath);
        
        // Create wrapper function compatible with old API
        const pdfParseWrapper = async (buffer) => {
          const parser = new PDFParse({ data: buffer });
          await parser.load();
          
          const text = parser.getText();
          const info = parser.getInfo();
          
          // Get page count (try different properties)
          let numPages = 0;
          if (parser.numPages !== undefined) {
            numPages = parser.numPages;
          } else if (parser.pages && Array.isArray(parser.pages)) {
            numPages = parser.pages.length;
          } else if (info && info.Pages) {
            numPages = parseInt(info.Pages) || 0;
          }
          
          return {
            text: text || '',
            numpages: numPages,
            info: info || {},
          };
        };
        
        const pdfData = await pdfParseWrapper(dataBuffer);
        content = pdfData.text;
        pages = pdfData.numpages;
        metadata = {
          author: pdfData.info?.Author,
          createdAt: pdfData.info?.CreationDate,
          wordCount: content.split(/\s+/).length,
        };
      } else if (fileExt === '.docx') {
        const result = await mammoth.extractRawText({ path: filePath });
        content = result.value;
        const messages = result.messages;
        metadata = {
          wordCount: content.split(/\s+/).length,
        };
        // Estimate pages (rough estimate: 500 words per page)
        pages = Math.ceil(metadata.wordCount / 500);
      } else if (fileExt === '.txt' || fileExt === '.md') {
        content = fs.readFileSync(filePath, 'utf-8');
        metadata = {
          wordCount: content.split(/\s+/).length,
        };
        pages = Math.ceil(metadata.wordCount / 500);
      } else {
        // Try to read as text for unknown types
        try {
          content = fs.readFileSync(filePath, 'utf-8');
          metadata = {
            wordCount: content.split(/\s+/).length,
          };
          pages = Math.ceil(metadata.wordCount / 500);
        } catch (err) {
          return res.status(400).json({ 
            error: 'Unsupported file type',
            message: `File type ${fileExt} is not supported. Supported types: .pdf, .docx, .txt, .md`
          });
        }
      }

      // Clean up uploaded file
      fs.unlinkSync(filePath);

      // Split content into sections (by paragraphs or headings)
      const sections = [];
      const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);
      
      paragraphs.forEach((para, index) => {
        // Check if paragraph looks like a heading (short and might be all caps or have specific patterns)
        const isHeading = para.length < 100 && (para === para.toUpperCase() || para.match(/^#{1,6}\s/));
        
        if (isHeading || index === 0) {
          sections.push({
            title: isHeading ? para.trim() : `Section ${sections.length + 1}`,
            content: para.trim(),
            pageNumber: Math.floor(index / 10) + 1, // Rough page estimate
          });
        } else if (sections.length > 0) {
          // Append to last section
          sections[sections.length - 1].content += '\n\n' + para.trim();
        } else {
          sections.push({
            title: 'Introduction',
            content: para.trim(),
            pageNumber: 1,
          });
        }
      });

      res.json({
        title: fileName,
        content: content,
        pages: pages,
        sections: sections,
        metadata: metadata,
      });
    } catch (parseError) {
      // Clean up file on error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw parseError;
    }
  } catch (error) {
    console.error('Document parsing error:', error);
    res.status(500).json({ 
      error: 'Failed to parse document',
      message: error.message || 'An error occurred while parsing the document'
    });
  }
});

// Code execution endpoint (Python)
app.post('/api/execute-code', async (req, res) => {
  const { code, language = 'python' } = req.body || {};

  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  // Code execution not available in Vercel serverless environment
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return res.status(503).json({ 
      error: 'Code execution is not available in serverless environment. Please use a dedicated server for this feature.',
      output: '',
      executionTime: 0
    });
  }

  if (language !== 'python') {
    return res.status(400).json({ error: 'Only Python execution is supported on server' });
  }

  try {
    const startTime = Date.now();
    
    // Create temporary Python file
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFile = path.join(tempDir, `exec_${Date.now()}_${Math.random().toString(36).substring(7)}.py`);
    
    try {
      // Write code to temporary file
      fs.writeFileSync(tempFile, code, 'utf-8');
      
      // Execute Python code with timeout (10 seconds)
      const timeout = 10000; // 10 seconds
      const pythonCommand = process.env.PYTHON_COMMAND || 'python3';
      
      const { stdout, stderr } = await execAsync(`${pythonCommand} "${tempFile}"`, {
        timeout,
        maxBuffer: 1024 * 1024, // 1MB max output
      });
      
      const executionTime = Date.now() - startTime;
      
      // Clean up temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      
      if (stderr && stderr.trim()) {
        res.json({
          output: stdout || '',
          error: stderr.trim(),
          executionTime,
        });
      } else {
        res.json({
          output: stdout || '',
          error: null,
          executionTime,
        });
      }
    } catch (execError) {
      // Clean up temp file on error
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      
      const executionTime = Date.now() - startTime;
      
      // Handle different error types
      let errorMessage = 'Execution failed';
      if (execError.code === 'ETIMEDOUT' || execError.signal === 'SIGTERM' || execError.message?.includes('timeout')) {
        errorMessage = 'Execution timeout: Code took too long to execute (max 10 seconds)';
      } else if (execError.stderr) {
        errorMessage = execError.stderr.trim();
      } else if (execError.stdout) {
        // Sometimes Python errors are in stdout
        errorMessage = execError.stdout.trim();
      } else if (execError.message) {
        errorMessage = execError.message;
      } else if (execError.code === 'ENOENT') {
        errorMessage = 'Python not found. Please install Python 3 or set PYTHON_COMMAND environment variable.';
      }
      
      res.json({
        output: '',
        error: errorMessage,
        executionTime,
      });
    }
  } catch (error) {
    console.error('Code execution error:', error);
    res.status(500).json({ 
      error: error?.message || 'Code execution failed',
      output: '',
    });
  }
});

// Agentic Planning endpoint
app.post('/api/plan', async (req, res) => {
  const { prompt, provider = 'deepseek' } = req.body || {}; // Default to Mistral Devstral

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    // Use AI to generate a plan with enhanced instructions
    const planningPrompt = `You are an expert project planning assistant. Your task is to break down the user's request into a detailed, actionable task list with clear dependencies, priorities, and time estimates.

User Request: "${prompt}"

INSTRUCTIONS:
1. Analyze the request thoroughly and identify all required components
2. Break down into logical, sequential tasks that can be executed independently when dependencies are met
3. Each task should be specific, actionable, and have clear deliverables
4. Identify dependencies carefully - tasks should only depend on completed tasks
5. Estimate time realistically in minutes (5-60 minutes per task typically)
6. Assign priorities based on critical path and importance
7. Categorize tasks appropriately

TASK CATEGORIES:
- setup: Initial configuration, dependencies, project structure
- component: UI components, React components, visual elements
- styling: CSS, Tailwind, design system, themes
- logic: Business logic, state management, algorithms
- integration: API calls, external services, data fetching
- testing: Unit tests, integration tests, e2e tests
- deployment: Build, deployment configuration, hosting
- documentation: Code comments, README, user guides

PRIORITIES:
- high: Critical path, blocking other tasks, core functionality
- medium: Important but not blocking, enhances functionality
- low: Nice-to-have, polish, optimizations

Create a JSON response with this EXACT structure:
{
  "tasks": [
    {
      "id": "1",
      "title": "Clear, concise task title (verb + noun)",
      "description": "Detailed description of what needs to be done, including specific requirements and acceptance criteria",
      "status": "pending",
      "dependencies": ["task_id_if_any"],
      "estimatedTime": 15,
      "priority": "high",
      "category": "setup"
    }
  ],
  "estimatedTotalTime": 45
}

IMPORTANT:
- Always return valid JSON
- IDs should be sequential strings ("1", "2", "3", etc.)
- Dependencies array should reference task IDs
- estimatedTime should be in minutes (integer)
- estimatedTotalTime should be the sum of all task times
- Be thorough but practical - typically 3-10 tasks depending on complexity
- Consider the full development lifecycle from setup to deployment`;

    const messages = [
      { role: 'system', content: planningPrompt },
      { role: 'user', content: prompt },
    ];

    let content = '';
    
    // Create timeout promise (10 seconds for planning)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Planning request timeout')), 10000);
    });
    
    // Support all OpenRouter providers for planning with timeout
    let completion;
    try {
      if (provider === 'openai' && PROVIDER_KEYS.openai) {
        // GPT-5-Nano via Puter.js API for planning
        const planningPromise = fetch(`${PUTER_API_BASE}/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // No Authorization header needed for Puter.js
          },
          body: JSON.stringify({
            model: MODELS.openai,
            messages,
            temperature: 0.7,
            max_tokens: 2000,
            stream: false,
          }),
        }).then(res => {
          if (!res.ok) throw new Error(`Puter.js API error: ${res.statusText}`);
          return res.json();
        }).then(data => ({
          choices: [{ message: { content: data.choices?.[0]?.message?.content || data.message?.content?.[0]?.text || data.message?.content || data.output_text || '' } }]
        }));
        completion = await Promise.race([planningPromise, timeoutPromise]);
      } else if (provider === 'gemini' && openaiClient) {
        // GPT OSS 20B (Free) via OpenRouter
        const planningPromise = openaiClient.chat.completions.create({
          model: MODELS.gemini,
          messages,
          temperature: 0.7,
          max_tokens: 2000, // Reduced from 3000 for faster response
        });
        completion = await Promise.race([planningPromise, timeoutPromise]);
      } else if (provider === 'anthropic' && openaiClient) {
        // GPT OSS 20B (Free) via OpenRouter
        const planningPromise = openaiClient.chat.completions.create({
          model: MODELS.anthropic,
          messages,
          temperature: 0.7,
          max_tokens: 2000, // Reduced from 3000 for faster response
        });
        completion = await Promise.race([planningPromise, timeoutPromise]);
      } else if (provider === 'deepseek' && openaiClient) {
        // Mistral AI Devstral 2512 (free) via OpenRouter - DEFAULT
        const planningPromise = openaiClient.chat.completions.create({
          model: MODELS.deepseek,
          messages,
          temperature: 0.7,
          max_tokens: 2000, // Reduced from 3000 for faster response
        });
        completion = await Promise.race([planningPromise, timeoutPromise]);
      } else if (openaiClient) {
        // Default to Mistral Devstral (free)
        const planningPromise = openaiClient.chat.completions.create({
          model: MODELS.deepseek,
          messages,
          temperature: 0.7,
          max_tokens: 2000, // Reduced from 3000 for faster response
        });
        completion = await Promise.race([planningPromise, timeoutPromise]);
      } else {
        throw new Error('No AI client available');
      }
      content = completion.choices[0]?.message?.content || '';
    } catch (error) {
      if (error.message === 'Planning request timeout' || error.message?.includes('timeout')) {
        throw new Error('Planning timeout - request took too long');
      }
      throw error;
    }

    // Try to parse JSON from response
    let planData;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonContent = jsonMatch ? jsonMatch[1] : content;
      planData = JSON.parse(jsonContent.trim());
    } catch (parseError) {
      // If parsing fails, create a basic plan
      planData = {
        tasks: [
          {
            id: '1',
            title: 'Analyze Requirements',
            description: 'Understand the user requirements',
            status: 'pending',
            dependencies: [],
            priority: 'high',
            category: 'setup',
          },
          {
            id: '2',
            title: 'Generate Code',
            description: 'Create the application code',
            status: 'pending',
            dependencies: ['1'],
            priority: 'high',
            category: 'component',
          },
        ],
        estimatedTotalTime: 15,
      };
    }

    res.json({
      id: Date.now().toString(),
      prompt,
      tasks: planData.tasks || [],
      estimatedTotalTime: planData.estimatedTotalTime || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Planning error:', error);
    res.status(500).json({
      error: error?.message || 'Planning failed',
      id: Date.now().toString(),
      prompt,
      tasks: [],
      estimatedTotalTime: 0,
    });
  }
});

// Currency detection endpoint
app.get('/api/currency/detect', async (req, res) => {
  try {
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
    
    // Try to detect from IP
    let countryCode = 'US';
    try {
      const response = await fetch(`https://ipapi.co/${clientIp}/json/`);
      if (response.ok) {
        const data = await response.json();
        countryCode = data.country_code || 'US';
      }
    } catch (error) {
      console.warn('Failed to detect IP location:', error);
    }

    const currency = countryCode === 'ID' ? 'IDR' : 'USD';
    const exchangeRate = countryCode === 'ID' ? 16000 : 1;
    
    res.json({
      currency,
      countryCode,
      exchangeRate,
    });
  } catch (error) {
    console.error('Currency detection error:', error);
    res.json({
      currency: 'USD',
      countryCode: 'US',
      exchangeRate: 1,
    });
  }
});

// Payment checkout endpoint with Stripe
app.post('/api/payment/checkout', async (req, res) => {
  const { plan, currency, amount, userId } = req.body || {};

  if (!plan || plan !== 'premium') {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  if (!userId) {
    return res.status(401).json({ error: 'User ID is required. Please sign in.' });
  }

  if (!stripe || !process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe is not configured. Please contact support.' });
  }

  try {
    // Convert amount to cents (Stripe uses smallest currency unit)
    const amountInCents = Math.round(amount * 100);
    
    // Get base URL for success/cancel URLs
    const baseUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5173';
    
    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: 'NEVRA Premium Subscription',
              description: 'Unlimited AI tokens, all AI models, priority support, and more',
            },
            recurring: {
              interval: 'month',
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${baseUrl}/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing?canceled=true`,
      client_reference_id: userId, // Store user ID for webhook
      metadata: {
        userId,
        plan: 'premium',
      },
    });

    res.json({
      checkout_url: session.url,
      session_id: session.id,
    });
  } catch (error) {
    console.error('Payment checkout error:', error);
    res.status(500).json({
      error: error?.message || 'Payment checkout failed',
    });
  }
});

// Stripe webhook endpoint for handling subscription events
app.post('/api/payment/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('⚠️ STRIPE_WEBHOOK_SECRET not set. Webhook verification disabled.');
    return res.status(400).send('Webhook secret not configured');
  }

  if (!stripe) {
    return res.status(500).send('Stripe not initialized');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.userId;
        
        if (!userId) {
          console.error('No user ID found in checkout session');
          return res.status(400).json({ error: 'Missing user ID' });
        }

        // Update subscription status in Supabase
        if (supabase) {
          const { error } = await supabase
            .from('user_preferences')
            .upsert({
              user_id: userId,
              preferences: {
                subscription: 'premium',
                subscribed_at: new Date().toISOString(),
                stripe_customer_id: session.customer,
                stripe_subscription_id: session.subscription,
              },
            });

          if (error) {
            console.error('Error updating subscription:', error);
            return res.status(500).json({ error: 'Failed to update subscription' });
          }

          console.log(`✅ Subscription activated for user ${userId}`);
        } else {
          console.warn('⚠️ Supabase not configured. Subscription not updated in database.');
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        // Find user by Stripe customer ID and update subscription status
        if (supabase && customerId) {
          const { data: prefs } = await supabase
            .from('user_preferences')
            .select('user_id, preferences')
            .contains('preferences', { stripe_customer_id: customerId });

          if (prefs && prefs.length > 0) {
            const userId = prefs[0].user_id;
            const isActive = subscription.status === 'active' || subscription.status === 'trialing';
            
            const { error } = await supabase
              .from('user_preferences')
              .upsert({
                user_id: userId,
                preferences: {
                  ...prefs[0].preferences,
                  subscription: isActive ? 'premium' : 'free',
                  subscription_status: subscription.status,
                },
              });

            if (error) {
              console.error('Error updating subscription status:', error);
            } else {
              console.log(`✅ Subscription ${event.type} for user ${userId}: ${subscription.status}`);
            }
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Get subscription status endpoint
app.get('/api/payment/subscription', async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('preferences')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const subscription = data?.preferences?.subscription || 'free';
    const isActive = subscription === 'premium' || subscription === 'pro' || subscription === 'enterprise';

    res.json({
      subscription,
      isActive,
      subscribedAt: data?.preferences?.subscribed_at || null,
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

// Create customer portal session for managing subscription
app.post('/api/payment/portal', async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  if (!stripe || !supabase) {
    return res.status(500).json({ error: 'Stripe or database not configured' });
  }

  try {
    // Get user's Stripe customer ID from database
    const { data, error } = await supabase
      .from('user_preferences')
      .select('preferences')
      .eq('user_id', userId)
      .single();

    if (error || !data?.preferences?.stripe_customer_id) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const customerId = data.preferences.stripe_customer_id;
    const baseUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5173';

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/pricing`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Export app for Vercel serverless functions
export default app;

// Start server - Only if not in Vercel environment
if (process.env.VERCEL !== '1' && !process.env.VERCEL_ENV) {
  app.listen(PORT, () => {
    console.log(`API proxy listening on ${PORT}`);
  });
}
