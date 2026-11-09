/** header-ui.ts — V1 + WAVE HANDS + LASER SHIMMER + ARROW ICON */
import{getActiveTab,getTabById,updateTabTitle,onTabsChange,getActiveSessionId}from'../services/header-tabs-store';
import{getCurrentSession}from'../../chat-screen/services/chat-store';
import{setExplicitNewTabClicked,clearInjectedColor}from'../../welcome-screen/welcome-ts/welcome-ui';
const IC_MORE=`<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>`;
const IC_RENAME=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`;
const IC_TRASH=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
const IC_CLOSE=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`;
const MOUTH_CLASSES=['','happy','thinking','surprised','excited','love','confused','sleepy'];
let currentMouthIndex=0,injected=false,editingTabId:string|null=null,editOrigTitle='';
let tabMenuEl:HTMLElement|null=null,tabMenuForId:string|null=null;
let headerAreaEl:HTMLElement|null=null,avatarBtn:HTMLElement|null=null,titleWrapEl:HTMLElement|null=null;
let reopenLineEl:HTMLElement|null=null,reopenArrowEl:HTMLElement|null=null,closeBtnEl:HTMLElement|null=null;
let leftHandEl:HTMLElement|null=null,rightHandEl:HTMLElement|null=null;
let isWelcomeMode=true,headerToastEl:HTMLElement|null=null,headerToastTimer:ReturnType<typeof setTimeout>|null=null;
let gazeRafId:number|null=null,faceGroupEl:HTMLElement|null=null,eyeEls:NodeListOf<HTMLElement>|null=null;
let mouthEl:HTMLElement|null=null,blinkTimer:ReturnType<typeof setTimeout>|null=null;
let isSyncing=false,isRendering=false,eventCapturedTitle:string|null=null,hasWaved=false;
let wasInChatMode=false,observerPaused=false;
const WELCOME_STATE_KEY='asuum_welcome_mode';
function saveWelcomeState(v:boolean):void{try{if(v)localStorage.setItem(WELCOME_STATE_KEY,'1');else localStorage.removeItem(WELCOME_STATE_KEY);}catch(_){}}
function loadWelcomeState():boolean{try{return localStorage.getItem(WELCOME_STATE_KEY)==='1';}catch(_){return true;}}
function toast(msg:string):void{if(!headerToastEl){headerToastEl=document.createElement('div');headerToastEl.className='hdr-toast';document.body.appendChild(headerToastEl);}if(headerToastTimer)clearTimeout(headerToastTimer);headerToastEl.classList.remove('show');void headerToastEl.offsetWidth;headerToastEl.textContent=msg;headerToastEl.classList.add('show');headerToastTimer=setTimeout(()=>{headerToastEl?.classList.remove('show');},3000);}
function onAvatarClick(e:MouseEvent):void{e.stopPropagation();closeMenu();if(editingTabId){editingTabId=null;renderTitle();}currentMouthIndex=(currentMouthIndex+1)%MOUTH_CLASSES.length;setMouth(currentMouthIndex);triggerWave();}
function setMouth(i:number):void{if(!mouthEl)return;MOUTH_CLASSES.forEach(c=>{if(c)mouthEl!.classList.remove(c);});if(MOUTH_CLASSES[i])mouthEl.classList.add(MOUTH_CLASSES[i]);}
function onCloseHeader():void{if(!headerAreaEl)return;closeMenu();if(editingTabId){editingTabId=null;renderTitle();}headerAreaEl.classList.contains('awning-open')?headerAreaEl.classList.remove('awning-open'):headerAreaEl.classList.add('header-closed');}
function onReopenLine():void{if(!headerAreaEl)return;closeMenu();if(editingTabId){editingTabId=null;renderTitle();}headerAreaEl.classList.remove('header-closed');headerAreaEl.classList.add('awning-open');}
function triggerWave():void{if(hasWaved||!leftHandEl||!rightHandEl||!mouthEl)return;hasWaved=true;setMouth(1);leftHandEl.classList.add('hand-visible');rightHandEl.classList.add('hand-visible');rightHandEl.classList.add('hand-wave');setTimeout(()=>{if(leftHandEl)leftHandEl.classList.remove('hand-visible');if(rightHandEl){rightHandEl.classList.remove('hand-visible');rightHandEl.classList.remove('hand-wave');}},2000);}
function resetWave():void{hasWaved=false;}
function startHeaderShimmer():void{if(titleWrapEl)titleWrapEl.classList.add('laser-shimmer-active');}
function stopHeaderShimmer():void{if(titleWrapEl)titleWrapEl.classList.remove('laser-shimmer-active');}
function wireGazeTracking():void{const upd=(cx:number,cy:number):void=>{if(!avatarBtn||!faceGroupEl||!eyeEls)return;const r=avatarBtn.getBoundingClientRect(),ax=r.left+r.width/2,ay=r.top+r.height/2,dx=cx-ax,dy=cy-ay,d=Math.hypot(dx,dy);if(d>400){faceGroupEl.style.transform='translate(0,0)';eyeEls.forEach(e=>e.style.transform='translate(0,0)');return;}const a=Math.atan2(dy,dx),n=Math.min(d/400,1),fm=n*n*1.2,em=n*2.5;faceGroupEl.style.transform=`translate(${(Math.cos(a)*fm).toFixed(2)}px,${(Math.sin(a)*fm).toFixed(2)}px)`;eyeEls.forEach(e=>e.style.transform=`translate(${(Math.cos(a)*em).toFixed(2)}px,${(Math.sin(a)*em).toFixed(2)}px)`);};document.addEventListener('mousemove',(e:MouseEvent)=>{if(gazeRafId)cancelAnimationFrame(gazeRafId);gazeRafId=requestAnimationFrame(()=>upd(e.clientX,e.clientY));});}
function wireBlink():void{const db=():void=>{if(!avatarBtn){blinkTimer=setTimeout(db,2500);return;}const c=avatarBtn.querySelector('.pure-circle')as HTMLElement|null;if(!c){blinkTimer=setTimeout(db,2000);return;}c.classList.add('blinking');setTimeout(()=>c?.classList.remove('blinking'),150);blinkTimer=setTimeout(db,2500+Math.random()*3500);};blinkTimer=setTimeout(db,2500);}
function instantRender():void{renderTitle();syncPanel();}
/**
 * ENTER WELCOME MODE
 * Pause observer briefly → set classes → resume after DOM settles
 */
