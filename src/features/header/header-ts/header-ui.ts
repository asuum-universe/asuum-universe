/** header-ui.ts — V1 + WAVE HANDS + LASER SHIMMER + MOBILE EDGE SLOTS (strict-TS safe) */
import{getActiveTab,getTabById,updateTabTitle,onTabsChange,getActiveSessionId,getAllTabs,closeTab}from'../services/header-tabs-store';
import{getCurrentSession,deleteSession}from'../../chat-screen/services/chat-store';
import{setExplicitNewTabClicked,clearInjectedColor}from'../../welcome-screen/welcome-ts/welcome-ui';

const IC_MORE=`<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>`;
const IC_RENAME=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`;
const IC_TRASH=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
const IC_CLOSE=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`;
const IC_EYE_OFF=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

const MOUTH_CLASSES=['','happy','thinking','surprised','excited','love','confused','sleepy'];
let currentMouthIndex=0,injected=false,editingTabId:string|null=null,editOrigTitle='';
let tabMenuEl:HTMLElement|null=null,tabMenuForId:string|null=null;
// ✅ headerAreaEl = #headerArea (.header-area div) — CSS classes toggle here
// ✅ headerContainerEl = #headerContainer — DOM injection happens inside this
let headerAreaEl:HTMLElement|null=null,headerContainerEl:HTMLElement|null=null;
let avatarBtn:HTMLElement|null=null,titleWrapEl:HTMLElement|null=null;
let reopenLineEl:HTMLElement|null=null,reopenArrowEl:HTMLElement|null=null;
let closeBtnEl:HTMLButtonElement|null=null;
let leftHandEl:HTMLElement|null=null,rightHandEl:HTMLElement|null=null;
let isWelcomeMode=true,headerToastEl:HTMLElement|null=null,headerToastTimer:ReturnType<typeof setTimeout>|null=null;
let gazeRafId:number|null=null,faceGroupEl:HTMLElement|null=null,eyeEls:NodeListOf<HTMLElement>|null=null;
let mouthEl:HTMLElement|null=null,blinkTimer:ReturnType<typeof setTimeout>|null=null;
let isRendering=false,eventCapturedTitle:string|null=null,hasWaved=false;
let wasInChatMode=false;

/* ── MOBILE-ONLY EDGE CONTROLS ──
   ✅ FIX: HTMLButtonElement (not HTMLElement) — `.type` only exists on buttons.
   Yahi line 160 aur 182 ke do red errors ki asli wajah thi. */
let leftSlotEl:HTMLButtonElement|null=null;
let menuBtnEl:HTMLButtonElement|null=null;
let headerMenuEl:HTMLElement|null=null;
let hdrMenuRaf:number|null=null;

