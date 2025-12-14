// CommonJS version for Passenger compatibility
require('dotenv/config');
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8788;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
  })
);
app.use(express.json({ limit: '12mb' }));

const PROVIDER_KEYS = {
  groq: process.env.OPENROUTER_API_KEY, // Claude Opus 4.5 via OpenRouter
  deepseek: process.env.DEEPSEEK_API_KEY,
  openai: process.env.OPENROUTER_API_KEY, // GPT-5.2 via OpenRouter
};

const MODELS = {
  groq: 'anthropic/claude-opus-4.5', // Claude Opus 4.5 via OpenRouter
  deepseek: 'deepseek-chat',
  openai: 'openai/gpt-5.2-chat', // GPT-5.2 via OpenRouter
};

// Max tokens configuration (can be overridden via env)
const MAX_TOKENS = {
  groq: {
    builder: parseInt(process.env.GROQ_MAX_TOKENS_BUILDER) || 8192,
    tutor: parseInt(process.env.GROQ_MAX_TOKENS_TUTOR) || 4096,
  },
  deepseek: parseInt(process.env.DEEPSEEK_MAX_TOKENS) || 4096,
  openai: parseInt(process.env.OPENROUTER_MAX_TOKENS) || 2000, // Default safe value
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
  const {
    prompt,
    history = [],
    systemPrompt,
    provider = 'groq',
    mode = 'builder',
    images = [],
  } = req.body || {};

  if (!prompt || !systemPrompt) {
    return res.status(400).json({ error: 'Missing prompt or systemPrompt' });
  }

  if (!PROVIDER_KEYS[provider]) {
    return res.status(500).json({ error: `${provider} API key not configured` });
  }

  if (provider !== 'openai' && images.length) {
    return res
      .status(400)
      .json({ error: `${provider} does not support image input. Use openai provider.` });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const messagesBase = [
      { role: 'system', content: systemPrompt },
      ...formatHistory(history),
    ];

    let url;
    let headers;
    let body;

    switch (provider) {
      case 'openai': {
        // Use configurable max_tokens with retry mechanism for credit errors
        const baseMaxTokens = MAX_TOKENS.openai;
        const maxTokensOptions = [baseMaxTokens, Math.floor(baseMaxTokens * 0.75), Math.floor(baseMaxTokens * 0.5), Math.floor(baseMaxTokens * 0.25)];
        let content = null;
        let lastError = null;

        for (const maxTokens of maxTokensOptions) {
          try {
            const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${PROVIDER_KEYS.openai}`,
                'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://rlabs-studio.cloud',
                'X-Title': process.env.OPENROUTER_SITE_NAME || 'Nevra',
              },
              body: JSON.stringify({
                model: MODELS.openai,
                messages: [
                  ...messagesBase,
                  { role: 'user', content: buildOpenAIUserContent(prompt, images) },
                ],
                temperature: 0.5,
                max_tokens: maxTokens,
              }),
              signal: controller.signal,
            });

            if (!resp.ok) {
              const errorText = await resp.text();
              let errorData;
              try {
                errorData = JSON.parse(errorText);
              } catch {
                errorData = { error: { message: errorText } };
              }
              const errorMsg = errorData?.error?.message || errorText;
              lastError = { status: resp.status, message: errorMsg };
              
              // If it's a credit limit error, try with lower max_tokens
              if (errorMsg.toLowerCase().includes('credit') || errorMsg.toLowerCase().includes('afford')) {
                console.log(`[${provider}] Credit limit hit with ${maxTokens} tokens, retrying with lower value...`);
                continue; // Try next lower value
              }
              
              // If it's not a credit error, break and return error
              console.error(`[${provider}] API error:`, errorMsg);
              return res.status(resp.status).json({
                error: `OpenRouter API Error: ${errorMsg}`,
                detail: errorText.slice(0, 2000),
              });
            }

            const data = await resp.json();
            content = data?.choices?.[0]?.message?.content;
            if (content) {
              break; // Success, exit loop
            }
          } catch (fetchErr) {
            lastError = fetchErr;
            if (fetchErr.name === 'AbortError') {
              return res.status(504).json({ error: 'Upstream timeout' });
            }
            // If it's a credit error, continue to retry
            const errorMsg = fetchErr?.message || String(fetchErr);
            if (errorMsg.toLowerCase().includes('credit') || errorMsg.toLowerCase().includes('afford')) {
              console.log(`[${provider}] Credit limit hit, retrying...`);
              continue;
            }
            // Other errors, return immediately
            return res.status(500).json({
              error: `OpenRouter API Error: ${errorMsg}`,
              detail: fetchErr?.message || String(fetchErr),
            });
          }
        }

        // If all attempts failed due to credits
        if (!content && lastError) {
          const errorMsg = lastError?.message || String(lastError);
          return res.status(lastError?.status || 500).json({
            error: `OpenRouter API Error: ${errorMsg}`,
            detail: errorMsg,
          });
        }

        // Return content directly (skip normal fetch flow)
        return res.json({ content });
      }
      case 'deepseek': {
        url = 'https://api.deepseek.com/chat/completions';
        headers = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${PROVIDER_KEYS.deepseek}`,
        };
        body = {
          model: MODELS.deepseek,
          messages: [...messagesBase, { role: 'user', content: prompt }],
          temperature: 0.5,
          max_tokens: MAX_TOKENS.deepseek,
          stream: false,
        };
        break;
      }
      case 'groq':
      default: {
        // Use OpenRouter for Claude Opus 4.5 (groq provider)
        url = 'https://openrouter.ai/api/v1/chat/completions';
        headers = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${PROVIDER_KEYS.groq}`,
          'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://rlabs-studio.cloud',
          'X-Title': process.env.OPENROUTER_SITE_NAME || 'Nevra',
        };
        body = {
          model: MODELS.groq,
          messages: [...messagesBase, { role: 'user', content: prompt }],
          temperature: 0.5,
          max_tokens: mode === 'builder' ? MAX_TOKENS.groq.builder : MAX_TOKENS.groq.tutor,
        };
        break;
      }
      case 'deepseek': {
        url = 'https://api.deepseek.com/chat/completions';
        headers = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${PROVIDER_KEYS.deepseek}`,
        };
        body = {
          model: MODELS.deepseek,
          messages: [...messagesBase, { role: 'user', content: prompt }],
          temperature: 0.5,
          max_tokens: MAX_TOKENS.deepseek,
          stream: false,
        };
        break;
      }
    }

    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    // Read response body once (can only be read once)
    const responseText = await resp.text();
    const contentType = resp.headers.get('content-type') || '';

    // Log for debugging
    console.log(`[${provider}] Status: ${resp.status}, Content-Type: ${contentType}`);

    if (!resp.ok) {
      console.error(`[${provider}] Error response:`, responseText.slice(0, 500));
      return res
        .status(resp.status)
        .json({ 
          error: `${provider.toUpperCase()} API Error (${resp.status}): ${resp.statusText}`, 
          detail: responseText.slice(0, 2000) 
        });
    }

    // Handle non-JSON responses gracefully (HTML error pages, etc.)
    if (!contentType.includes('application/json')) {
      console.error(`[${provider}] Non-JSON response received:`, responseText.slice(0, 500));
      return res.status(500).json({ 
        error: `${provider.toUpperCase()} returned HTML instead of JSON. Check API key and credits.`,
        detail: responseText.slice(0, 2000) 
      });
    }

    // Parse JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseErr) {
      console.error(`[${provider}] JSON parse error:`, parseErr);
      return res.status(500).json({ 
        error: `${provider.toUpperCase()} returned invalid JSON`,
        detail: `Parse error: ${parseErr.message}. Response: ${responseText.slice(0, 500)}` 
      });
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      console.error(`[${provider}] No content in response:`, JSON.stringify(data).slice(0, 500));
      return res.status(500).json({ 
        error: `${provider.toUpperCase()} response missing content`,
        detail: JSON.stringify(data).slice(0, 1000) 
      });
    }

    return res.json({ content });
  } catch (err) {
    if (err?.name === 'AbortError') {
      return res.status(504).json({ error: 'Upstream timeout' });
    }
    console.error('Proxy error', err);
    return res.status(500).json({ error: 'Proxy error', detail: err?.message });
  } finally {
    clearTimeout(timeout);
  }
});

// Root ping for platform health checks
app.get('/', (_req, res) => {
  res.type('text/html').send('<h1>Nevra API OK</h1>');
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Start server - Passenger will handle it automatically
app.listen(PORT, () => {
  console.log(`API proxy listening on ${PORT}`);
});

module.exports = app;
