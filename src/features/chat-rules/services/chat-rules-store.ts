/**
 * ============================================
 * FILE: chat-rules-store.ts
 * RESPONSIBILITY: Chat Rules Data Layer (localStorage backed)
 * ============================================
 */

const RULES_KEY = 'asuum_chat_rules';

export interface QuickRule {
  id: string;
  label: string;
  text: string;
}

export const QUICK_RULES: QuickRule[] = [
  { id: 'urdu', label: 'Roman Urdu', text: 'Always reply in Roman Urdu (Urdu written in English script).' },
  { id: 'short', label: 'Short Answers', text: 'Keep answers short and to the point.' },
  { id: 'code', label: 'Code Examples', text: 'Explain with code examples and comments in code.' },
  { id: 'steps', label: 'Step-by-Step', text: 'Explain everything step by step in a structured way.' },
  { id: 'friendly', label: 'Friendly Tone', text: 'Use a friendly, caring tone like a close friend ("dost").' },
  { id: 'expert', label: 'Expert Mode', text: 'Act as a senior professional expert in the relevant field.' },
];

export interface ChatRulesData {
  quick: string[];
  custom: string;
}

export function loadChatRules(): ChatRulesData {
  try {
    const raw = localStorage.getItem(RULES_KEY);
    if (!raw) return { quick: [], custom: '' };
    const data = JSON.parse(raw) as ChatRulesData;
    return {
      quick: Array.isArray(data.quick) ? data.quick : [],
      custom: data.custom || '',
    };
  } catch {
    return { quick: [], custom: '' };
  }
}

export function saveChatRules(data: ChatRulesData): void {
  try {
    localStorage.setItem(RULES_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save chat rules', e);
  }
}

export function clearChatRules(): void {
  try {
    localStorage.removeItem(RULES_KEY);
  } catch (e) {}
}

export function hasActiveRules(): boolean {
  const data = loadChatRules();
  return data.quick.length > 0 || data.custom.trim().length > 0;
}

export function getChatRulesSystemPrompt(): string {
  const data = loadChatRules();
  const parts: string[] = [];

  data.quick.forEach(id => {
    const rule = QUICK_RULES.find(q => q.id === id);
    if (rule) parts.push(`- ${rule.text}`);
  });

  if (data.custom.trim()) parts.push(`- ${data.custom.trim()}`);
  if (parts.length === 0) return '';

  return `The user has set the following chat rules. Follow them strictly in every reply:\n${parts.join('\n')}`;
}