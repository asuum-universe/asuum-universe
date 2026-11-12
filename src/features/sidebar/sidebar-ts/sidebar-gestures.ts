/**
 * sidebar-gestures.ts — MOBILE-ONLY TOUCH GESTURES (PRO EDITION)
 * Owns nothing but touch listeners. No DOM rendering, no state, no menus.
 * Fully destroyable → safe on HMR, resize, and re-init.
 *
 * GESTURES:
 *   CLOSED → swipe RIGHT from LEFT HALF of screen → OPEN (finger tracking)
 *   OPEN   → swipe LEFT from ANYWHERE           → CLOSE (finger tracking)
 *
 * FEATURES:
 *   · Real-time finger tracking (sidebar follows finger exactly)
 *   · Velocity-based flick detection (fast swipe = instant snap)
 *   · Progress-based snap (release past 35% = complete the action)
 *   · Capture-phase listeners (immune to stopPropagation guards)
 *   · Vertical scroll cancellation (won't hijack scrolling)
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
const SKIP_SELECTOR =
  '.chat-input,.input-container,.message-bubble,' +
  '.chat-scrollbar,.chat-scrollbar-hover-zone,.timeline-system,' +
  '.mm-wrap,.cr-overlay,.mh-overlay,.sb-toggle-btn';

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

  const reset = (): void => {
    tracking = false;
    dragging = false;
    velocity = 0;
  };

  /* ── TOUCH START · capture phase ── */
  document.addEventListener('touchstart', (e: TouchEvent) => {
    const sb = host.getSidebar();
    if (!host.isMobile() || !sb || e.touches.length !== 1) return;
    const pt = point(e.touches, 0);
    if (!pt) return;
    const target = e.target as HTMLElement | null;
    if (!target || target.closest(SKIP_SELECTOR)) return;

    const open = host.isOpen();

    if (!open) {
      /* ✅ CLOSED: swipe right from LEFT HALF of screen to open */
      if (pt.x > window.innerWidth * 0.5) return;
    }
    /* ✅ OPEN: swipe left from ANYWHERE to close — no restriction */

    tracking = true;
    dragging = false;
    startX = pt.x; lastX = pt.x;
    startY = pt.y;
    lastT = performance.now();
    velocity = 0;
    width = host.getWidth();
    base = open ? 0 : -width;
  }, { passive: true, capture: true, signal });

  /* ── TOUCH MOVE · capture phase ── */
  document.addEventListener('touchmove', (e: TouchEvent) => {
    const sb = host.getSidebar();
    if (!tracking || !sb) return;
    const pt = point(e.touches, 0);
    if (!pt) return;

    const dx = pt.x - startX;
    const dy = Math.abs(pt.y - startY);

    if (!dragging) {
      /* Cancel if vertical scroll detected */
      if (dy > VERTICAL_CANCEL_PX && dy > Math.abs(dx)) { reset(); return; }
      /* Wait for minimum horizontal movement before committing */
      if (Math.abs(dx) < DRAG_START_PX) return;
      /* Cancel if more vertical than horizontal */
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

    /* Velocity tracking for flick detection */
    const now = performance.now();
    if (now > lastT) velocity = (pt.x - lastX) / (now - lastT);
    lastX = pt.x;
    lastT = now;

    /* ✅ Smooth finger tracking — sidebar follows finger exactly */
    const translate = Math.max(-width, Math.min(0, base + dx));
    sb.style.transform = `translateX(${translate}px)`;
  }, { passive: true, capture: true, signal });

  /* ── TOUCH END / CANCEL · capture phase ── */
  const finish = (): void => {
    if (!tracking) return;
    const wasDragging = dragging;
    reset();

    const sb = host.getSidebar();
    if (!sb || !wasDragging) return;   // plain tap → zero state change

    host.suppressClicks(320);
    sb.classList.remove('dragging');
    sb.style.transition = '';
    sb.style.transform = '';

    /* Calculate current position from computed transform */
    const parts = getComputedStyle(sb).transform.match(/-?\d+\.?\d*/g);
    const raw = parts && parts.length >= 6 ? parts[4] : undefined;
    const parsed = raw !== undefined ? Number.parseFloat(raw) : NaN;
    const current = Number.isFinite(parsed) ? parsed : (host.isOpen() ? 0 : -width);
    const progress = Math.max(0, Math.min(1, (current + width) / width));

    /* ✅ Velocity + progress → snap decision
       · Fast right flick → open
       · Fast left flick  → close
       · Otherwise        → progress >= 35% decides */
    const shouldOpen =
      velocity > FLICK_VELOCITY ? true :
      velocity < -FLICK_VELOCITY ? false :
      progress >= OPEN_RATIO;

    if (shouldOpen) host.open(); else host.close();
  };

  document.addEventListener('touchend', finish, { passive: true, capture: true, signal });
  document.addEventListener('touchcancel', finish, { passive: true, capture: true, signal });

  return () => { ac.abort(); reset(); };
}