function enterWelcomeMode():void{
  isWelcomeMode=true;saveWelcomeState(true);
  eventCapturedTitle=null;editingTabId=null;editOrigTitle='';
  closeMenu();resetWave();
  observerPaused=true;
  if(headerAreaEl){
    headerAreaEl.classList.add('welcome-header');
    headerAreaEl.classList.remove('welcome-collapsed');
    headerAreaEl.classList.remove('header-closed');
    headerAreaEl.classList.remove('awning-open');
    headerAreaEl.classList.remove('has-tabs');
    headerAreaEl.classList.remove('header-hidden');
    Object.assign(headerAreaEl.style,{display:'',opacity:'1',pointerEvents:''});
  }
  const p=document.getElementById('mainPanel');
  if(p)p.classList.remove('has-tabs');
  renderTitle();
  setTimeout(()=>{observerPaused=false;triggerWave();},50);
}
/**
 * EXIT WELCOME MODE
 * Set wasInChatMode FIRST → pause observer → remove welcome classes → resume
 */
function exitWelcomeMode(title?:string):void{
  isWelcomeMode=false;saveWelcomeState(false);
  wasInChatMode=true;
  if(title)eventCapturedTitle=title;
  resetWave();
  if(leftHandEl)leftHandEl.classList.remove('hand-visible');
  if(rightHandEl){rightHandEl.classList.remove('hand-visible');rightHandEl.classList.remove('hand-wave');}
  observerPaused=true;
  if(headerAreaEl){
    headerAreaEl.classList.remove('welcome-header');
    headerAreaEl.classList.remove('welcome-collapsed');
    headerAreaEl.classList.remove('header-closed');
    headerAreaEl.classList.remove('awning-open');
    headerAreaEl.classList.remove('has-tabs');
    headerAreaEl.classList.remove('header-hidden');
    Object.assign(headerAreaEl.style,{display:'',opacity:'1',pointerEvents:''});
  }
  const p=document.getElementById('mainPanel');
  if(p){p.classList.remove('has-tabs');p.classList.remove('new-tab-mode');}
  requestAnimationFrame(()=>{renderTitle();setTimeout(()=>{observerPaused=false;},50);});
}
export function initializeHeaderUI():void{
  console.log('😊 Header UI (V1 + Wave + Laser Shimmer + Arrow Icon)');
  headerAreaEl=document.getElementById('headerArea');
  const savedWelcome=loadWelcomeState();
  const p=document.getElementById('mainPanel');
  const cs=getCurrentSession();
  const hasActiveChat=(p?.classList.contains('chat-active')??false)&&!!cs?.id;
  isWelcomeMode=savedWelcome||!hasActiveChat;
  wasInChatMode=!isWelcomeMode&&hasActiveChat;
  if(!isWelcomeMode&&cs?.title)eventCapturedTitle=cs.title;else eventCapturedTitle=null;
  setExplicitNewTabClicked(false);injectStructure();wireGlobalClose();watchPanel();wireGazeTracking();wireBlink();
  document.addEventListener('asuum:ai-thinking-start',()=>startHeaderShimmer());
  document.addEventListener('asuum:ai-thinking-stop',()=>stopHeaderShimmer());
  onTabsChange(()=>{if(isWelcomeMode)return;instantRender();});
  document.addEventListener('asuum:welcome-mode',()=>{enterWelcomeMode();setExplicitNewTabClicked(false);clearInjectedColor();});
  document.addEventListener('asuum:chat-mode',((e:Event)=>{const ce=e as CustomEvent;const t=ce?.detail?.title||'';exitWelcomeMode(t);})as EventListener);
  document.addEventListener('asuum:message-sent',()=>{if(isWelcomeMode){const s=getCurrentSession();exitWelcomeMode(s?.title||'New Chat');}});
  document.addEventListener('asuum:session-opened',((e:Event)=>{const ce=e as CustomEvent;const t=ce?.detail?.title||'Chat';exitWelcomeMode(t);const p2=document.getElementById('mainPanel');if(p2)p2.classList.add('chat-active');})as EventListener);
  document.addEventListener('asuum:title-updated',((e:Event)=>{const ce=e as CustomEvent;if(ce?.detail?.title){eventCapturedTitle=ce.detail.title;if(!isWelcomeMode)instantRender();}})as EventListener);
  instantRender();if(isWelcomeMode)setTimeout(()=>triggerWave(),600);
}
function injectStructure():void{
  if(injected)return;const hc=document.getElementById('headerContainer');if(!hc||!headerAreaEl)return;
  reopenLineEl=document.createElement('div');reopenLineEl.className='reopen-line';reopenLineEl.title='Open Header';
  reopenLineEl.addEventListener('click',(e:MouseEvent)=>{e.stopPropagation();onReopenLine();});
  reopenLineEl.addEventListener('mouseenter',()=>{if(reopenArrowEl)reopenArrowEl.classList.add('visible');});
  reopenLineEl.addEventListener('mouseleave',()=>{if(reopenArrowEl)reopenArrowEl.classList.remove('visible');});
  headerAreaEl.appendChild(reopenLineEl);
  reopenArrowEl=document.createElement('div');reopenArrowEl.className='reopen-arrow-icon';reopenArrowEl.innerHTML='<svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>';headerAreaEl.appendChild(reopenArrowEl);
  const tr=document.createElement('div');tr.className='header-top-row';
  tr.addEventListener('click',(e:MouseEvent)=>{
    if(!headerAreaEl)return;
    const tgt=e.target as HTMLElement;
    if(tgt.closest('.header-avatar-toggle')||tgt.closest('.header-close-btn'))return;
    if(!isWelcomeMode)return;
    if(!headerAreaEl.classList.contains('welcome-collapsed')){
      e.stopPropagation();headerAreaEl.classList.add('welcome-collapsed');
    }else{
      e.stopPropagation();headerAreaEl.classList.remove('welcome-collapsed');setTimeout(()=>triggerWave(),300);
    }
  });
  avatarBtn=document.createElement('div');avatarBtn.className='header-avatar-toggle';avatarBtn.title='Change expression';avatarBtn.addEventListener('click',onAvatarClick);
  avatarBtn.addEventListener('mouseenter',()=>{if(isWelcomeMode&&!headerAreaEl?.classList.contains('welcome-collapsed')){resetWave();setTimeout(()=>triggerWave(),50);}});
  const ci2=document.createElement('div');ci2.className='pure-circle';faceGroupEl=document.createElement('div');faceGroupEl.className='face-group';
  const eyes=document.createElement('div');eyes.className='capsule-eyes';eyes.appendChild(Object.assign(document.createElement('div'),{className:'capsule-eye'}));eyes.appendChild(Object.assign(document.createElement('div'),{className:'capsule-eye'}));
  mouthEl=document.createElement('div');mouthEl.className='mouth';faceGroupEl.appendChild(eyes);faceGroupEl.appendChild(mouthEl);ci2.appendChild(faceGroupEl);avatarBtn.appendChild(ci2);
  const lh=document.createElement('div');lh.className='avatar-hand avatar-hand-left';leftHandEl=lh;avatarBtn.appendChild(lh);
  const rh=document.createElement('div');rh.className='avatar-hand avatar-hand-right';rightHandEl=rh;avatarBtn.appendChild(rh);
  tr.appendChild(avatarBtn);eyeEls=avatarBtn.querySelectorAll('.capsule-eye')as NodeListOf<HTMLElement>;
  titleWrapEl=document.createElement('div');titleWrapEl.className='header-title-area';titleWrapEl.id='headerTitleArea';tr.appendChild(titleWrapEl);
  closeBtnEl=document.createElement('button');closeBtnEl.className='header-close-btn';closeBtnEl.title='Collapse';closeBtnEl.innerHTML=IC_CLOSE;closeBtnEl.addEventListener('click',(e:MouseEvent)=>{e.stopPropagation();onCloseHeader();});tr.appendChild(closeBtnEl);
  hc.appendChild(tr);injected=true;
}
function title():string{if(isWelcomeMode)return'';if(eventCapturedTitle)return eventCapturedTitle;const s=getCurrentSession();if(s?.title)return s.title;const at=getActiveTab();if(at?.title)return at.title;return'New Chat';}
function renderTitle():void{
  if(isRendering)return;isRendering=true;
  try{if(!titleWrapEl)return;
    if(isWelcomeMode){titleWrapEl.innerHTML='';return;}
    const t=title();if(!t){titleWrapEl.innerHTML='';return;}
    const at=getActiveTab();const wasShimmer=titleWrapEl.classList.contains('laser-shimmer-active');titleWrapEl.innerHTML='';if(wasShimmer)titleWrapEl.classList.add('laser-shimmer-active');
    if(editingTabId&&at&&editingTabId===at.id){const w=document.createElement('div');w.className='single-title-wrap editing';const inp=document.createElement('input');inp.type='text';inp.className='single-title-input';inp.value=t;inp.maxLength=60;const sv=():void=>{const v=inp.value.trim();if(v&&v!==editOrigTitle&&at){updateTabTitle(at.id,v);eventCapturedTitle=v;}editingTabId=null;renderTitle();};inp.onkeydown=(e:KeyboardEvent):void=>{if(e.key==='Enter'){e.preventDefault();sv();}else if(e.key==='Escape'){e.preventDefault();editingTabId=null;renderTitle();}};inp.onblur=sv;inp.onclick=(e:MouseEvent):void=>{e.stopPropagation();};w.appendChild(inp);titleWrapEl.appendChild(w);requestAnimationFrame(()=>{inp.focus();inp.select();});}
    else{const w=document.createElement('div');w.className='single-title-wrap';const te=document.createElement('h1');te.className='single-title-text';te.textContent=t;te.title=t;if(at)te.addEventListener('dblclick',(e:MouseEvent):void=>{e.stopPropagation();startEditingTab(at.id);});const mb=document.createElement('button');mb.className='single-title-menu-btn';mb.innerHTML=IC_MORE;if(at)mb.onclick=(e:MouseEvent):void=>{e.stopPropagation();openMenu(at.id,mb);};else mb.style.display='none';w.appendChild(te);w.appendChild(mb);titleWrapEl.appendChild(w);}
  }finally{isRendering=false;}
}
function openMenu(id:string,anchor:HTMLElement):void{closeMenu();tabMenuForId=id;tabMenuEl=document.createElement('div');tabMenuEl.className='tab-menu';tabMenuEl.innerHTML=`<button class="tab-menu-item" data-action="rename">${IC_RENAME}<span>Rename</span></button><button class="tab-menu-item danger" data-action="delete">${IC_TRASH}<span>Delete</span></button>`;document.body.appendChild(tabMenuEl);const r=anchor.getBoundingClientRect(),mw=tabMenuEl.offsetWidth,mh=tabMenuEl.offsetHeight;tabMenuEl.style.left=`${Math.max(8,Math.min(r.right-mw,window.innerWidth-mw-8))}px`;let top=r.bottom+6;if(top+mh>window.innerHeight-8)top=r.top-mh-6;tabMenuEl.style.top=`${top}px`;tabMenuEl.querySelector('[data-action="rename"]')?.addEventListener('click',():void=>{closeMenu();if(tabMenuForId)startEditingTab(tabMenuForId);});tabMenuEl.querySelector('[data-action="delete"]')?.addEventListener('click',():void=>{closeMenu();});}
function closeMenu():void{if(tabMenuEl){tabMenuEl.remove();tabMenuEl=null;tabMenuForId=null;}}
function wireGlobalClose():void{document.addEventListener('click',(e:Event):void=>{if(tabMenuEl&&!tabMenuEl.contains(e.target as Node))closeMenu();});}
function syncPanel():void{if(isSyncing||observerPaused)return;isSyncing=true;try{const p=document.getElementById('mainPanel');if(!p||!headerAreaEl)return;const ca=p.classList.contains('chat-active');if(isWelcomeMode&&!ca){if(!headerAreaEl.classList.contains('welcome-header'))headerAreaEl.classList.add('welcome-header');headerAreaEl.classList.remove('has-tabs');p.classList.remove('has-tabs');}else if(!isWelcomeMode&&ca){if(headerAreaEl.classList.contains('welcome-header'))headerAreaEl.classList.remove('welcome-header');headerAreaEl.classList.remove('welcome-collapsed');headerAreaEl.classList.remove('has-tabs');p.classList.remove('has-tabs');p.classList.remove('new-tab-mode');}headerAreaEl.classList.remove('header-hidden');Object.assign(headerAreaEl.style,{display:'',opacity:'1',pointerEvents:''});}finally{requestAnimationFrame(()=>{isSyncing=false;});}}
function watchPanel():void{const p=document.getElementById('mainPanel');if(!p)return;new MutationObserver(():void=>{if(isSyncing||isRendering||observerPaused)return;const ca=p.classList.contains('chat-active');const cs=getCurrentSession();const hasSession=!!cs&&!!cs.id;if(wasInChatMode&&(!ca||!hasSession)){wasInChatMode=false;enterWelcomeMode();return;}if(!wasInChatMode&&ca&&hasSession){wasInChatMode=true;if(!eventCapturedTitle)eventCapturedTitle=cs?.title||'New Chat';exitWelcomeMode(cs?.title||'New Chat');return;}syncPanel();renderTitle();}).observe(p,{attributes:true,attributeFilter:['class']});}
export function startEditingTab(id:string):void{editingTabId=id;editOrigTitle=getTabById(id)?.title??'';renderTitle();}
export function updateActiveTabTitle(t:string):void{const at=getActiveTab();if(at){updateTabTitle(at.id,t);eventCapturedTitle=t;if(!isWelcomeMode)instantRender();}}
export function getActiveTabSessionId():string|null{return getActiveSessionId();}