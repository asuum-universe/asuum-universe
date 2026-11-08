/**
 * SECURE AI ROUTER — HARDENED PRODUCTION BUILD
 * ✅ Imports from shared providers.ts (single source of truth)
 * ✅ All error messages sanitized (no key leaks)
 * ✅ Client-side rate limiting per provider
 * ✅ Model blacklist for chat-only filtering
 * ✅ Language enforcement with triple-layer protection
 * ✅ No silent fallback when specific provider selected
 */
import { loadApiKey, getAllSavedProviders } from './crypto';
import { PROVIDER_REGISTRY, detectProviderFromApiKey, correctUrl } from './providers';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface RouterResponse {
  text: string;
  provider: string;
  model: string;
}

// ============================================================
// RATE LIMITER — Prevent abuse per provider
// ============================================================
const rateLimitMap: Record<string, { count: number; resetAt: number }> = {};
const RATE_LIMIT_MAX = 15; // requests per window
const RATE_LIMIT_WINDOW = 60000; // 1 minute

function checkRateLimit(providerId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap[providerId];
  if (!entry || now > entry.resetAt) {
    rateLimitMap[providerId] = { count: 1, resetAt: now + RATE_LIMIT_WINDOW };
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// ============================================================
// URL RESOLUTION — Uses shared providers.ts
// ============================================================
export function resolveBaseUrl(providerId: string, apiKey: string): string | null {
  // 1. Detect from key prefix
  const detected = detectProviderFromApiKey(apiKey);
  if (detected) return detected.baseUrl;

  // 2. Custom provider config from localStorage
  const keysToTry = [
    'asuum_custom_' + providerId,
    providerId.startsWith('custom_') ? 'asuum_custom_' + providerId.slice(7) : '',
  ].filter(Boolean);

  for (const sk of keysToTry) {
    try {
      const raw = localStorage.getItem(sk as string);
      if (raw) {
        const cfg = JSON.parse(raw);
        if (cfg.baseUrl) return correctUrl(cfg.baseUrl);
      }
    } catch {}
  }

  // 3. Full scan
  for (let i = 0; i < localStorage.length; i++) {
    const lsKey = localStorage.key(i);
    if (!lsKey || !lsKey.startsWith('asuum_custom_')) continue;
    try {
      const raw = localStorage.getItem(lsKey);
      if (!raw) continue;
      const cfg = JSON.parse(raw);
      if (cfg.baseUrl) return correctUrl(cfg.baseUrl);
    } catch {}
  }

  return null;
}

// ============================================================
// MODEL CACHE + FILTERING
// ============================================================
const modelCache: Record<string, string> = {};

const MODEL_BLACKLIST = [
  /prompt-guard/i, /guardrail/i, /embedding/i, /whisper/i,
  /tts/i, /dall-e/i, /image/i, /audio/i, /moderation/i,
  /text-embedding/i, /rerank/i, /translate/i, /safety/i,
  /classifier/i, /tokenize/i, /detoxify/i, /vision/i,
  /speech/i, /transcribe/i, /synthesize/i,
];

function isChatModel(id: string): boolean {
  return !MODEL_BLACKLIST.some(p => p.test(id));
}

// ============================================================
// LANGUAGE DETECTION
// ============================================================
function detectUserLanguage(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role !== 'user') continue;
    const text = messages[i].content.replace(/\[LANGUAGE:\s*\w+\]\s*/gi, '').trim();
    if (!text || text.length === 0) continue;
    const len = text.length;
    const counts: Record<string, number> = {
      Arabic: (text.match(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length,
      Hindi: (text.match(/[\u0900-\u097F\uA8E0-\uA8FF]/g) || []).length,
      Chinese: (text.match(/[\u4E00-\u9FFF\u3400-\u4DBF]/g) || []).length,
      Japanese: (text.match(/[\u3040-\u309F\u30A0-\u30FF]/g) || []).length,
      Korean: (text.match(/[\uAC00-\uD7AF\u1100-\u11FF]/g) || []).length,
      English: (text.match(/[a-zA-Z]/g) || []).length,
    };
    let best = 'English', bestC = 0;
    for (const [lang, c] of Object.entries(counts)) {
      if (c > len * 0.25 && c > bestC) { best = lang; bestC = c; }
    }
    return best;
  }
  return 'English';
}

// ============================================================
// UNIVERSAL MODEL PARSER
// ============================================================
function extractModelIds(data: any): string[] {
  const ids: string[] = [];
  function search(obj: any, depth: number) {
    if (depth > 4 || !obj) return;
    if (Array.isArray(obj)) { obj.forEach(item => search(item, depth + 1)); return; }
    if (typeof obj === 'object') {
      for (const field of ['id', 'name', 'model', 'modelId', 'model_id']) {
        if (typeof obj[field] === 'string' && obj[field].length > 2) {
          let val = obj[field].replace(/^models\//, '').replace(/^model\//, '');
          if (val.length > 2 && !ids.includes(val)) ids.push(val);
        }
      }
      Object.values(obj).forEach(v => search(v, depth + 1));
    }
  }
  search(data, 0);

  return [...new Set(ids)]
    .filter(id => !id.includes('://') && !id.includes(' ') && id.length <= 100 && isChatModel(id))
    .sort((a, b) => {
      const score = (s: string) => {
        if (/chat|instruct|instant|flash/i.test(s)) return 0;
        if (/mini|small|8b|7b|9b/i.test(s)) return 1;
        if (/70b|405b|pro/i.test(s)) return 2;
        return 3;
      };
      return score(a) - score(b);
    });
}

// ============================================================
// FETCH MODELS
// ============================================================
export async function fetchModelsForProvider(providerId: string): Promise<string[]> {
  let apiKey: string | null = null;
  try { apiKey = await loadApiKey(providerId); } catch { return []; }
  if (!apiKey) return [];

  const baseUrl = resolveBaseUrl(providerId, apiKey);
  if (!baseUrl) return [];

  const cacheKey = providerId + ':' + apiKey.slice(0, 8);
  if (modelCache[cacheKey + ':list']) {
    return JSON.parse(modelCache[cacheKey + ':list']);
  }

  try {
    const res = await fetch(baseUrl + '/models', {
      headers: { 'Authorization': 'Bearer ' + apiKey },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const models = extractModelIds(data);
    modelCache[cacheKey + ':list'] = JSON.stringify(models);
    setTimeout(() => { delete modelCache[cacheKey + ':list']; }, 300000);
    return models;
  } catch {
    return [];
  }
}

// ============================================================
// TRY CHAT — SANITIZED ERRORS + RATE LIMITING
// ============================================================
async function tryChat(
  baseUrl: string,
  model: string,
  apiKey: string,
  messages: ChatMessage[],
  providerId: string
): Promise<string> {
  // Rate limit check
  if (!checkRateLimit(providerId)) {
    throw new Error('Rate limit exceeded. Please wait a moment.');
  }

  const lang = detectUserLanguage(messages);

  const systemPrompt = `CRITICAL INSTRUCTION: You MUST respond ONLY in ${lang}. This is NON-NEGOTIABLE. Never use Arabic, Chinese, or any other language unless the user explicitly writes in that language. You are Asuum AI assistant. Be concise and accurate.`;

  const taggedMessages = messages.map((msg, idx) => {
    if (msg.role === 'user' && idx === messages.length - 1) {
      const clean = msg.content.replace(/\[LANGUAGE:\s*\w+\]\s*/gi, '');
      return { ...msg, content: `[LANGUAGE:${lang}] ${clean}` };
    }
    return msg;
  });

  const fullMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...taggedMessages,
  ];

  const res = await fetch(baseUrl + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      model,
      messages: fullMessages,
      max_tokens: 2048,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    // ✅ SANITIZED: Never include raw response body (may contain keys)
    const status = res.status;
    if (status === 401) throw new Error(`${model}: Invalid API key`);
    if (status === 402) throw new Error(`${model}: Insufficient balance`);
    if (status === 429) throw new Error(`${model}: Rate limit exceeded`);
    if (status === 403) throw new Error(`${model}: Access denied`);
    if (status === 404) throw new Error(`${model}: Model not found`);
    throw new Error(`${model}: Request failed (${status})`);
  }

  const data = await res.json();
  return (data.choices?.[0]?.message?.content) || '';
}

// ============================================================
// ROUTE CHAT REQUEST — NO SILENT FALLBACK
// ============================================================
export async function routeChatRequest(
  messages: ChatMessage[],
  preferredProvider?: string,
  preferredModel?: string
): Promise<RouterResponse> {
  const selectedId = preferredProvider || (() => {
    try { return localStorage.getItem('asuum_selected_provider') || 'auto'; } catch { return 'auto'; }
  })();
  const selectedModel = preferredModel || (() => {
    try { return localStorage.getItem('asuum_selected_model') || 'auto'; } catch { return 'auto'; }
  })();

  let savedProviders: string[] = [];
  try { savedProviders = await getAllSavedProviders(); } catch { savedProviders = []; }

  if (savedProviders.length === 0) {
    throw new Error('No API keys found. Add a key in Model Hub.');
  }

  // Specific provider selected → ONLY try that one
  if (selectedId !== 'auto') {
    if (!savedProviders.includes(selectedId)) {
      throw new Error('Provider "' + selectedId + '" not connected. Add it in Model Hub.');
    }

    let apiKey: string | null = null;
    try { apiKey = await loadApiKey(selectedId); } catch {
      throw new Error('Failed to load key for ' + selectedId);
    }
    if (!apiKey) throw new Error('No key found for ' + selectedId);

    const baseUrl = resolveBaseUrl(selectedId, apiKey);
    if (!baseUrl) {
      throw new Error('No base URL for ' + selectedId + '. Reconnect in Model Hub.');
    }

    const cacheKey = selectedId + ':' + apiKey.slice(0, 8);

    const modelToUse = selectedModel !== 'auto' ? selectedModel : modelCache[cacheKey];
    if (modelToUse) {
      try {
        const text = await tryChat(baseUrl, modelToUse, apiKey, messages, selectedId);
        if (text) {
          modelCache[cacheKey] = modelToUse;
          return { text, provider: selectedId, model: modelToUse };
        }
      } catch (e) {
        delete modelCache[cacheKey];
        // ✅ Sanitized error — no raw API response
        const msg = e instanceof Error ? e.message : 'Unknown error';
        throw new Error(selectedId + '/' + modelToUse + ': ' + msg);
      }
    }

    const models = await fetchModelsForProvider(selectedId);
    if (models.length === 0) {
      throw new Error(selectedId + ': No chat models found. Check API key and URL.');
    }

    for (const model of models.slice(0, 10)) {
      try {
        const text = await tryChat(baseUrl, model, apiKey, messages, selectedId);
        if (text) {
          modelCache[cacheKey] = model;
          return { text, provider: selectedId, model };
        }
      } catch { continue; }
    }

    throw new Error(selectedId + ': All chat models failed.');
  }

  // AUTO mode
  const errors: string[] = [];
  for (const pid of savedProviders) {
    let apiKey: string | null = null;
    try { apiKey = await loadApiKey(pid); } catch { continue; }
    if (!apiKey) continue;

    const baseUrl = resolveBaseUrl(pid, apiKey);
    if (!baseUrl) { errors.push(pid + ': No URL'); continue; }

    const cacheKey = pid + ':' + apiKey.slice(0, 8);

    if (modelCache[cacheKey]) {
      try {
        const text = await tryChat(baseUrl, modelCache[cacheKey], apiKey, messages, pid);
        if (text) return { text, provider: pid, model: modelCache[cacheKey] };
      } catch { delete modelCache[cacheKey]; }
    }

    const models = await fetchModelsForProvider(pid);
    if (models.length === 0) { errors.push(pid + ': No models'); continue; }

    for (const model of models.slice(0, 5)) {
      try {
        const text = await tryChat(baseUrl, model, apiKey, messages, pid);
        if (text) {
          modelCache[cacheKey] = model;
          return { text, provider: pid, model };
        }
      } catch { continue; }
    }
    errors.push(pid + ': Failed');
  }

  throw new Error('All providers failed: ' + errors.join(' | '));
}

export function getAvailableProviders(): string[] {
  return Object.keys(PROVIDER_REGISTRY);
}

// Re-export for backward compatibility
export { detectProviderFromApiKey, PROVIDER_REGISTRY } from './providers';