const WELCOME_STATE_KEY='asuum_welcome_mode';
function saveWelcomeState(v:boolean):void{try{if(v)localStorage.setItem(WELCOME_STATE_KEY,'1');else localStorage.removeItem(WELCOME_STATE_KEY);}catch{/* blocked */}}
function loadWelcomeState():boolean{try{return localStorage.getItem(WELCOME_STATE_KEY)==='1';}catch{return true;}}
export function toast(msg:string):void{if(!headerToastEl){headerToastEl=document.createElement('div');headerToastEl.className='hdr-toast';document.body.appendChild(headerToastEl);}if(headerToastTimer)clearTimeout(headerToastTimer);headerToastEl.classList.remove('show');void headerToastEl.offsetWidth;headerToastEl.textContent=msg;headerToastEl.classList.add('show');headerToastTimer=setTimeout(()=>{headerToastEl?.classList.remove('show');},3000);}
function onAvatarClick(e:MouseEvent):void{e.stopPropagation();closeMenu();if(editingTabId){editingTabId=null;renderTitle();}currentMouthIndex=(currentMouthIndex+1)%MOUTH_CLASSES.length;setMouth(currentMouthIndex);triggerWave();}
function setMouth(i:number):void{
  const m=mouthEl;if(!m)return;
  MOUTH_CLASSES.forEach(c=>{if(c)m.classList.remove(c);});
  const next=MOUTH_CLASSES[i];
  if(next)m.classList.add(next);
}
function onCloseHeader():void{
  const ha=headerAreaEl;if(!ha)return;
  closeMenu();closeHeaderMenu();
  if(editingTabId){editingTabId=null;renderTitle();}
  if(ha.classList.contains('awning-open'))ha.classList.remove('awning-open');
  else ha.classList.add('header-closed');
}
function onReopenLine():void{
  const ha=headerAreaEl;if(!ha)return;
  closeMenu();
  if(editingTabId){editingTabId=null;renderTitle();}
  ha.classList.remove('header-closed');
  ha.classList.add('awning-open');
}
function triggerWave():void{
  const lh=leftHandEl,rh=rightHandEl;
  if(hasWaved||!lh||!rh||!mouthEl)return;
  hasWaved=true;setMouth(1);
  lh.classList.add('hand-visible');
  rh.classList.add('hand-visible');rh.classList.add('hand-wave');
  setTimeout(()=>{lh.classList.remove('hand-visible');rh.classList.remove('hand-visible','hand-wave');},2000);
}
function resetWave():void{hasWaved=false;}
function startHeaderShimmer():void{titleWrapEl?.classList.add('laser-shimmer-active');}
function stopHeaderShimmer():void{titleWrapEl?.classList.remove('laser-shimmer-active');}
function wireGazeTracking():void{
  const upd=(cx:number,cy:number):void=>{
    const av=avatarBtn,fg=faceGroupEl,eyes=eyeEls;
    if(!av||!fg||!eyes)return;
    const r=av.getBoundingClientRect(),ax=r.left+r.width/2,ay=r.top+r.height/2,dx=cx-ax,dy=cy-ay,d=Math.hypot(dx,dy);
    if(d>400){fg.style.transform='translate(0,0)';eyes.forEach(e=>{e.style.transform='translate(0,0)';});return;}
    const a=Math.atan2(dy,dx),n=Math.min(d/400,1),fm=n*n*1.2,em=n*2.5;
    fg.style.transform=`translate(${(Math.cos(a)*fm).toFixed(2)}px,${(Math.sin(a)*fm).toFixed(2)}px)`;
    eyes.forEach(e=>{e.style.transform=`translate(${(Math.cos(a)*em).toFixed(2)}px,${(Math.sin(a)*em).toFixed(2)}px)`;});
  };
  document.addEventListener('mousemove',(e:MouseEvent)=>{
    if(gazeRafId!==null)cancelAnimationFrame(gazeRafId);
    gazeRafId=requestAnimationFrame(()=>upd(e.clientX,e.clientY));
  });
}
function wireBlink():void{
  const db=():void=>{
    const av=avatarBtn;
    if(!av){blinkTimer=setTimeout(db,2500);return;}
    const c=av.querySelector('.pure-circle')as HTMLElement|null;
    if(!c){blinkTimer=setTimeout(db,2000);return;}
    c.classList.add('blinking');
    setTimeout(()=>{c.classList.remove('blinking');},150);
    blinkTimer=setTimeout(db,2500+Math.random()*3500);
  };
  blinkTimer=setTimeout(db,2500);
}

/**
 * ENTER WELCOME MODE
 * Adds welcome-header to #headerArea → CSS: .header-area.welcome-header:not(.welcome-collapsed) .header-container → 60px
 */
function enterWelcomeMode():void{
  isWelcomeMode=true;saveWelcomeState(true);
  eventCapturedTitle=null;editingTabId=null;editOrigTitle='';
  closeMenu();closeHeaderMenu();resetWave();
  const ha=headerAreaEl;
  if(ha){
    ha.classList.remove('welcome-collapsed','header-closed','awning-open','has-tabs','header-hidden');
    void ha.offsetHeight;
    ha.classList.add('welcome-header');
    Object.assign(ha.style,{display:'',opacity:'1',pointerEvents:''});
  }
  document.getElementById('mainPanel')?.classList.remove('has-tabs');
  renderTitle();
  setTimeout(()=>triggerWave(),400);
}
/**
 * EXIT WELCOME MODE
 * Removes welcome-header from #headerArea → CSS: .header-container defaults to 36px
 */
function exitWelcomeMode(title?:string):void{
  isWelcomeMode=false;saveWelcomeState(false);
  wasInChatMode=true;
  if(title)eventCapturedTitle=title;
  resetWave();closeHeaderMenu();
  leftHandEl?.classList.remove('hand-visible');
  rightHandEl?.classList.remove('hand-visible','hand-wave');
  const ha=headerAreaEl;
  if(ha){
    ha.classList.remove('welcome-header','welcome-collapsed','header-closed','awning-open','has-tabs','header-hidden');
    Object.assign(ha.style,{display:'',opacity:'1',pointerEvents:''});
  }
  const p=document.getElementById('mainPanel');
  if(p){p.classList.remove('has-tabs');p.classList.remove('new-tab-mode');}
  requestAnimationFrame(()=>renderTitle());
}

