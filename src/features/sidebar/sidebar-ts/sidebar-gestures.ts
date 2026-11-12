/**
 * sidebar-gestures.ts — MOBILE-ONLY CONCERN
 * Owns nothing but touch listeners. No DOM rendering, no state, no menus.
 * Fully destroyable → safe on HMR, resize, and re-init.
 * 
 * FEATURES:
 *   · Swipe RIGHT from left edge → OPEN sidebar (existing)
 *   · Swipe LEFT while open → CLOSE sidebar (NEW)
 *   · Smooth real-time transform tracking
 *   · Velocity-based flick detection
 */
export interface SidebarGestureHost {
  isMobile(): boolean;
  isOpen(): boolean;
  getSidebar(): HTMLElement | null;
  getScrim(): HTMLElement | null;
  getWidth(): number;
  syncScrim(): void;
  onDragStart(): void;
  open(): void;
  close(): void;
  suppressClicks(ms: number): void;
}

const DRAG_START_PX = 10;
const VERTICAL_CANCEL_PX = 14;
const OPEN_RATIO = 0.35;
const FLICK_VELOCITY = 0.45;
const SKIP_SELECTOR = '.chat-input,.input-container,.message-bubble,.chat-scrollbar,.chat-scrollbar-hover-zone,.timeline-system,.mm-wrap,.cr-overlay,.mh-overlay,.sb-toggle-btn';

function point(list: TouchList, index: number): { x: number; y: number } | null {
  const t = list.item(index);
  return t ? { x: t.clientX, y: t.clientY } : null;
}

/** Returns a teardown function. Call it before re-initialising. */
export function initSidebarGestures(host: SidebarGestureHost): () => void {
  const ac = new AbortController();
  const signal = ac.signal;

  let tracking = false;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let base = 0;
  let width = 0;
  let lastX = 0;
  let lastT = 0;
  let velocity = 0;

  const reset = (): void => { tracking = false; dragging = false; velocity = 0; };

  document.addEventListener('touchstart', (e: TouchEvent) => {
    const sb = host.getSidebar();
    if (!host.isMobile() || !sb || e.touches.length !== 1) return;
    const pt = point(e.touches, 0);
    if (!pt) return;
    const target = e.target as HTMLElement | null;
    if (!target || target.closest(SKIP_SELECTOR)) return;

    const open = host.isOpen();
    
    /* ✅ CLOSED state: sirf left edge se right swipe track karo (open karne ke liye) */
    if (!open) {
      if (pt.x > 40) return;  /* left 40px zone only */
    }
    /* ✅ OPEN state: sirf agar touch sidebar ke andar ho to track karo (close karne ke liye) */
    else {
      if (!sb.contains(target)) return;
    }

    tracking = true;
    dragging = false;
    startX = pt.x; lastX = pt.x;
    startY = pt.y;
    lastT = performance.now();
    velocity = 0;
    width = host.getWidth();
    base = open ? 0 : -width;
  }, { passive: true, signal });

  document.addEventListener('touchmove', (e: TouchEvent) => {
    const sb = host.getSidebar();
    if (!tracking || !sb) return;
    const pt = point(e.touches, 0);
    if (!pt) return;

    const dx = pt.x - startX;
    const dy = Math.abs(pt.y - startY);

    if (!dragging) {
      if (dy > VERTICAL_CANCEL_PX && dy > Math.abs(dx)) { reset(); return; }
      if (Math.abs(dx) < DRAG_START_PX) return;
      if (Math.abs(dx) <= dy) { reset(); return; }

      dragging = true;
      host.onDragStart();
      sb.classList.add('dragging');
      const scrim = host.getScrim();
      host.syncScrim();
      if (scrim) {
        scrim.style.display = 'block';
        scrim.classList.remove('visible');
        scrim.style.pointerEvents = 'none';
      }
    }

    const now = performance.now();
    if (now > lastT) velocity = (pt.x - lastX) / (now - lastT);
    lastX = pt.x;
    lastT = now;

    /* ✅ Smooth transform tracking — dono directions (open/close) */
    const translate = Math.max(-width, Math.min(0, base + dx));
    sb.style.transform = `translateX(${translate}px)`;
  }, { passive: true, signal });

  const finish = (): void => {
    if (!tracking) return;
    const wasDragging = dragging;
    reset();

    const sb = host.getSidebar();
    if (!sb || !wasDragging) return;

    host.suppressClicks(320);
    sb.classList.remove('dragging');
    sb.style.transition = '';
    sb.style.transform = '';

    const parts = getComputedStyle(sb).transform.match(/-?\d+\.?\d*/g);
    const raw = parts && parts.length >= 6 ? parts[4] : undefined;
    const parsed = raw !== undefined ? Number.parseFloat(raw) : NaN;
    const current = Number.isFinite(parsed) ? parsed : (host.isOpen() ? 0 : -width);
    const progress = Math.max(0, Math.min(1, (current + width) / width));

    /* ✅ Velocity + progress check — direction ke hisaab se open/close */
    const shouldOpen =
      velocity > FLICK_VELOCITY ? true :
      velocity < -FLICK_VELOCITY ? false :
      progress >= OPEN_RATIO;

    if (shouldOpen) host.open(); else host.close();
  };

  document.addEventListener('touchend', finish, { passive: true, signal });
  document.addEventListener('touchcancel', finish, { passive: true, signal });

  return () => { ac.abort(); reset(); };
}