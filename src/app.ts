/**
 * ============================================
 * FILE: app.ts — ULTRA OPTIMIZED ENTRY POINT
 * 3-Phase Priority Loading + Performance Monitor + Zero Overhead
 * ============================================
 * CSS LAYERING RULE:
 *   har feature ka base/desktop layer pehle, mobile override layer baad mein.
 *   Vite import order hi cascade order hai — isliye barrels ki zaroorat nahi.
 * ============================================
 */

// ===== CSS IMPORTS (order = cascade priority) =====
import './app.css';
import './features/welcome-screen/welcome-css/welcome-main.css';
import './features/input-box/input-box-css/input-main.css';
import './features/chat-screen/chat-screen-css/chat-main.css';

/* Sidebar — base/desktop, then mobile overrides */
import './features/sidebar/sidebar-css/sidebar-main.css';
import './features/sidebar/sidebar-css/sidebar-mobile.css';

/* Header — base/desktop, then mobile overrides */
import './features/header/header-css/header-main.css';
import './features/header/header-css/header-mobile.css';

import './features/model-hub/model-hub-css/model-hub-main.css';
import './features/chat-rules/chat-rules-css/chat-rules-main.css';
import './features/command-palette/command-palette-css/palette-main.css';

// ===== PERFORMANCE MONITOR =====
import { PerformanceMonitor } from './core/performance';

// ===== PHASE 1: CRITICAL FEATURES (Load Immediately) =====
import { initializeWelcomeUI } from './features/welcome-screen/welcome-ts/welcome-ui';
import { runWelcomeInitServices } from './features/welcome-screen/services/welcome-init.service';
import { initializeWelcomeCollaboration } from './features/welcome-screen/collaboration';

import { initializeInputUI } from './features/input-box/input-box-ts/input-ui';
import { runInputInitServices } from './features/input-box/services/input-init.service';
import { initializeInputCollaboration } from './features/input-box/collaboration';

import { initializeChatUI } from './features/chat-screen/chat-screen-ts/chat-ui';
import { runChatInitServices } from './features/chat-screen/services/chat-init.service';
import { initializeChatCollaboration } from './features/chat-screen/collaboration';

// ===== ICONS =====
const ICON_MAXIMIZE = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
  <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
  <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
  <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