export function initializeHeaderUI():void{
  console.log('😊 Header UI (V1 + Wave + Laser Shimmer + Mobile Edge Slots)');
  headerAreaEl=document.getElementById('headerArea');
  headerContainerEl=document.getElementById('headerContainer');
  const savedWelcome=loadWelcomeState();
  const p=document.getElementById('mainPanel');
  const cs=getCurrentSession();
  const hasActiveChat=(p?.classList.contains('chat-active')??false)&&!!cs?.id;
  isWelcomeMode=savedWelcome||!hasActiveChat;
  wasInChatMode=!isWelcomeMode&&hasActiveChat;
  eventCapturedTitle=(!isWelcomeMode&&cs?.title)?cs.title:null;
  setExplicitNewTabClicked(false);injectStructure();wireGlobalClose();watchPanel();wireGazeTracking();wireBlink();
  document.addEventListener('asuum:ai-thinking-start',()=>startHeaderShimmer());
  document.addEventListener('asuum:ai-thinking-stop',()=>stopHeaderShimmer());
  onTabsChange(()=>{if(isWelcomeMode)return;renderTitle();});
  document.addEventListener('asuum:welcome-mode',()=>{enterWelcomeMode();setExplicitNewTabClicked(false);clearInjectedColor();});
  document.addEventListener('asuum:chat-mode',((e:Event)=>{const ce=e as CustomEvent;const t=(ce.detail?.title as string)||'';exitWelcomeMode(t);})as EventListener);
  document.addEventListener('asuum:message-sent',()=>{if(isWelcomeMode){const s=getCurrentSession();exitWelcomeMode(s?.title||'New Chat');}});
  document.addEventListener('asuum:session-opened',((e:Event)=>{const ce=e as CustomEvent;const t=(ce.detail?.title as string)||'Chat';exitWelcomeMode(t);document.getElementById('mainPanel')?.classList.add('chat-active');})as EventListener);
  document.addEventListener('asuum:title-updated',((e:Event)=>{const ce=e as CustomEvent;const t=ce.detail?.title as string|undefined;if(t){eventCapturedTitle=t;if(!isWelcomeMode)renderTitle();}})as EventListener);

  /* mobile header menu — dismiss on any outside press, Escape, resize */
  document.addEventListener('pointerdown',(e:Event)=>{
    const pop=headerMenuEl;if(!pop)return;
    const t=e.target as HTMLElement|null;if(!t)return;
    if(pop.contains(t)||menuBtnEl?.contains(t))return;
    closeHeaderMenu();
  },true);
  document.addEventListener('keydown',(e:KeyboardEvent)=>{if(e.key==='Escape')closeHeaderMenu();});
  window.addEventListener('resize',scheduleHeaderMenuReposition);
  window.addEventListener('orientationchange',scheduleHeaderMenuReposition);

  renderTitle();
  if(isWelcomeMode)enterWelcomeMode();else exitWelcomeMode(cs?.title||'New Chat');
}

/**
 * INJECT STRUCTURE
 * reopen-line & reopen-arrow → appended to #headerArea
 * header-top-row → appended to #headerContainer
 * mobile-only: left reserved slot + right menu button (display:none on desktop)
 */
