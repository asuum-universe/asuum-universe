/**
 * ============================================
 * FILE: model-store.ts
 * RESPONSIBILITY: API Keys + Model Settings Storage
 * NOTE: Phase 2 mein implement hoga
 * ============================================
 */

export interface ModelSettings {
  provider: string;   // 'openai' | 'gemini' | 'anthropic' | 'ollama' | ...
  apiKey: string;     // Cloud API key
  localUrl: string;   // Local server URL (jaise http://localhost:11434)
  model: string;      // Chuna hua model
}

// Phase 2: load/save/test functions yahan aayenge