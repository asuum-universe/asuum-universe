/**
 * providers.ts — SINGLE SOURCE OF TRUTH FOR ALL PROVIDERS
 * ✅ Shared between ai-router.ts and model-hub-ui.ts
 * ✅ Add new provider HERE ONLY — everything else auto-updates
 * ✅ No duplicate registries = zero sync bugs
 */

export interface ProviderConfig {
  baseUrl: string;
  prefixes: string[];
  displayName: string;
}

export const PROVIDER_REGISTRY: Record<string, ProviderConfig> = {
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    prefixes: ['gsk_'],
    displayName: 'Groq',
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    prefixes: ['AIza'],
    displayName: 'Google Gemini',
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    prefixes: ['sk-or-'],
    displayName: 'OpenRouter',
  },
  xai: {
    baseUrl: 'https://api.x.ai/v1',
    prefixes: ['xai-'],
    displayName: 'xAI Grok',
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    prefixes: ['sk-'],
    displayName: 'DeepSeek',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    prefixes: ['sk-proj-', 'pk-'],
    displayName: 'OpenAI',
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    prefixes: ['sk-ant-'],
    displayName: 'Anthropic',
  },
  nvidia: {
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    prefixes: ['nvapi-'],
    displayName: 'NVIDIA NIM',
  },
  together: {
    baseUrl: 'https://api.together.xyz/v1',
    prefixes: ['tok_'],
    displayName: 'Together AI',
  },
  fireworks: {
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    prefixes: ['fw_'],
    displayName: 'Fireworks',
  },
  mistral: {
    baseUrl: 'https://api.mistral.ai/v1',
    prefixes: ['mistral-'],
    displayName: 'Mistral',
  },
  cohere: {
    baseUrl: 'https://api.cohere.ai/v2',
    prefixes: ['cohere-'],
    displayName: 'Cohere',
  },
};

// Build sorted prefix map (longest prefix first for correct matching)
const PREFIX_MAP: Array<{ prefix: string; id: string; baseUrl: string; displayName: string }> = [];
for (const [id, cfg] of Object.entries(PROVIDER_REGISTRY)) {
  for (const prefix of cfg.prefixes) {
    PREFIX_MAP.push({ prefix, id, baseUrl: cfg.baseUrl, displayName: cfg.displayName });
  }
}
PREFIX_MAP.sort((a, b) => b.prefix.length - a.prefix.length);

/**
 * Universal key detector — works for ANY registered provider
 */
export function detectProviderFromApiKey(key: string): { id: string; baseUrl: string; displayName: string } | null {
  for (const entry of PREFIX_MAP) {
    if (key.startsWith(entry.prefix)) {
      return { id: entry.id, baseUrl: entry.baseUrl, displayName: entry.displayName };
    }
  }
  return null;
}

/**
 * Auto-correct common wrong URLs (website pages → API endpoints)
 */
const URL_CORRECTIONS: Record<string, string> = {
  'aistudio.google.com': PROVIDER_REGISTRY.gemini.baseUrl,
  'console.groq.com': PROVIDER_REGISTRY.groq.baseUrl,
  'platform.openai.com': PROVIDER_REGISTRY.openai.baseUrl,
  'console.x.ai': PROVIDER_REGISTRY.xai.baseUrl,
  'platform.deepseek.com': PROVIDER_REGISTRY.deepseek.baseUrl,
  'build.nvidia.com': PROVIDER_REGISTRY.nvidia.baseUrl,
  'openrouter.ai/settings': PROVIDER_REGISTRY.openrouter.baseUrl,
  'openrouter.ai/keys': PROVIDER_REGISTRY.openrouter.baseUrl,
  'console.mistral.ai': PROVIDER_REGISTRY.mistral.baseUrl,
  'dashboard.cohere.com': PROVIDER_REGISTRY.cohere.baseUrl,
};

export function correctUrl(url: string): string {
  for (const [wrongDomain, correct] of Object.entries(URL_CORRECTIONS)) {
    if (url.includes(wrongDomain)) return correct;
  }
  return url;
}