function injectStructure():void{
  if(injected)return;
  const ha=headerAreaEl;
  const hc=headerContainerEl;
  if(!ha||!hc)return;

  // Reopen line & arrow
  const rl=document.createElement('div');
  rl.className='reopen-line';rl.title='Open Header';
  rl.addEventListener('click',(e:MouseEvent)=>{e.stopPropagation();onReopenLine();});
  rl.addEventListener('mouseenter',()=>{reopenArrowEl?.classList.add('visible');});
  rl.addEventListener('mouseleave',()=>{reopenArrowEl?.classList.remove('visible');});
  ha.appendChild(rl);reopenLineEl=rl;

  const ra=document.createElement('div');
  ra.className='reopen-arrow-icon';
  ra.innerHTML='<svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>';
  ha.appendChild(ra);reopenArrowEl=ra;

  // Header top row
  const tr=document.createElement('div');tr.className='header-top-row';
  tr.addEventListener('click',(e:MouseEvent)=>{
    const area=headerAreaEl;if(!area)return;
    const tgt=e.target as HTMLElement|null;if(!tgt)return;
    if(tgt.closest('.header-avatar-toggle')||tgt.closest('.header-close-btn')||tgt.closest('.header-menu-btn')||tgt.closest('.header-slot-btn'))return;
    if(!isWelcomeMode)return;
    e.stopPropagation();
    if(!area.classList.contains('welcome-collapsed')){
      area.classList.add('welcome-collapsed');
    }else{
      area.classList.remove('welcome-collapsed');
      setTimeout(()=>triggerWave(),300);
    }
  });

  /* ── LEFT RESERVED SLOT (mobile only) — jagah future feature ke liye ── */
  const slot=document.createElement('button');
  slot.className='header-slot-btn';
  slot.id='headerLeftSlot';
  slot.type='button';                      // ✅ ab HTMLButtonElement — no error
  slot.dataset.empty='true';
  slot.setAttribute('aria-hidden','true');
  slot.tabIndex=-1;
  slot.addEventListener('click',(e:MouseEvent)=>{e.stopPropagation();});
  tr.appendChild(slot);leftSlotEl=slot;

  // Avatar
  const av=document.createElement('div');
  av.className='header-avatar-toggle';av.title='Change expression';
  av.addEventListener('click',onAvatarClick);
  av.addEventListener('mouseenter',()=>{
    if(isWelcomeMode&&!headerAreaEl?.classList.contains('welcome-collapsed')){resetWave();setTimeout(()=>triggerWave(),50);}
  });
  const ci2=document.createElement('div');ci2.className='pure-circle';
  const fg=document.createElement('div');fg.className='face-group';faceGroupEl=fg;
  const eyes=document.createElement('div');eyes.className='capsule-eyes';
  const e1=document.createElement('div');e1.className='capsule-eye';
  const e2=document.createElement('div');e2.className='capsule-eye';
  eyes.appendChild(e1);eyes.appendChild(e2);
  const mo=document.createElement('div');mo.className='mouth';mouthEl=mo;
  fg.appendChild(eyes);fg.appendChild(mo);ci2.appendChild(fg);av.appendChild(ci2);
  const lh=document.createElement('div');lh.className='avatar-hand avatar-hand-left';leftHandEl=lh;av.appendChild(lh);
  const rh=document.createElement('div');rh.className='avatar-hand avatar-hand-right';rightHandEl=rh;av.appendChild(rh);
  tr.appendChild(av);avatarBtn=av;
  eyeEls=av.querySelectorAll('.capsule-eye')as NodeListOf<HTMLElement>;

  const tw=document.createElement('div');
  tw.className='header-title-area';tw.id='headerTitleArea';
  tr.appendChild(tw);titleWrapEl=tw;

  const cb=document.createElement('button');
  cb.className='header-close-btn';cb.type='button';cb.title='Collapse';cb.innerHTML=IC_CLOSE;
  cb.addEventListener('click',(e:MouseEvent)=>{e.stopPropagation();onCloseHeader();});
  tr.appendChild(cb);closeBtnEl=cb;

  /* ── RIGHT MENU BUTTON (mobile only) ── */
  const mb=document.createElement('button');
  mb.className='header-menu-btn';
  mb.id='headerMenuBtn';
  mb.type='button';                        // ✅ ab HTMLButtonElement — no error
  mb.title='Header menu';
  mb.setAttribute('aria-label','Header menu');
  mb.setAttribute('aria-haspopup','menu');
  mb.setAttribute('aria-expanded','false');
  mb.innerHTML=IC_MORE;
  mb.addEventListener('click',(e:MouseEvent)=>{
    e.stopPropagation();e.preventDefault();
    if(headerMenuEl)closeHeaderMenu();else openHeaderMenu();
  });
  tr.appendChild(mb);menuBtnEl=mb;

  hc.appendChild(tr);injected=true;
}

