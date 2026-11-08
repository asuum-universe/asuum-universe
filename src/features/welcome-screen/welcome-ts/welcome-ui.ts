/** welcome-ui.ts — V1 + FORCED SINGLE-FRAME THEME TRANSITION */
import{PerformanceMonitor}from'../../../core/performance';

const TEXTS={welcome:{line1:'Welcome to Asuum',line2:'Your personal AI assistant & workspace',final:'How can I help you today?'}};
const ICON_MOON=`<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
const ICON_SUN=`<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
const MAIN_THEME_KEY='asuum_main_theme';
let seqId=0,lastMode='',jellyInjected=false,updating=false,themeBtnInjected=false;

export function setExplicitNewTabClicked(_v:boolean):void{}
export function injectNewTabColor(_dot:string,_hover:string,_active:string):void{}
export function clearInjectedColor():void{}

function getStoredMainTheme():'light'|'dark'|null{try{return localStorage.getItem(MAIN_THEME_KEY) as 'light'|'dark'|null}catch{return null}}
function getSystemTheme():'light'|'dark'{return window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}
function applyMainTheme(theme:'light'|'dark'):void{if(theme==='dark')document.body.classList.add('main-dark');else document.body.classList.remove('main-dark')}
function initMainTheme():void{const stored=getStoredMainTheme();const theme=stored||getSystemTheme();applyMainTheme(theme);window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change',(e)=>{if(!getStoredMainTheme())applyMainTheme(e.matches?'dark':'light')})}

/**
 * ✅ FORCED SINGLE-FRAME THEME TRANSITION
 * 
 * WHY CSS-ONLY APPROACHES FAILED:
 * CSS variables update instantly but browser paints each element
 * in separate compositing passes → visible stagger/cascade
 * 
 * HOW THIS FIX WORKS:
 * 1. Disable ALL transitions temporarily (instant state change)
 * 2. Apply new theme class
 * 3. Force browser to compute ALL new styles in ONE pass
 *    via getComputedStyle on every themed element
 * 4. Re-enable transitions AFTER single paint completes
 * 5. Result: everything changes in EXACT same frame
 */
function toggleMainTheme():void{
  const isDark=document.body.classList.contains('main-dark');
  const newTheme=isDark?'light':'dark';

  // Step 1: Kill all transitions so nothing animates yet
  document.documentElement.style.setProperty('--theme-transition','0s');

  // Step 2: Apply theme instantly
  applyMainTheme(newTheme);
  try{localStorage.setItem(MAIN_THEME_KEY,newTheme)}catch{}

  // Step 3: Force browser to resolve ALL computed styles in ONE pass
  // This makes browser recalculate every element's colors simultaneously
  requestAnimationFrame(()=>{
    const themedEls=document.querySelectorAll(
      '.chat-screen,.main-area,.sidebar,.input-container,.message-bubble,'+
      '.message-row.user .message-bubble,.message-row.ai .message-bubble,'+
      '.chat-input,.input-actions,.msg-action-btn,.thinking-dot,.thinking-text,'+
      '.chat-end-marker .end-line,.scroll-to-bottom-btn,.mm-line,.mm-menu,'+
      '.mm-item,.timeline-system,.timeline-dash,.history-item,.history-dot,'+
      '.history-title,.single-title-text,.hdr-toast,.chat-scrollbar-thumb,'+
      '.scroll-arrow-up,.scroll-arrow-down,.sb-logo-text,.sb-action-btn,'+
      '.sb-btn-text,.sb-divider,.sb-profile-box,.sb-avatar,.sb-name,'+
      '.sb-status,.chat-item,.chat-item-title,.welcome-line,.typewriter-cursor,'+
      '.message-bubble pre,.message-bubble code,.message-bubble blockquote,'+
      '.message-bubble h1,.message-bubble h2,.message-bubble h3,'+
      '.message-bubble p,.message-bubble strong,.message-bubble em'
    );
    // Force style recalculation on ALL elements at once
    themedEls.forEach(el=>{window.getComputedStyle(el).backgroundColor});

    // Step 4: Now restore transitions — next paint will show everything updated together
    requestAnimationFrame(()=>{
      document.documentElement.style.removeProperty('--theme-transition');
    });
  });
}

function injectThemeToggle():void{
  if(themeBtnInjected)return;
  const existing=document.getElementById('themeToggleBtn');
  if(existing){themeBtnInjected=true;return}
  const btn=document.createElement('button');
  btn.id='themeToggleBtn';btn.className='theme-toggle-btn';btn.title='Toggle Dark/Light Mode';btn.setAttribute('aria-label','Toggle theme');
  btn.innerHTML=ICON_MOON+ICON_SUN;
  btn.addEventListener('click',(e)=>{e.stopPropagation();toggleMainTheme()});
  const mainArea=document.querySelector('.main-area');
  if(mainArea){mainArea.appendChild(btn);themeBtnInjected=true}
}

export function initializeWelcomeUI():void{
  console.log('✨ Welcome UI (V1 + Forced Single-Frame Theme)');
  initMainTheme();injectThemeToggle();injectJelly();injectHero();watchPanel();
  PerformanceMonitor.getQualityManager().onChange((q:string)=>console.log(`✨ Quality: ${q}`));
  PerformanceMonitor.getCleanupManager().onCleanup(()=>{});
  setTimeout(()=>refresh(),150);
  setTimeout(()=>{const ic=document.querySelector('.main-panel:not(.chat-active) .input-container');if(ic)ic.classList.add('visible')},800);
}

function injectJelly():void{
  if(jellyInjected)return;
  const p=document.getElementById('mainPanel');
  if(!p||p.querySelector('.jelly-canvas')){jellyInjected=true;return}
  const c=document.createElement('div');c.className='jelly-canvas';c.setAttribute('aria-hidden','true');
  c.innerHTML='<div class="jelly-blob jelly-blob-1"></div><div class="jelly-blob jelly-blob-2"></div><div class="jelly-blob jelly-blob-3"></div>';
  const hero=p.querySelector('.welcome-hero-container');
  hero?p.insertBefore(c,hero):p.insertBefore(c,p.firstChild);
  jellyInjected=true;
}

function injectHero():void{
  const p=document.getElementById('mainPanel');if(!p)return;
  p.querySelector('.welcome-hero-container')?.remove();
  const hc=document.createElement('div');hc.className='welcome-hero-container';hc.id='welcomeContainer';
  hc.appendChild(Object.assign(document.createElement('div'),{className:'welcome-line',id:'welcomeLine1'}));
  hc.appendChild(Object.assign(document.createElement('div'),{className:'welcome-line subtitle-line',id:'welcomeLine2'}));
  p.appendChild(hc);
}

function getMode():'welcome'|'none'{const panel=document.getElementById('mainPanel');if(!panel)return'none';if(panel.classList.contains('chat-active'))return'none';return'welcome'}

function refresh():void{
  if(updating)return;updating=true;
  try{
    const panel=document.getElementById('mainPanel');if(!panel)return;
    const mode=getMode();
    if(mode!=='none'&&mode!==lastMode){lastMode=mode;runText(mode)}
    else if(mode==='none'){lastMode='none'}
    if(mode!=='none'){setTimeout(()=>{const ic=panel.querySelector('.input-container') as HTMLElement|null;if(ic)ic.classList.add('visible')},300)}
  }finally{requestAnimationFrame(()=>{updating=false})}
}

function watchPanel():void{const p=document.getElementById('mainPanel');if(!p)return;new MutationObserver(()=>refresh()).observe(p,{attributes:true,attributeFilter:['class']})}

function runText(mode:'welcome'):void{
  seqId++;const myId=seqId;const alive=()=>myId===seqId;
  const l1=document.getElementById('welcomeLine1'),l2=document.getElementById('welcomeLine2'),ct=document.getElementById('welcomeContainer');
  if(!l1||!l2||!ct)return;
  const t=TEXTS[mode];l1.textContent='';l2.textContent='';ct.classList.remove('cursor-hidden');
  (async()=>{
    await wait(1200);if(!alive())return;
    await type(l1,t.line1,65,alive);if(!alive())return;
    await wait(400);if(!alive())return;
    await type(l2,t.line2,35,alive);if(!alive())return;
    await wait(2500);if(!alive())return;
    await del(l2,25,alive);if(!alive())return;
    await del(l1,25,alive);if(!alive())return;
    ct.classList.add('cursor-hidden');await wait(600);if(!alive())return;ct.classList.remove('cursor-hidden');
    await type(l1,t.final,55,alive);
  })();
}

async function type(el:HTMLElement,text:string,speed:number,alive:()=>boolean):Promise<void>{
  document.querySelectorAll('.typewriter-cursor').forEach(c=>c.remove());el.textContent='';
  const cur=document.createElement('span');cur.className='typewriter-cursor';
  for(const ch of text){if(!alive())return;el.textContent+=ch;el.appendChild(cur);const jitter=Math.floor(speed*0.15);await wait(Math.max(15,speed+Math.floor(Math.random()*jitter*2)-jitter))}
  if(alive())el.appendChild(cur);
}

async function del(el:HTMLElement,speed:number,alive:()=>boolean):Promise<void>{
  document.querySelectorAll('.typewriter-cursor').forEach(c=>c.remove());
  const cur=document.createElement('span');cur.className='typewriter-cursor';el.appendChild(cur);
  let t=el.textContent||'';
  while(t.length>0){if(!alive())return;const jitter=Math.floor(speed*0.2);await wait(Math.max(10,speed+Math.floor(Math.random()*jitter*2)-jitter));t=t.slice(0,-1);el.textContent=t;el.appendChild(cur)}
}

function wait(ms:number):Promise<void>{return new Promise(r=>setTimeout(r,ms))}