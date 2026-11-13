/**
 * sidebar-gestures.ts — MOBILE-ONLY TOUCH GESTURES
 * Owns nothing but touch listeners. No DOM rendering, no state, no menus.
 * Fully destroyable → safe on HMR, resize, and re-init.
 *
 * GESTURES
 *   CLOSED → swipe RIGHT from LEFT HALF of screen → OPEN  (finger tracking)
 *   OPEN   → swipe LEFT  from anywhere            → CLOSE (finger tracking)
 *
 * LIVE SCRIM
 *   Every move pushes drawer progress (0→1) to the host, which drives the
 *   scrim opacity → background darkens as it opens, fades as it closes.
 *
 * SNAP
 *   Opening: past 35% OR fast right flick → open
 *   Closing: past 20% OR fast left flick  → close
 *
 * Capture-phase listeners → immune to stopPropagation guards.
 */
export interface SidebarGestureHost {
  isMobile(): boolean;
  isOpen(): boolean;
  getSidebar(): HTMLElement | null;
  getScrim(): HTMLElement | null;
  getWidth(): number;
  syncScrim(): void;
  /** Live drawer progress 0→1 during drag; host maps it to scrim opacity. */
  setScrimProgress(progress: number): void;
  onDragStart(): void;
  open(): void;
  close(): void;
  suppressClicks(ms: number): void;
}

const DRAG_START_PX = 10;
const VERTICAL_CANCEL_PX = 14;
const OPEN_RATIO = 0.35;
const CLOSE_RATIO = 0.80;
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
  let startedOpen = false;
  let startX = 0;
  let startY = 0;
  let base = 0;
  let width = 0;
  let lastX = 0;
  let lastT = 0;
  let velocity = 0;
  /** Last applied translate — used for snap decision (never read post-clear). */
  let translate = 0;
  let moveRaf: number | null = null;
  let pendingX: number | null = null;

  const reset = (): void => {
    tracking = false;
    dragging = false;
    velocity = 0;
    pendingX = null;
    if (moveRaf !== null) { cancelAnimationFrame(moveRaf); moveRaf = null; }
  };

  /* ── TOUCH START ── */
  document.addEventListener('touchstart', (e: TouchEvent) => {
    const sb = host.getSidebar();
    if (!host.isMobile() || !sb || e.touches.length !== 1) return;
    const pt = point(e.touches, 0);
    if (!pt) return;
    const target = e.target as HTMLElement | null;
    if (!target || target.closest(SKIP_SELECTOR)) return;

    startedOpen = host.isOpen();
    if (!startedOpen && pt.x > window.innerWidth * 0.5) return;

    tracking = true;
    dragging = false;
    startX = pt.x; lastX = pt.x;
    startY = pt.y;
    lastT = performance.now();
    velocity = 0;
    width = host.getWidth();
    base = startedOpen ? 0 : -width;
    translate = base;
  }, { passive: true, capture: true, signal });

  /* ── TOUCH MOVE ── */
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
      host.syncScrim();
      host.setScrimProgress(Math.max(0, Math.min(1, (base + width) / width)));
    }

    const now = performance.now();
    if (now > lastT) velocity = (pt.x - lastX) / (now - lastT);
    lastX = pt.x;
    lastT = now;

    translate = Math.max(-width, Math.min(0, base + dx));
    pendingX = translate;

    /* One paint per frame → drawer + scrim stay perfectly in sync */
    if (moveRaf === null) {
      moveRaf = requestAnimationFrame(() => {
        moveRaf = null;
        if (pendingX === null) return;
        const x = pendingX;
        pendingX = null;
        sb.style.transform = `translateX(${x}px)`;
        host.setScrimProgress(width > 0 ? (x + width) / width : 0);
      });
    }
  }, { passive: true, capture: true, signal });

  /* ── TOUCH END / CANCEL ── */
  const finish = (): void => {
    if (!tracking) return;
    const wasDragging = dragging;
    const finalTranslate = translate;
    const finalVelocity = velocity;
    const wasOpen = startedOpen;
    reset();

    const sb = host.getSidebar();
    if (!sb || !wasDragging) return;

    host.suppressClicks(320);

    /* Apply last position synchronously so the snap starts from the finger */
    sb.style.transform = `translateX(${finalTranslate}px)`;
    host.setScrimProgress(width > 0 ? (finalTranslate + width) / width : 0);

    /* Force layout, then release to CSS transition for a smooth snap */
    void sb.offsetWidth;
    sb.classList.remove('dragging');
    sb.style.transition = '';
    sb.style.transform = '';

    const progress = width > 0 ? Math.max(0, Math.min(1, (finalTranslate + width) / width)) : (wasOpen ? 1 : 0);
    const ratio = wasOpen ? CLOSE_RATIO : OPEN_RATIO;

    const shouldOpen =
      finalVelocity > FLICK_VELOCITY ? true :
      finalVelocity < -FLICK_VELOCITY ? false :
      progress >= ratio;

    if (shouldOpen) host.open(); else host.close();
  };

  document.addEventListener('touchend', finish, { passive: true, capture: true, signal });
  document.addEventListener('touchcancel', finish, { passive: true, capture: true, signal });

  return () => { ac.abort(); reset(); };
}