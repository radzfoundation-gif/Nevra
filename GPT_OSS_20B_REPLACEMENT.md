# 🔄 Penggantian Claude Sonnet dengan GPT OSS 20B (Free)

## ✅ Perubahan yang Telah Dilakukan

### 1. **Model Configuration**

#### `server/index.js`
- ✅ `MODELS.anthropic`: Diubah dari `'anthropic/claude-sonnet-4.5'` menjadi `'openai/gpt-oss-20b:free'`
- ✅ `MODELS.gemini`: Diubah dari `'anthropic/claude-sonnet-4.5'` menjadi `'openai/gpt-oss-20b:free'` (backward compatibility)
- ✅ Provider keys tetap menggunakan `OPENROUTER_API_KEY` yang sama

### 2. **UI Updates**

#### `components/ui/ProviderSelector.tsx`
- ✅ Provider name diubah dari `'Claude Sonnet 4.5'` menjadi `'GPT OSS 20B'`
- ✅ Tetap menggunakan icon dan color yang sama (orange-400)

### 3. **Error Messages**

#### `lib/ai.ts`
- ✅ Semua error messages untuk `anthropic` dan `gemini` provider diupdate:
  - Error title: `'GPT OSS 20B Error'`
  - Model reference: `'openai/gpt-oss-20b:free'`
  - Provider name di semua error messages: `'GPT OSS 20B'`

#### `server/index.js`
- ✅ Semua error messages diupdate:
  - `'OpenRouter API Error (GPT OSS 20B)'`
  - Provider name di timeout errors: `'GPT OSS 20B'`

### 4. **System Prompt Enhancement**

#### `server/index.js`
- ✅ Enhanced system prompt untuk GPT OSS 20B (sama seperti Mistral Devstral):
  - **Tutor Mode**: Prompt khusus untuk NEVRA Tutor dengan guidelines yang jelas
  - **Builder Mode**: Prompt untuk code generation dengan best practices

### 5. **Temperature Configuration**

#### `server/index.js`
- ✅ Temperature adjustment untuk GPT OSS 20B:
  - **Tutor Mode**: `0.7` (lebih natural, conversational)
  - **Builder Mode**: `0.5` (lebih structured, consistent)
- ✅ Applied di semua retry mechanisms

### 6. **Planning Endpoint**

#### `server/index.js` - `/api/plan`
- ✅ Support untuk GPT OSS 20B di planning endpoint
- ✅ Comments updated untuk reflect model change

---

## 📋 Model Configuration

### Before (Claude Sonnet)
```javascript
anthropic: 'anthropic/claude-sonnet-4.5'
gemini: 'anthropic/claude-sonnet-4.5'
```

### After (GPT OSS 20B)
```javascript
anthropic: 'openai/gpt-oss-20b:free'  // Free model via OpenRouter
gemini: 'openai/gpt-oss-20b:free'     // Free model via OpenRouter
```

---

## 🎯 Features

### ✅ Keunggulan GPT OSS 20B
- **Free** - Tidak memerlukan credits (model gratis via OpenRouter)
- **OpenRouter** - Menggunakan API key yang sama (`OPENROUTER_API_KEY`)
- **Optimized for Tutor** - Temperature 0.7 untuk responses yang lebih natural
- **Comprehensive Guidelines** - System prompt khusus untuk tutor mode
- **Error Handling** - Retry mechanisms dengan shorter history jika timeout

### ⚙️ Konfigurasi
- **Model**: `openai/gpt-oss-20b:free` (via OpenRouter)
- **Temperature**: 
  - Tutor Mode: `0.7`
  - Builder Mode: `0.5`
- **Max Tokens**: 
  - Builder: 8192 (configurable via `ANTHROPIC_MAX_TOKENS_BUILDER`)
  - Tutor: 4096 (configurable via `ANTHROPIC_MAX_TOKENS_TUTOR`)
- **Timeout**: 45 seconds (standard untuk OpenRouter providers)

---

## 🔄 Provider Mapping

| Provider ID | Model | Status | Notes |
|------------|-------|--------|-------|
| `anthropic` | `openai/gpt-oss-20b:free` | ✅ Free | Replaced Claude Sonnet |
| `gemini` | `openai/gpt-oss-20b:free` | ✅ Free | Backward compatibility |
| `deepseek` | `mistralai/devstral-2512:free` | ✅ Free | Default provider |
| `openai` | `openai/gpt-5.2-chat` | 💰 Premium | Requires credits |

---

## 📝 Catatan Penting

1. **GPT OSS 20B adalah FREE** - Tidak memerlukan OpenRouter credits
2. **Menggunakan OpenRouter API** - Sama seperti provider lain
3. **Optimized for Tutor** - System prompt dan temperature khusus
4. **Backward Compatible** - Provider ID `anthropic` dan `gemini` tetap sama
5. **Error Messages Updated** - Semua referensi ke Claude Sonnet sudah diganti

---

## 🐛 Troubleshooting

### Jika GPT OSS 20B tidak bekerja:
1. ✅ Pastikan `OPENROUTER_API_KEY` sudah di-set di backend `.env`
2. ✅ Restart backend server setelah mengubah environment variables
3. ✅ Check console logs untuk error details
4. ✅ Verify model `openai/gpt-oss-20b:free` tersedia di OpenRouter

### Model Availability:
- Model `openai/gpt-oss-20b:free` harus tersedia di OpenRouter
- Jika model tidak tersedia, cek OpenRouter dashboard untuk model yang tersedia
- Alternatif: Gunakan Mistral Devstral (`deepseek`) yang juga free

---

## ✨ Hasil Akhir

✅ Claude Sonnet 4.5 **diganti** dengan GPT OSS 20B (Free)
✅ **Optimized untuk NEVRA Tutor** dengan system prompt dan temperature khusus
✅ **Free** - Tidak memerlukan credits
✅ **Fully configured** - Semua endpoints dan functions sudah updated
✅ **Error handling** - Comprehensive retry mechanisms
✅ **Backward compatible** - Provider ID tetap sama (`anthropic`, `gemini`)

---

## 🔍 Files Modified

1. `server/index.js` - Model configuration, error messages, system prompts
2. `lib/ai.ts` - Error messages, provider names
3. `components/ui/ProviderSelector.tsx` - Provider name di UI
4. `components/pages/ChatInterface.tsx` - Provider name references

---

## ✅ Testing Checklist

- [ ] Test tutor mode dengan GPT OSS 20B
- [ ] Test builder mode dengan GPT OSS 20B
- [ ] Verify error messages menampilkan "GPT OSS 20B"
- [ ] Check temperature settings (0.7 untuk tutor, 0.5 untuk builder)
- [ ] Verify model `openai/gpt-oss-20b:free` accessible via OpenRouter
- [ ] Test error handling dan retry mechanisms