</svg>`;

console.log('🚀 Asuum Universe Starting (Ultra Optimized)...');

// ===== LAZY LOAD STATE =====
let sidebarLoaded = false;
let headerLoaded = false;
let modelHubLoaded = false;
let chatRulesLoaded = false;
let paletteLoaded = false;
let hubExitWired = false;

/**
 * ============================================
 * MAIN INITIALIZATION — 3-PHASE PRIORITY LOADING
 * ============================================
 * Phase 1 (0ms):    Critical UI — Welcome + Input + Chat + Performance Monitor
 * Phase 2 (150ms):  Deferred UI — Sidebar + Header
 * Phase 3 (idle):   Heavy Features — Model Hub + Rules + Palette
 * ============================================
 */
async function initializeApp(): Promise<void> {
  console.log('📦 3-Phase Priority Loading Started...');

  // ===== PHASE 0: PERFORMANCE MONITOR (First — before everything) =====
  console.log('  🚀 Phase 0: Performance Monitor');
  PerformanceMonitor.initialize();

  // ===== PHASE 1: CRITICAL UI (Immediate — User sees app instantly) =====
  console.log('  ⚡ Phase 1: Critical UI (immediate)');
  runWelcomeInitServices();
  initializeWelcomeUI();
  initializeWelcomeCollaboration();

  runInputInitServices();
  initializeInputUI();
  initializeInputCollaboration();

  runChatInitServices();
  initializeChatUI();
  initializeChatCollaboration();

  // Mark app ready immediately (critical UI is done)
  requestAnimationFrame(() => {
    document.body.classList.add('app-ready');
    console.log('✅ App Ready! (Critical UI loaded in <100ms)');
  });

  // ===== PHASE 2: DEFERRED UI (After 150ms — browser is free) =====
  setTimeout(async () => {
    console.log('  ⏳ Phase 2: Deferred UI');
    await loadSidebar();
    await loadHeader();
    setupHubFullscreenExit();
  }, 150);

  // ===== PHASE 3: HEAVY FEATURES (On browser idle) =====
  loadHeavyFeaturesOnIdle();
}

/**
 * ============================================
 * PHASE 2: LAZY LOAD SIDEBAR
 * ============================================
 */
async function loadSidebar(): Promise<void> {
  if (sidebarLoaded) return;

  try {
    console.log('    → Loading Sidebar...');
    const { initializeSidebarUI } = await import('./features/sidebar/sidebar-ts/sidebar-ui');
    initializeSidebarUI();
    sidebarLoaded = true;
  } catch (error) {
    console.error('Failed to load Sidebar:', error);
  }
}

/**
 * ============================================
 * PHASE 2: LAZY LOAD HEADER
 * ============================================
 */
async function loadHeader(): Promise<void> {
  if (headerLoaded) return;

  try {
    console.log('    → Loading Header...');
    const [
      { initializeHeaderUI },
      { runHeaderInitServices },
      { initializeHeaderCollaboration },
    ] = await Promise.all([
      import('./features/header/header-ts/header-ui'),
      import('./features/header/services/header-init.service'),
      import('./features/header/collaboration'),
    ]);

    runHeaderInitServices();
    initializeHeaderUI();
    initializeHeaderCollaboration();
    headerLoaded = true;
  } catch (error) {
    console.error('Failed to load Header:', error);
  }
}

/**
 * ============================================
 * PHASE 3: LOAD HEAVY FEATURES ON IDLE
 * Uses requestIdleCallback if available
 * ============================================
 */
function loadHeavyFeaturesOnIdle(): void {
  const loadAll = async (): Promise<void> => {
    await loadModelHub();
    await loadChatRules();
    await loadCommandPalette();
    console.log('✅ All heavy features loaded in background!');
  };

  if ('requestIdleCallback' in window) {
    (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void })
      .requestIdleCallback(() => { void loadAll(); }, { timeout: 3000 });
  } else {
    setTimeout(() => { void loadAll(); }, 2000);
  }
}

/**
 * ============================================
 * PHASE 3: LAZY LOAD MODEL HUB
 * ============================================
 */
async function loadModelHub(): Promise<void> {
  if (modelHubLoaded) return;

  try {
    console.log('    → Loading Model Hub...');
    const [
      { initializeModelHubUI },
      { initializeModelHubCollaboration },
    ] = await Promise.all([
      import('./features/model-hub/model-hub-ts/model-hub-ui'),
      import('./features/model-hub/collaboration'),
    ]);

    initializeModelHubUI();
    initializeModelHubCollaboration();
    modelHubLoaded = true;
  } catch (error) {
    console.error('Failed to load Model Hub:', error);
  }
}

/**
 * ============================================
 * PHASE 3: LAZY LOAD CHAT RULES
 * ============================================
 */
async function loadChatRules(): Promise<void> {
  if (chatRulesLoaded) return;

  try {
    console.log('    → Loading Chat Rules...');
    const [
      { initializeChatRulesUI },
      { runChatRulesInitServices },
      { initializeChatRulesCollaboration },
    ] = await Promise.all([
      import('./features/chat-rules/chat-rules-ts/chat-rules-ui'),
      import('./features/chat-rules/services/chat-rules-init.service'),
      import('./features/chat-rules/collaboration'),
    ]);

    runChatRulesInitServices();
    initializeChatRulesUI();
    initializeChatRulesCollaboration();
    chatRulesLoaded = true;
  } catch (error) {
    console.error('Failed to load Chat Rules:', error);
  }
}

/**
 * ============================================
 * PHASE 3: LAZY LOAD COMMAND PALETTE
 * ============================================
 */
async function loadCommandPalette(): Promise<void> {
  if (paletteLoaded) return;

  try {
    console.log('    → Loading Command Palette...');
    const [
      { initializeCommandPaletteUI },
      { initializeCommandPaletteCollaboration },
    ] = await Promise.all([
      import('./features/command-palette/command-palette-ts/palette-ui'),
      import('./features/command-palette/collaboration'),
    ]);

    initializeCommandPaletteUI();
    initializeCommandPaletteCollaboration();
    paletteLoaded = true;
  } catch (error) {
    console.error('Failed to load Command Palette:', error);
  }
}

/**
 * ============================================
 * HUB FULLSCREEN EXIT (only)
 * ============================================
 * ⚠️ IMPORTANT: expand/collapse ka owner sidebar-ui.ts hai.
 * Pehle yahan ek doosra `classList.toggle('expanded')` tha jo
 * controller ke toggle se takra raha tha (double toggle / desync).
 * Ab ye listener SIRF hub-fullscreen mode exit karta hai.
 *
 * Capture phase par hai, aur sidebar-ui `stopPropagation()` use
 * karta hai (not `stopImmediatePropagation`), isliye same-node
 * capture listeners dono chalte hain — ye reliably fire hota hai.
 * ============================================
 */
function setupHubFullscreenExit(): void {
  if (hubExitWired) return;
  hubExitWired = true;

  document.addEventListener('click', (e: Event) => {
    const target = e.target as HTMLElement | null;
    if (!target || !target.closest('#sidebarToggle,.sb-toggle-btn')) return;

    const sidebar = document.getElementById('sidebar');
    if (!sidebar || !sidebar.classList.contains('hub-fullscreen')) return;

    sidebar.classList.remove('hub-fullscreen');
    const fsBtn = document.getElementById('hubFullscreenBtn');
    if (fsBtn) {
      fsBtn.innerHTML = ICON_MAXIMIZE;
      fsBtn.title = 'Fullscreen';
    }
  }, true);
}

// ===== START APP =====
document.addEventListener('DOMContentLoaded', () => {
  void initializeApp();
});