/* ─────────── MOBILE HEADER MENU ─────────── */
function headerMenuItems():string{
  const s=getCurrentSession();
  const p=document.getElementById('mainPanel');
  const hasChat=!!p?.classList.contains('chat-active')&&!!s&&s.messages.length>0;
  const dis=hasChat?'':' disabled aria-disabled="true"';
  const closed=!!headerAreaEl?.classList.contains('header-closed');
  return `<button class="header-menu-item" type="button" role="menuitem" data-act="rename"${dis}>${IC_RENAME}<span>Rename chat</span></button>`
       + `<button class="header-menu-item danger" type="button" role="menuitem" data-act="delete"${dis}>${IC_TRASH}<span>Delete chat</span></button>`
       + `<div class="header-menu-sep"></div>`
       + `<button class="header-menu-item" type="button" role="menuitem" data-act="toggle-header">${IC_EYE_OFF}<span>${closed?'Show header':'Hide header'}</span></button>`;
}
function openHeaderMenu():void{
  closeHeaderMenu();closeMenu();
  const btn=menuBtnEl;if(!btn)return;
  const pop=document.createElement('div');
  pop.className='header-menu-pop';
  pop.setAttribute('role','menu');
  pop.innerHTML=headerMenuItems();
  document.body.appendChild(pop);
  headerMenuEl=pop;
  btn.classList.add('active');
  btn.setAttribute('aria-expanded','true');
  positionHeaderMenu();

  pop.addEventListener('click',(e)=>e.stopPropagation());
  pop.querySelectorAll('.header-menu-item').forEach(node=>{
    node.addEventListener('click',(e)=>{
      e.stopPropagation();
      const el=node as HTMLElement;
      if(el.hasAttribute('disabled'))return;
      const act=el.dataset.act??'';
      closeHeaderMenu();
      runHeaderMenuAction(act);
    });
  });
}
function runHeaderMenuAction(act:string):void{
  const s=getCurrentSession();
  const at=getActiveTab();
  switch(act){
    case'rename':
      if(at)startEditingTab(at.id);
      else if(s){const n=prompt('Rename chat:',s.title);if(n&&n.trim())updateActiveTabTitle(n.trim());}
      break;
    case'delete':
      if(!s)return;
      if(confirm(`Delete "${s.title}"?`)){
        getAllTabs().filter(t=>t.sessionId===s.id).forEach(t=>closeTab(t.id));
        deleteSession(s.id);
        document.dispatchEvent(new CustomEvent('asuum:welcome-mode'));
      }
      break;
    case'toggle-header':
      if(headerAreaEl?.classList.contains('header-closed'))onReopenLine();else onCloseHeader();
      break;
  }
}
function positionHeaderMenu():void{
  const pop=headerMenuEl,btn=menuBtnEl;
  if(!pop||!btn)return;
  const r=btn.getBoundingClientRect();
  const mw=pop.offsetWidth||176;
  const mh=pop.offsetHeight||120;
  let left=r.right-mw;
  let top=r.bottom+4;
  if(top+mh>window.innerHeight-8)top=r.top-mh-4;
  left=Math.max(8,Math.min(left,window.innerWidth-mw-8));
  top=Math.max(8,top);
  pop.style.left=`${left}px`;
  pop.style.top=`${top}px`;
}
function scheduleHeaderMenuReposition():void{
  if(!headerMenuEl||hdrMenuRaf!==null)return;
  hdrMenuRaf=requestAnimationFrame(()=>{hdrMenuRaf=null;positionHeaderMenu();});
}
function closeHeaderMenu():void{
  const pop=headerMenuEl;
  if(pop){pop.remove();headerMenuEl=null;}
  const btn=menuBtnEl;
  if(btn){btn.classList.remove('active');btn.setAttribute('aria-expanded','false');}
}
/** Future feature hook — left slot abhi khali hai, yahan se plug kar sakte ho. */
export function getHeaderLeftSlot():HTMLButtonElement|null{return leftSlotEl;}

