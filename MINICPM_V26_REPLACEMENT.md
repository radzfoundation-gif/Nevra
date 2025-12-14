# 🔄 Penggantian GPT-5.2 dengan MiniCPM V2.6 (Ollama API)

## ✅ Perubahan yang Telah Dilakukan

### 1. **Model Configuration**

#### `server/index.js`
- ✅ `MODELS.openai`: Diubah dari `'openai/gpt-5.2-chat'` menjadi `'openbmb/minicpm-v2.6'`
- ✅ Provider key: Menggunakan `OLLAMA_API_KEY` (default: `66a8951cedaf45739c6e38410679ca77.SPlUv5WjlyWgDzrbZaSd3NAv`)
- ✅ API Base URL: `OLLAMA_API_BASE` (default: `https://api.ollama.com/v1`)

### 2. **API Client Configuration**

#### `server/index.js`
- ✅ **Ollama API Client**: Handler khusus untuk MiniCPM V2.6 menggunakan Ollama API
- ✅ **OpenAI-compatible format**: Menggunakan format yang kompatibel dengan OpenAI API
- ✅ **Image support**: Mendukung image input via multimodal format
- ✅ **Error handling**: Comprehensive error handling untuk Ollama API

### 3. **UI Updates**

#### `components/ui/ProviderSelector.tsx`
- ✅ Provider name diubah dari `'GPT-5.2'` menjadi `'MiniCPM V2.6'`
- ✅ Tetap menggunakan icon Brain dan color green-400

### 4. **Error Messages**

#### `lib/ai.ts`
- ✅ Semua error messages untuk `openai` provider diupdate:
  - Provider name: `'MiniCPM V2.6'`
  - Error references: `'Ollama API Error (MiniCPM V2.6)'`

#### `server/index.js`
- ✅ Semua error messages diupdate ke `'MiniCPM V2.6'`
- ✅ Error handling khusus untuk Ollama API

### 5. **System Prompt Enhancement**

#### `server/index.js`
- ✅ Enhanced system prompt untuk MiniCPM V2.6:
  - **Tutor Mode**: Prompt khusus untuk NEVRA Tutor dengan guidelines yang jelas
  - **Builder Mode**: Prompt untuk code generation dengan best practices

### 6. **Temperature Configuration**

#### `server/index.js`
- ✅ Temperature adjustment untuk MiniCPM V2.6:
  - **Tutor Mode**: `0.7` (lebih natural, conversational)
  - **Builder Mode**: `0.5` (lebih structured, consistent)

### 7. **Planning Endpoint**

#### `server/index.js` - `/api/plan`
- ✅ Support untuk MiniCPM V2.6 di planning endpoint
- ✅ Menggunakan Ollama API untuk planning

---

## 📋 Environment Variables

### Backend `.env`
```bash
# Ollama API Key (required for MiniCPM V2.6)
OLLAMA_API_KEY=66a8951cedaf45739c6e38410679ca77.SPlUv5WjlyWgDzrbZaSd3NAv

# Ollama API Base URL (optional, default: https://api.ollama.com/v1)
OLLAMA_API_BASE=https://api.ollama.com/v1

# OpenRouter API Key (for other providers)
OPENROUTER_API_KEY=sk-or-...
```

**Note**: API key sudah di-set sebagai default di code, tapi disarankan untuk set di `.env` file untuk security.

---

## 🎯 Features MiniCPM V2.6

### ✅ Keunggulan
- **Free/Open Source** - Model open source yang powerful
- **Vision Support** - Mendukung image input via multimodal format
- **Optimized for Tutor** - Temperature 0.7 untuk responses yang lebih natural
- **Comprehensive Guidelines** - System prompt khusus untuk tutor mode
- **Ollama API** - Menggunakan Ollama API endpoint

### ⚙️ Konfigurasi
- **Model**: `openbmb/minicpm-v2.6` (via Ollama API)
- **Temperature**: 
  - Tutor Mode: `0.7`
  - Builder Mode: `0.5`
- **Max Tokens**: 2000 (configurable via `OPENROUTER_MAX_TOKENS` atau `MAX_TOKENS.openai`)
- **Timeout**: 45 seconds (standard)
- **API Endpoint**: `https://api.ollama.com/v1/chat/completions` (configurable via `OLLAMA_API_BASE`)

---

## 🔄 Flow MiniCPM V2.6

```
User Input → ChatInterface → generateCode(mode, provider='openai') 
→ API /api/generate → Enhanced System Prompt (TUTOR_PROMPT + MiniCPM Guidelines)
→ Ollama API → MiniCPM V2.6 (temperature: 0.7 for tutor, 0.5 for builder)
→ Response Processing → Extract Text → Display in Chat
```

---

## 📝 Catatan Penting

1. **MiniCPM V2.6 menggunakan Ollama API** - Bukan OpenRouter
2. **API Key sudah di-set sebagai default** - Tapi disarankan set di `.env` untuk security
3. **Optimized for Tutor** - System prompt dan temperature khusus
4. **Image support** - Mendukung image input via multimodal format
5. **OpenAI-compatible format** - Menggunakan format yang kompatibel dengan OpenAI API

---

## 🐛 Troubleshooting

### Jika MiniCPM V2.6 tidak bekerja:
1. ✅ Pastikan `OLLAMA_API_KEY` sudah di-set di backend `.env` (atau menggunakan default)
2. ✅ Check `OLLAMA_API_BASE` jika menggunakan custom endpoint
3. ✅ Restart backend server setelah mengubah environment variables
4. ✅ Check console logs untuk error details
5. ✅ Verify model `openbmb/minicpm-v2.6` tersedia di Ollama service

### Jika API endpoint berbeda:
- Set `OLLAMA_API_BASE` di `.env` dengan endpoint yang benar
- Contoh: `OLLAMA_API_BASE=https://your-ollama-endpoint.com/v1`

### Error Handling:
- Network errors: Automatic retry dengan shorter history
- Timeout errors: 45 seconds dengan clear error message
- API errors: Detailed error messages dengan suggestions

---

## ✨ Hasil Akhir

✅ GPT-5.2 **diganti** dengan MiniCPM V2.6 (Ollama API)
✅ **Optimized untuk NEVRA Tutor** dengan system prompt dan temperature khusus
✅ **API Key configured** - Default key sudah di-set, bisa override via env
✅ **Fully configured** - Semua endpoints dan functions sudah updated
✅ **Error handling** - Comprehensive error handling untuk Ollama API
✅ **Image support** - Mendukung image input via multimodal format

---

## 🔍 Files Modified

1. `server/index.js` - Model configuration, Ollama API handler, error messages, system prompts
2. `lib/ai.ts` - Error messages, provider names
3. `components/ui/ProviderSelector.tsx` - Provider name di UI
4. `components/pages/ChatInterface.tsx` - Provider name references

---

## ✅ Testing Checklist

- [ ] Test tutor mode dengan MiniCPM V2.6
- [ ] Test builder mode dengan MiniCPM V2.6
- [ ] Verify error messages menampilkan "MiniCPM V2.6"
- [ ] Check temperature settings (0.7 untuk tutor, 0.5 untuk builder)
- [ ] Verify Ollama API endpoint accessible
- [ ] Test error handling dan retry mechanisms
- [ ] Test image input support
- [ ] Verify API key dari environment variable atau default