function title():string{
  if(isWelcomeMode)return'';
  if(eventCapturedTitle)return eventCapturedTitle;
  const s=getCurrentSession();if(s?.title)return s.title;
  const at=getActiveTab();if(at?.title)return at.title;
  return'New Chat';
}
function renderTitle():void{
  if(isRendering)return;isRendering=true;
  try{
    const tw=titleWrapEl;if(!tw)return;
    if(isWelcomeMode){tw.innerHTML='';return;}
    const t=title();if(!t){tw.innerHTML='';return;}
    const at=getActiveTab();
    const wasShimmer=tw.classList.contains('laser-shimmer-active');
    tw.innerHTML='';
    if(wasShimmer)tw.classList.add('laser-shimmer-active');

    if(editingTabId&&at&&editingTabId===at.id){
      const w=document.createElement('div');w.className='single-title-wrap editing';
      const inp=document.createElement('input');
      inp.type='text';inp.className='single-title-input';inp.value=t;inp.maxLength=60;
      const sv=():void=>{
        const v=inp.value.trim();
        if(v&&v!==editOrigTitle){updateTabTitle(at.id,v);eventCapturedTitle=v;}
        editingTabId=null;renderTitle();
      };
      inp.onkeydown=(e:KeyboardEvent):void=>{
        if(e.key==='Enter'){e.preventDefault();sv();}
        else if(e.key==='Escape'){e.preventDefault();editingTabId=null;renderTitle();}
      };
      inp.onblur=sv;
      inp.onclick=(e:MouseEvent):void=>{e.stopPropagation();};
      w.appendChild(inp);tw.appendChild(w);
      requestAnimationFrame(()=>{inp.focus();inp.select();});
    }else{
      const w=document.createElement('div');w.className='single-title-wrap';
      const te=document.createElement('h1');
      te.className='single-title-text';te.textContent=t;te.title=t;
      if(at)te.addEventListener('dblclick',(e:MouseEvent):void=>{e.stopPropagation();startEditingTab(at.id);});
      const mb=document.createElement('button');
      mb.className='single-title-menu-btn';mb.type='button';mb.innerHTML=IC_MORE;
      mb.setAttribute('aria-label','Chat options');
      if(at)mb.onclick=(e:MouseEvent):void=>{e.stopPropagation();openMenu(at.id,mb);};
      else mb.style.display='none';
      w.appendChild(te);w.appendChild(mb);tw.appendChild(w);
    }
  }finally{isRendering=false;}
}
function openMenu(id:string,anchor:HTMLElement):void{
  closeMenu();closeHeaderMenu();
  tabMenuForId=id;
  const pop=document.createElement('div');
  pop.className='tab-menu';
  pop.setAttribute('role','menu');
  pop.innerHTML=`<button class="tab-menu-item" type="button" data-action="rename">${IC_RENAME}<span>Rename</span></button><button class="tab-menu-item danger" type="button" data-action="delete">${IC_TRASH}<span>Delete</span></button>`;
  document.body.appendChild(pop);
  tabMenuEl=pop;
  const r=anchor.getBoundingClientRect(),mw=pop.offsetWidth,mh=pop.offsetHeight;
  pop.style.left=`${Math.max(8,Math.min(r.right-mw,window.innerWidth-mw-8))}px`;
  let top=r.bottom+6;
  if(top+mh>window.innerHeight-8)top=r.top-mh-6;
  pop.style.top=`${Math.max(8,top)}px`;
  pop.addEventListener('click',(e)=>e.stopPropagation());
  pop.querySelector('[data-action="rename"]')?.addEventListener('click',():void=>{
    const target=tabMenuForId;closeMenu();if(target)startEditingTab(target);
  });
  pop.querySelector('[data-action="delete"]')?.addEventListener('click',():void=>{closeMenu();});
}
function closeMenu():void{
  const pop=tabMenuEl;
  if(pop){pop.remove();tabMenuEl=null;tabMenuForId=null;}
}
function wireGlobalClose():void{
  document.addEventListener('click',(e:Event):void=>{
    const pop=tabMenuEl;if(!pop)return;
    const t=e.target as Node|null;
    if(t&&pop.contains(t))return;
    closeMenu();
  });
}
function watchPanel():void{
  const p=document.getElementById('mainPanel');if(!p)return;
  new MutationObserver(():void=>{
    if(isRendering)return;
    const ca=p.classList.contains('chat-active');
    const cs=getCurrentSession();
    const hasSession=!!cs&&!!cs.id;
    if(wasInChatMode&&(!ca||!hasSession)){
      wasInChatMode=false;enterWelcomeMode();
    }else if(!wasInChatMode&&ca&&hasSession&&!isWelcomeMode){
      wasInChatMode=true;
      if(!eventCapturedTitle)eventCapturedTitle=cs?.title||'New Chat';
      exitWelcomeMode(cs?.title||'New Chat');
    }else{
      renderTitle();
    }
  }).observe(p,{attributes:true,attributeFilter:['class']});
}
export function startEditingTab(id:string):void{editingTabId=id;editOrigTitle=getTabById(id)?.title??'';renderTitle();}
export function updateActiveTabTitle(t:string):void{const at=getActiveTab();if(at){updateTabTitle(at.id,t);eventCapturedTitle=t;if(!isWelcomeMode)renderTitle();}}
export function getActiveTabSessionId():string|null{return getActiveSessionId();}