/** chat-ui.ts — V1 + REGENERATE WITH DELETE-BELOW */
import { eventBus } from '../../../event-bus';
import { routeChatRequest, ChatMessage } from '../../../core/ai-router';
import { appendToCurrent, appendToSession, getCurrentSession, onSessionChange, updateMessageText, createSession, startNewChat, renameSession, deleteSession, removeLastAiMessage, deleteMessagesFromIndex, getMessagesUpTo, ChatSession } from '../services/chat-store';
import { getActiveTab, assignSessionToTab, createTab, setTabTitleAuto, hasUserRenamed } from '../../header/services/header-tabs-store';
import { LoadingManager } from '../../../core/loading';

let _openRulesModal:(()=>void)|null=null,_refreshRulesDot:(()=>void)|null=null;
function getOpenRulesModal():()=>void{if(!_openRulesModal){_openRulesModal=():void=>{const o=document.getElementById('crOverlay');if(o)o.classList.add('active')};}return _openRulesModal;}
function getRefreshRulesDot():()=>void{if(!_refreshRulesDot){_refreshRulesDot=():void=>{const d=document.getElementById('mmRulesDot');if(d){try{const s=localStorage.getItem('asuum-chat-rules');d.classList.toggle('on',!!s&&s!=='{"quick":[],"custom":""}');}catch{d.classList.remove('on')}}};}return _refreshRulesDot;}

const ICON_EDIT=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`;
const ICON_COPY=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const ICON_CHECK=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;const ICON_SAVE=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
const ICON_LIKE=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>`;
const ICON_DISLIKE=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>`;
const ICON_REGEN=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`;
const ICON_SHARE=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`;
const ICON_CODE_COPY=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const ICON_UP=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`;
const ICON_DOWN=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

interface PendingEdit{row:HTMLElement;bubble:HTMLElement;idx:number}
let pendingEdit:PendingEdit|null=null,isRegenerating=false,currentRenderedSessionId:string|null=null,userHasScrolledUp=false,newMessagesCount=0;
let scrollbarEl:HTMLElement|null=null,scrollbarThumb:HTMLElement|null=null,scrollbarTrack:HTMLElement|null=null,scrollbarHideTimeout:ReturnType<typeof setTimeout>|null=null;
let isDraggingScrollbar=false,dragStartY=0,dragStartScroll=0,rafId:number|null=null;
let systemEl:HTMLElement|null=null,pillarEl:HTMLElement|null=null,windowEl:HTMLElement|null=null;
let historyListEl:HTMLElement|null=null;
let historyScrollbarEl:HTMLElement|null=null,historyScrollbarThumb:HTMLElement|null=null,historyScrollbarTrack:HTMLElement|null=null;
let historyScrollUpBtn:HTMLElement|null=null,historyScrollDownBtn:HTMLElement|null=null,historyScrollInterval:ReturnType<typeof setInterval>|null=null,histSyncRaf:number|null=null;
let pillarItemEls:HTMLElement[]=[],pillarMessageRefs:HTMLElement[]=[],historyItemEls:HTMLElement[]=[],historyMessageRefs:HTMLElement[]=[];
let isDraggingHistory=false,historyDragStartY=0,historyDragStartScroll=0;
let thinkingRow:HTMLElement|null=null;
let lastUserBubbleEl:HTMLElement|null=null;
const HIST_STRIDE=24;

function silentCopy(text:string):void{const ta=document.createElement('textarea');ta.value=text;ta.style.cssText='position:fixed;left:-9999px;top:-9999px;opacity:0;width:1px;height:1px;padding:0;border:none;outline:none;box-shadow:none;background:transparent';document.body.appendChild(ta);ta.focus();ta.select();try{document.execCommand('copy')}catch(_){}document.body.removeChild(ta)}

function appendThinkingRow():void{const l=document.getElementById('chatMessages');if(!l)return;removeThinkingRow();const row=document.createElement('div');row.className='message-row ai';row.id='aiThinkingRow';const group=document.createElement('div');group.className='message-group';const bubble=document.createElement('div');bubble.className='message-bubble';bubble.innerHTML=`<div class="thinking-indicator"><span class="thinking-dot"></span><span class="thinking-dot"></span><span class="thinking-dot"></span><span class="thinking-text">Asuum is thinking</span></div>`;group.appendChild(bubble);row.appendChild(group);const spacer=document.getElementById('chatEndSpacer');if(spacer&&spacer.parentNode===l){l.insertBefore(row,spacer)}else{l.appendChild(row)}thinkingRow=row}
function removeThinkingRow():void{const existing=document.getElementById('aiThinkingRow');if(existing)existing.remove();thinkingRow=null}

function startBubbleShimmer():void{
  const ml=document.getElementById('chatMessages');
  if(!ml)return;
  const rows=ml.querySelectorAll('.message-row.user');
  if(rows.length>0){
    lastUserBubbleEl=rows[rows.length-1]as HTMLElement;
    lastUserBubbleEl.classList.add('bubble-shimmer');
  }
}
function stopBubbleShimmer():void{
  if(lastUserBubbleEl){
    lastUserBubbleEl.classList.remove('bubble-shimmer');
    lastUserBubbleEl=null;
  }
}

export function initializeChatUI():void{
  console.log('💬 Chat UI (Secure Router + Regenerate Delete-Below)');
  eventBus.on('NEW_MESSAGE',async(payload:any)=>{
    const text=payload?.text??'';if(!text)return;
    const panel=document.getElementById('mainPanel'),isOnWelcome=panel&&!panel.classList.contains('chat-active');
    const currentSession=getCurrentSession(),isEmptySession=!currentSession||currentSession.messages.length===0;
    let session=currentSession;const preview=text.length>30?`${text.slice(0,30)}…`:text;
    if(isOnWelcome||isEmptySession){
      session=createSession();const activeTab=getActiveTab();
      if(activeTab&&activeTab.sessionId===null){assignSessionToTab(activeTab.id,session.id);if(!hasUserRenamed(activeTab.id))setTabTitleAuto(activeTab.id,preview)}
      else createTab(session.id,preview);
    }
    showChatScreen();
    appendMessageNoScroll(text,'user');
    appendToCurrent(text,'user');
    appendThinkingRow();
    scrollToBottomSmart();
    await generateAiReply();
  });
  onSessionChange(()=>{cancelEdit();stopBubbleShimmer();const session=getCurrentSession(),newSessionId=session?.id??null;if(newSessionId!==currentRenderedSessionId){currentRenderedSessionId=newSessionId;userHasScrolledUp=false;newMessagesCount=0;updateScrollToBottomButton();renderCurrentSession()}});
  document.addEventListener('asuum:confirm-edit',confirmEdit);
  const input=document.querySelector('.chat-input')as HTMLTextAreaElement|null;
  if(input)input.addEventListener('keydown',(e:KeyboardEvent)=>{if(e.key==='Escape'&&pendingEdit){e.preventDefault();cancelEdit()}});
  wireMainMenu();wireScrollDetection();wireScrollToBottomButton();initializeCustomScrollbar();initializeTimelineSystem();
}

function scrollToBottomSmart():void{const l=document.getElementById('chatMessages');if(!l||userHasScrolledUp)return;requestAnimationFrame(()=>{l.scrollTo({top:l.scrollHeight,behavior:'smooth'})})}

function initializeTimelineSystem():void{
  const cs=document.querySelector('.chat-screen');
  if(!cs||systemEl)return;
  systemEl=document.createElement('div');systemEl.className='timeline-system tl-hidden';
  pillarEl=document.createElement('div');pillarEl.className='timeline-pillar';
  windowEl=document.createElement('div');windowEl.className='timeline-window';
  historyListEl=document.createElement('div');historyListEl.className='history-list';
  historyScrollbarEl=document.createElement('div');historyScrollbarEl.className='history-scrollbar';
  historyScrollUpBtn=document.createElement('button');historyScrollUpBtn.className='history-scroll-btn';historyScrollUpBtn.innerHTML=ICON_UP;historyScrollUpBtn.title='Scroll up';
  historyScrollbarTrack=document.createElement('div');historyScrollbarTrack.className='history-scrollbar-track';
  historyScrollbarThumb=document.createElement('div');historyScrollbarThumb.className='history-scrollbar-thumb';
  historyScrollDownBtn=document.createElement('button');historyScrollDownBtn.className='history-scroll-btn';historyScrollDownBtn.innerHTML=ICON_DOWN;historyScrollDownBtn.title='Scroll down';
  historyScrollbarTrack.appendChild(historyScrollbarThumb);
  historyScrollbarEl.appendChild(historyScrollUpBtn);
  historyScrollbarEl.appendChild(historyScrollbarTrack);
  historyScrollbarEl.appendChild(historyScrollDownBtn);
  windowEl.appendChild(historyListEl);
  windowEl.appendChild(historyScrollbarEl);
  systemEl.appendChild(pillarEl);
  systemEl.appendChild(windowEl);
  cs.appendChild(systemEl);

  document.addEventListener('asuum:ai-thinking-start',()=>{
    if(systemEl)systemEl.classList.add('laser-shimmer-active');
    startBubbleShimmer();
  });
  document.addEventListener('asuum:ai-thinking-stop',()=>{
    if(systemEl)systemEl.classList.remove('laser-shimmer-active');
    stopBubbleShimmer();
  });

  historyScrollbarTrack.addEventListener('mousedown',startHistoryDrag);
  document.addEventListener('mousemove',onHistoryDrag);
  document.addEventListener('mouseup',stopHistoryDrag);
  historyListEl.addEventListener('scroll',onHistoryScroll,{passive:true});

  const bindHistArrow=(btn:HTMLElement|null,dir:number)=>{if(!btn)return;btn.addEventListener('mousedown',(e)=>{e.preventDefault();startHistAutoScroll(dir)});btn.addEventListener('mouseup',stopHistAutoScroll);btn.addEventListener('mouseleave',stopHistAutoScroll)};
  bindHistArrow(historyScrollUpBtn,-1);
  bindHistArrow(historyScrollDownBtn,1);

  rebuildAll();
  const ml=document.getElementById('chatMessages');
  if(ml){new MutationObserver(()=>rebuildAll()).observe(ml,{childList:true,subtree:true});ml.addEventListener('scroll',updateActiveStates.bind(null,false),{passive:true})}
}

function startHistAutoScroll(dir:number):void{stopHistAutoScroll();if(!historyListEl)return;historyListEl.scrollTop+=dir*30;historyScrollInterval=setInterval(()=>{if(historyListEl)historyListEl.scrollTop+=dir*30},80)}
function stopHistAutoScroll():void{if(historyScrollInterval){clearInterval(historyScrollInterval);historyScrollInterval=null}}
function onHistoryScroll():void{updateHistoryScrollbarThumb();if(histSyncRaf!==null)return;histSyncRaf=requestAnimationFrame(()=>{histSyncRaf=null;rebuildPillar();updateActiveStates(true)})}
function updateTimelineVisibility():void{const ml=document.getElementById('chatMessages');if(!ml||!systemEl)return;const uc=ml.querySelectorAll('.message-row.user').length;if(uc>=2)systemEl.classList.remove('tl-hidden');else systemEl.classList.add('tl-hidden')}
function calcCapsuleHeight(count:number):number{const capped=Math.min(8,Math.max(2,count));return capped*24+14;}
function applyCapsuleHeight(count:number):void{const h=calcCapsuleHeight(count);if(pillarEl)pillarEl.style.height=h+'px';if(windowEl)windowEl.style.height=h+'px';if(historyListEl)historyListEl.style.height=h+'px';if(historyScrollbarEl)historyScrollbarEl.style.height=h+'px';}
function rebuildAll():void{updateTimelineVisibility();rebuildHistory();rebuildPillar();updateActiveStates(false)}

function rebuildPillar():void{
  if(!pillarEl||!historyListEl)return;
  pillarEl.querySelectorAll('.timeline-item').forEach(el=>el.remove());
  pillarItemEls=[];pillarMessageRefs=[];
  const total=historyMessageRefs.length;
  if(total<2)return;
  let start=Math.floor(historyListEl.scrollTop/HIST_STRIDE);
  const maxStart=Math.max(0,total-8);
  start=Math.max(0,Math.min(start,maxStart));
  const count=Math.min(8,total-start);
  for(let i=0;i<count;i++){
    const idx=start+i;const msg=historyMessageRefs[idx];const hItem=historyItemEls[idx];
    const title=hItem?(hItem.querySelector('.history-title')?.textContent||''):'';
    pillarMessageRefs.push(msg);
    const item=document.createElement('div');item.className='timeline-item';item.dataset.index=String(idx);
    const label=document.createElement('div');label.className='timeline-label';label.textContent=title;
    const dash=document.createElement('div');dash.className='timeline-dash';
    item.addEventListener('click',()=>msg.scrollIntoView({behavior:'smooth',block:'center'}));
    item.appendChild(label);item.appendChild(dash);
    pillarEl.appendChild(item);pillarItemEls.push(item);
  }
  applyCapsuleHeight(total);
}

function rebuildHistory():void{
  if(!historyListEl)return;
  const ml=document.getElementById('chatMessages');if(!ml)return;
  historyListEl.innerHTML='';historyItemEls=[];historyMessageRefs=[];
  const um=Array.from(ml.querySelectorAll('.message-row.user'))as HTMLElement[];
  if(um.length<2)return;
  historyMessageRefs=um;
  historyMessageRefs.forEach((msg,i)=>{
    const t=msg.querySelector('.message-bubble')?.textContent||'';
    const p=t.length>40?t.slice(0,40)+'…':t;
    const item=document.createElement('div');item.className='history-item';item.dataset.index=String(i);
    const dot=document.createElement('div');dot.className='history-dot';
    const title=document.createElement('div');title.className='history-title';title.textContent=p;
    item.addEventListener('click',()=>msg.scrollIntoView({behavior:'smooth',block:'center'}));
    item.appendChild(dot);item.appendChild(title);
    historyListEl!.appendChild(item);historyItemEls.push(item);
  });
  historyListEl.scrollTop=historyListEl.scrollHeight;
  applyCapsuleHeight(historyMessageRefs.length);
  updateHistoryScrollbarThumb();
}

function updateActiveStates(noAutoScroll=false):void{
  const ml=document.getElementById('chatMessages');if(!ml)return;
  const st=ml.scrollTop,sh=ml.scrollHeight-ml.clientHeight;
  if(sh<=0)return;
  const vc=st+ml.clientHeight/2;
  let pc=0,pd=Infinity;
  pillarMessageRefs.forEach((m,i)=>{const d=Math.abs((m.offsetTop+m.offsetHeight/2)-vc);if(d<pd){pd=d;pc=i}});
  pillarItemEls.forEach((it,i)=>it.classList.toggle('active',i===pc));
  let hc=0,hd=Infinity;
  historyMessageRefs.forEach((m,i)=>{const d=Math.abs((m.offsetTop+m.offsetHeight/2)-vc);if(d<hd){hd=d;hc=i}});
  historyItemEls.forEach((it,i)=>it.classList.toggle('active',i===hc));
  if(!noAutoScroll&&historyListEl&&historyItemEls[hc]){
    const ae=historyItemEls[hc],lr=historyListEl.getBoundingClientRect(),ir=ae.getBoundingClientRect();
    if(ir.top<lr.top||ir.bottom>lr.bottom)ae.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  updateHistoryScrollbarThumb();
}

function updateHistoryScrollbarThumb():void{
  if(!historyListEl||!historyScrollbarThumb||!historyScrollbarTrack||!historyScrollbarEl)return;
  const{scrollTop,scrollHeight,clientHeight}=historyListEl;
  if(scrollHeight<=clientHeight){historyScrollbarEl.style.opacity='0';historyScrollbarEl.style.pointerEvents='none';return}
  historyScrollbarEl.style.opacity='1';historyScrollbarEl.style.pointerEvents='auto';
  const th=historyScrollbarTrack.clientHeight,r=clientHeight/scrollHeight;
  const tH=Math.max(12,th*r),tT=(scrollTop/(scrollHeight-clientHeight))*(th-tH);
  historyScrollbarThumb.style.height=`${tH}px`;historyScrollbarThumb.style.top=`${tT}px`;
}
function startHistoryDrag(e:MouseEvent):void{if(!historyScrollbarThumb||!historyScrollbarTrack||!historyListEl)return;e.preventDefault();isDraggingHistory=true;historyDragStartY=e.clientY;historyDragStartScroll=historyListEl.scrollTop;historyScrollbarThumb.classList.add('dragging');document.body.style.userSelect='none'}
function onHistoryDrag(e:MouseEvent):void{if(!isDraggingHistory||!historyScrollbarThumb||!historyScrollbarTrack||!historyListEl)return;const dy=e.clientY-historyDragStartY,tkH=historyScrollbarTrack.clientHeight-historyScrollbarThumb.clientHeight,scH=historyListEl.scrollHeight-historyListEl.clientHeight;if(tkH<=0)return;historyListEl.scrollTop=historyDragStartScroll+(dy/tkH)*scH}
function stopHistoryDrag():void{if(!isDraggingHistory)return;isDraggingHistory=false;historyScrollbarThumb?.classList.remove('dragging');document.body.style.userSelect=''}

function smartAutoScroll():void{const l=document.getElementById('chatMessages');if(!l||userHasScrolledUp)return;requestAnimationFrame(()=>{const rows=l.querySelectorAll('.message-row,.chat-end-marker-wrapper');if(!rows.length)return;const last=rows[rows.length-1]as HTMLElement;l.scrollTo({top:last.offsetTop+last.offsetHeight-l.clientHeight+3,behavior:'smooth'})})}

function initializeCustomScrollbar():void{const cs=document.querySelector('.chat-screen'),ml=document.getElementById('chatMessages');if(!cs||!ml||scrollbarEl)return;const hz=document.createElement('div');hz.className='chat-scrollbar-hover-zone';hz.addEventListener('mouseenter',showScrollbar);cs.appendChild(hz);scrollbarEl=document.createElement('div');scrollbarEl.className='chat-scrollbar';const au=document.createElement('div');au.className='scroll-arrow-up';au.innerHTML=ICON_UP;let upIv:ReturnType<typeof setInterval>|null=null;au.addEventListener('mousedown',()=>{showScrollbar();ml.scrollTo({top:0,behavior:'smooth'});upIv=setInterval(()=>{ml.scrollTop-=12},16)});const stopUp=()=>{if(upIv){clearInterval(upIv);upIv=null}};au.addEventListener('mouseup',stopUp);au.addEventListener('mouseleave',stopUp);scrollbarTrack=document.createElement('div');scrollbarTrack.className='chat-scrollbar-track';scrollbarThumb=document.createElement('div');scrollbarThumb.className='chat-scrollbar-thumb';const ad=document.createElement('div');ad.className='scroll-arrow-down';ad.innerHTML=ICON_DOWN;let dnIv:ReturnType<typeof setInterval>|null=null;ad.addEventListener('mousedown',()=>{showScrollbar();ml.scrollTo({top:ml.scrollHeight,behavior:'smooth'});dnIv=setInterval(()=>{ml.scrollTop+=12},16)});const stopDn=()=>{if(dnIv){clearInterval(dnIv);dnIv=null}};ad.addEventListener('mouseup',stopDn);ad.addEventListener('mouseleave',stopDn);scrollbarTrack.appendChild(scrollbarThumb);scrollbarEl.appendChild(au);scrollbarEl.appendChild(scrollbarTrack);scrollbarEl.appendChild(ad);cs.appendChild(scrollbarEl);ml.addEventListener('scroll',handleScrollUpdate,{passive:true});scrollbarTrack.addEventListener('mousedown',startScrollbarDrag);document.addEventListener('mousemove',onScrollbarDrag,{passive:true});document.addEventListener('mouseup',stopScrollbarDrag);ml.addEventListener('mouseenter',showScrollbar);setTimeout(()=>{updateScrollbarThumbSize();syncThumbPosition()},60);new MutationObserver(()=>{updateScrollbarThumbSize();syncThumbPosition()}).observe(ml,{childList:true,subtree:true})}
function showScrollbar():void{if(!scrollbarEl)return;scrollbarEl.classList.add('visible');if(scrollbarHideTimeout)clearTimeout(scrollbarHideTimeout);scrollbarHideTimeout=setTimeout(()=>{if(!isDraggingScrollbar&&scrollbarEl)scrollbarEl.classList.remove('visible')},700)}
function handleScrollUpdate():void{showScrollbar();if(rafId===null){rafId=requestAnimationFrame(()=>{rafId=null;syncThumbPosition();updateActiveStates(false)})}}
function syncThumbPosition():void{const m=document.getElementById('chatMessages');if(!m||!scrollbarThumb||!scrollbarTrack)return;const st=m.scrollTop,sh=m.scrollHeight-m.clientHeight,th=scrollbarTrack.clientHeight-scrollbarThumb.clientHeight;if(sh<=0)return;scrollbarThumb.style.top=`${(st/sh)*th}px`}
function updateScrollbarThumbSize():void{const m=document.getElementById('chatMessages');if(!m||!scrollbarThumb||!scrollbarTrack)return;if(m.scrollHeight<=m.clientHeight){scrollbarEl?.classList.remove('visible');if(scrollbarThumb){scrollbarThumb.style.height='0';scrollbarThumb.style.display='none'}return}if(scrollbarThumb)scrollbarThumb.style.display='block';scrollbarThumb.style.height=`${Math.max(16,scrollbarTrack.clientHeight*(m.clientHeight/m.scrollHeight))}px`}
function startScrollbarDrag(e:MouseEvent):void{if(!scrollbarThumb||!scrollbarTrack)return;e.preventDefault();isDraggingScrollbar=true;dragStartY=e.clientY;const m=document.getElementById('chatMessages');if(m)dragStartScroll=m.scrollTop;scrollbarThumb.classList.add('dragging');showScrollbar();document.body.style.userSelect='none'}
function onScrollbarDrag(e:MouseEvent):void{if(!isDraggingScrollbar||!scrollbarThumb||!scrollbarTrack)return;const m=document.getElementById('chatMessages');if(!m)return;const th=scrollbarTrack.clientHeight-scrollbarThumb.clientHeight,sh=m.scrollHeight-m.clientHeight;if(th<=0)return;m.scrollTop=dragStartScroll+((e.clientY-dragStartY)/th)*sh}
function stopScrollbarDrag():void{if(!isDraggingScrollbar)return;isDraggingScrollbar=false;scrollbarThumb?.classList.remove('dragging');document.body.style.userSelect='';if(scrollbarHideTimeout)clearTimeout(scrollbarHideTimeout);scrollbarHideTimeout=setTimeout(()=>{if(scrollbarEl&&!isDraggingScrollbar)scrollbarEl.classList.remove('visible')},700)}

function wireScrollDetection():void{const l=document.getElementById('chatMessages');if(!l)return;let d:ReturnType<typeof setTimeout>|null=null;l.addEventListener('scroll',()=>{if(d)clearTimeout(d);d=setTimeout(()=>{const{scrollTop,scrollHeight,clientHeight}=l;if(scrollHeight-scrollTop-clientHeight<30&&userHasScrolledUp){userHasScrolledUp=false;newMessagesCount=0;updateScrollToBottomButton()}else if(scrollHeight-scrollTop-clientHeight>=30&&!userHasScrolledUp){userHasScrolledUp=true;updateScrollToBottomButton()}},60)},{passive:true})}
function wireScrollToBottomButton():void{const b=document.getElementById('scrollToBottomBtn');if(!b)return;b.addEventListener('click',()=>{userHasScrolledUp=false;newMessagesCount=0;smoothScrollToBottom();updateScrollToBottomButton()})}
function updateScrollToBottomButton():void{const b=document.getElementById('scrollToBottomBtn');if(!b)return;b.classList.toggle('visible',userHasScrolledUp)}
function smoothScrollToBottom():void{const l=document.getElementById('chatMessages');if(!l)return;userHasScrolledUp=false;newMessagesCount=0;updateScrollToBottomButton();requestAnimationFrame(()=>{const rows=l.querySelectorAll('.message-row,.chat-end-marker-wrapper');if(rows.length>0){const last=rows[rows.length-1]as HTMLElement;l.scrollTo({top:last.offsetTop+last.offsetHeight-l.clientHeight+3,behavior:'smooth'})}else l.scrollTo({top:l.scrollHeight,behavior:'smooth'})})}

function wireMainMenu():void{const w=document.getElementById('mmWrap'),b=document.getElementById('mmBtn'),m=document.getElementById('mmMenu');if(!w||!b||!m)return;const close=()=>w.classList.remove('open');b.addEventListener('click',()=>{if(w.classList.contains('open'))close();else{refreshMenuState();w.classList.add('open')}});document.addEventListener('click',(e)=>{if(!w.contains(e.target as Node))close()});document.addEventListener('keydown',(e)=>{if(e.key==='Escape')close()});m.querySelectorAll('.mm-item').forEach((it)=>it.addEventListener('click',()=>{handleMenuAction((it as HTMLElement).dataset.action||'');close()}))}
function refreshMenuState():void{const m=document.getElementById('mmMenu');if(!m)return;const p=document.getElementById('mainPanel'),ic=!!p&&p.classList.contains('chat-active');m.classList.toggle('welcome-mode',!ic);const s=getCurrentSession(),hc=ic&&!!s&&s.messages.length>0;m.querySelectorAll('.mm-item').forEach((it)=>{const a=(it as HTMLElement).dataset.action;it.classList.toggle('disabled',(a==='rename'||a==='export'||a==='delete')&&!hc)});getRefreshRulesDot()()}
function handleMenuAction(action:string):void{const s=getCurrentSession();switch(action){case'new-chat':startNewChat();currentRenderedSessionId=null;userHasScrolledUp=false;newMessagesCount=0;updateScrollToBottomButton();const inp=document.querySelector('.chat-input')as HTMLTextAreaElement|null;if(inp){inp.value='';inp.dispatchEvent(new Event('input'));inp.focus()}break;case'rename':if(!s)return;const n=prompt('Rename:',s.title);if(n?.trim())renameSession(s.id,n.trim());break;case'export':if(!s||!s.messages.length)return;exportSession(s);break;case'rules':getOpenRulesModal()();break;case'model-hub':document.getElementById('modelHubBtn')?.click();break;case'delete':if(s&&confirm(`Delete "${s.title}"?`)){deleteSession(s.id);currentRenderedSessionId=null;document.dispatchEvent(new CustomEvent('asuum:welcome-mode'));}break}}
function exportSession(s:ChatSession):void{const lines=['ASUUM EXPORT',`Title: ${s.title}`,`Date: ${new Date().toLocaleString()}`,'---',''];s.messages.forEach(m=>lines.push(`${m.sender==='user'?'You':'Asuum'}: ${m.text}`,''));const blob=new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${(s.title||'chat').replace(/[^\w\d-_ ]/g,'').slice(0,40)}.txt`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)}
function showChatScreen():void{const p=document.getElementById('mainPanel');if(p&&!p.classList.contains('chat-active')){p.classList.add('chat-active');setTimeout(()=>smartAutoScroll(),50)}}
/**
 * ✅ FIXED: Dispatches welcome-mode event when session becomes empty/null.
 * This is the EXACT moment chat→welcome transition happens.
 * Catches: delete, last message removed, session cleared, etc.
 */
function renderCurrentSession():void{const l=document.getElementById('chatMessages'),p=document.getElementById('mainPanel');if(!l||!p)return;l.innerHTML='';thinkingRow=null;lastUserBubbleEl=null;const s=getCurrentSession();if(!s||!s.messages.length){p.classList.remove('chat-active');currentRenderedSessionId=null;document.dispatchEvent(new CustomEvent('asuum:welcome-mode'));return}p.classList.add('chat-active');currentRenderedSessionId=s.id;s.messages.forEach((m,i)=>{appendMessageNoScroll(m.text,m.sender,i,true);if(m.sender==='ai')addPermanentDivider()});ensureBottomSpacer();scrollToLastMessageProfessional();setTimeout(()=>{rebuildAll();smartAutoScroll()},40)}
function enterEditMode(row:HTMLElement,bubble:HTMLElement,idx:number,text:string):void{const inp=document.querySelector('.chat-input')as HTMLTextAreaElement|null;if(!inp)return;if(pendingEdit)pendingEdit.row.classList.remove('editing');pendingEdit={row,bubble,idx};row.classList.add('editing');inp.value=text;inp.dispatchEvent(new Event('input'));inp.focus()}
function confirmEdit():void{if(!pendingEdit)return;const inp=document.querySelector('.chat-input')as HTMLTextAreaElement|null,nt=(inp?.value??'').trim();if(nt){pendingEdit.bubble.textContent=nt;updateMessageText(pendingEdit.idx,nt)}cancelEdit()}
function cancelEdit():void{if(!pendingEdit)return;pendingEdit.row.classList.remove('editing');pendingEdit=null;const inp=document.querySelector('.chat-input')as HTMLTextAreaElement|null;if(inp){inp.value='';inp.dispatchEvent(new Event('input'))}}
function renderMarkdown(text:string):string{let h=escapeHtml(text);h=h.replace(/```(\w+)?\n([\s\S]*?)```/g,(_,lang,code)=>`<pre data-lang="${lang||'code'}"><code>${code}</code></pre>`);h=h.replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/__([^_]+)__/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>').replace(/_([^_]+)_/g,'<em>$1</em>');h=h.replace(/^### (.+)$/gm,'<h3>$1</h3>').replace(/^## (.+)$/gm,'<h2>$1</h2>').replace(/^# (.+)$/gm,'<h1>$1</h1>').replace(/^&gt; (.+)$/gm,'<blockquote>$1</blockquote>');h=h.replace(/^[-*] (.+)$/gm,'<li>$1</li>').replace(/(<li>.*<\/li>\n?)+/g,'<ul>$&</ul>').replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');h=h.replace(/^---$/gm,'<hr>').replace(/\n\n/g,'</p><p>');return`<p>${h}</p>`.replace(/<p><\/p>/g,'').replace(/\n/g,'<br>')}
function escapeHtml(s:string):string{return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

function appendMessageNoScroll(text:string,sender:'user'|'ai',idx?:number,isHistory=false):void{
  const l=document.getElementById('chatMessages');if(!l)return;
  const mi=idx??(getCurrentSession()?.messages.length??0);
  const row=document.createElement('div');row.className=`message-row ${sender}${isHistory?' history':''}`;row.dataset.idx=String(mi);
  const group=document.createElement('div');group.className='message-group';
  const bubble=document.createElement('div');bubble.className='message-bubble';
  if(sender==='ai'){
    bubble.innerHTML=renderMarkdown(text);group.appendChild(bubble);
    const actions=document.createElement('div');actions.className='message-actions ai-actions';
    actions.innerHTML=`<button class="msg-action-btn copy-btn" title="Copy"><span class="icon-copy">${ICON_COPY}</span><span class="icon-check">${ICON_CHECK}</span></button><button class="msg-action-btn save-btn" title="Save">${ICON_SAVE}</button><button class="msg-action-btn like-btn" title="Good">${ICON_LIKE}</button><button class="msg-action-btn dislike-btn" title="Bad">${ICON_DISLIKE}</button><button class="msg-action-btn regen-btn" title="Regenerate">${ICON_REGEN}</button><button class="msg-action-btn share-btn" title="Share">${ICON_SHARE}</button>`;
    group.appendChild(actions);wireActions(actions,bubble,text,sender,row);addCodeCopyButtons(bubble);
  }else{
    bubble.textContent=text;group.appendChild(bubble);
    const actions=document.createElement('div');actions.className='message-actions user-actions';
    actions.innerHTML=`<button class="msg-action-btn edit-btn" title="Edit">${ICON_EDIT}</button><button class="msg-action-btn copy-btn" title="Copy"><span class="icon-copy">${ICON_COPY}</span><span class="icon-check">${ICON_CHECK}</span></button>`;
    group.appendChild(actions);wireActions(actions,bubble,text,sender,row);
  }
  row.appendChild(group);
  const spacer=document.getElementById('chatEndSpacer');
  if(spacer&&spacer.parentNode===l){l.insertBefore(row,spacer)}else{l.appendChild(row)}
}

function addCodeCopyButtons(bubble:HTMLElement):void{bubble.querySelectorAll('pre').forEach(pre=>{if(pre.querySelector('.code-copy-btn'))return;const cb=document.createElement('button');cb.className='code-copy-btn';cb.innerHTML=`${ICON_CODE_COPY}<span>Copy</span>`;cb.addEventListener('click',()=>{const code=pre.querySelector('code');if(code){silentCopy(code.textContent||'');cb.classList.add('copied');cb.innerHTML=`${ICON_CHECK}<span>Copied!</span>`;setTimeout(()=>{cb.classList.remove('copied');cb.innerHTML=`${ICON_CODE_COPY}<span>Copy</span>`},2000)}});pre.appendChild(cb)})}

function addPermanentDivider():void{
  const l=document.getElementById('chatMessages');
  if(!l)return;
  const lastChild=l.lastElementChild;
  if(lastChild&&lastChild.classList.contains('chat-end-marker-wrapper'))return;
  const wrapper=document.createElement('div');
  wrapper.className='chat-end-marker-wrapper';
  const d=document.createElement('div');
  d.className='chat-end-marker';
  d.innerHTML=`<div class="end-line"></div>`;
  wrapper.appendChild(d);
  const spacer=document.getElementById('chatEndSpacer');
  if(spacer&&spacer.parentNode===l){l.insertBefore(wrapper,spacer)}else{l.appendChild(wrapper)}
}

function ensureBottomSpacer():void{const l=document.getElementById('chatMessages');if(!l)return;if(!document.getElementById('chatEndSpacer')){const s=document.createElement('div');s.id='chatEndSpacer';s.className='chat-end-spacer';l.appendChild(s)}}

function wireActions(actions:HTMLElement,bubble:HTMLElement,_text:string,sender:string,row:HTMLElement):void{
  const cb=actions.querySelector('.copy-btn')as HTMLButtonElement;
  if(cb)cb.addEventListener('click',()=>{silentCopy(bubble.textContent??'');cb.classList.add('copied');setTimeout(()=>cb.classList.remove('copied'),2000)});
  if(sender==='user'){const eb=actions.querySelector('.edit-btn')as HTMLButtonElement;if(eb)eb.addEventListener('click',()=>enterEditMode(row,bubble,Number(row.dataset.idx??0),bubble.textContent??''))}
  else{
    const lb=actions.querySelector('.like-btn')as HTMLButtonElement,db=actions.querySelector('.dislike-btn')as HTMLButtonElement;
    if(lb&&db){lb.addEventListener('click',()=>{lb.classList.toggle('active');db.classList.remove('active')});db.addEventListener('click',()=>{db.classList.toggle('active');lb.classList.remove('active')})}
    const saveBtn=actions.querySelector('.save-btn')as HTMLButtonElement|null;if(saveBtn)saveBtn.addEventListener('click',()=>{saveBtn.classList.toggle('active')});
    const rb=actions.querySelector('.regen-btn')as HTMLButtonElement;
    if(rb)rb.addEventListener('click',async()=>{
      if(isRegenerating)return;
      const msgIdx=Number(row.dataset.idx??-1);
      if(msgIdx<0)return;

      isRegenerating=true;
      rb.classList.add('spinning');

      try{
        deleteMessagesFromIndex(msgIdx);

        const chatContainer=document.getElementById('chatMessages');
        if(chatContainer){
          const allRows=Array.from(chatContainer.querySelectorAll('.message-row, .chat-end-marker-wrapper'));
          const thisRowIdx=allRows.indexOf(row);
          if(thisRowIdx>=0){
            for(let i=allRows.length-1;i>=thisRowIdx;i--){
              allRows[i].remove();
            }
          }
          ensureBottomSpacer();
        }

        const contextMessages=getMessagesUpTo(msgIdx-1);
        const msgs:ChatMessage[]=contextMessages.map(m=>({
          role:m.sender==='user'?'user'as const:'assistant'as const,
          content:m.text
        }));

        appendThinkingRow();
        scrollToBottomSmart();
        document.dispatchEvent(new CustomEvent('asuum:ai-thinking-start'));

        const targetSession=getCurrentSession();
        const targetSessionId=targetSession?.id??null;
        if(!targetSessionId)return;

        try{
          const result=await LoadingManager.load('ai-response',async()=>await routeChatRequest(msgs),{strategy:'smart',priority:'high',showUI:false,timeout:60000,retryCount:1});
          removeThinkingRow();
          document.dispatchEvent(new CustomEvent('asuum:ai-thinking-stop'));

          const currentSession=getCurrentSession();
          const currentSessionId=currentSession?.id??null;

          if(result&&result.text){
            if(currentSessionId===targetSessionId){
              appendMessageNoScroll(result.text,'ai');
              appendToCurrent(result.text,'ai');
              addPermanentDivider();
              ensureBottomSpacer();
              smartAutoScroll();
            }else{
              appendToSession(targetSessionId,result.text,'ai');
            }
          }
        }catch(error:unknown){
          removeThinkingRow();
          document.dispatchEvent(new CustomEvent('asuum:ai-thinking-stop'));
          const errMsg=error instanceof Error?error.message:'Unknown error';
          let em:string;
          if(errMsg.includes('All providers failed'))em='⚠️ All AI providers failed. Check API keys.';
          else if(errMsg.includes('No base URL'))em='⚠️ No base URL configured. Reconnect in Model Hub.';
          else em=`⚠️ ${errMsg}`;

          const currentSession=getCurrentSession();
          if(currentSession?.id===targetSessionId){
            appendMessageNoScroll(em,'ai');
            appendToCurrent(em,'ai');
            addPermanentDivider();
            ensureBottomSpacer();
            smartAutoScroll();
          }
        }
      }finally{
        isRegenerating=false;
        rb.classList.remove('spinning');
      }
    });
  }
}

async function generateAiReply():Promise<void>{
  const targetSession=getCurrentSession();
  const targetSessionId=targetSession?.id??null;
  if(!targetSessionId)return;

  document.dispatchEvent(new CustomEvent('asuum:ai-thinking-start'));

  if(!thinkingRow)appendThinkingRow();
  try{
    const msgs:ChatMessage[]=targetSession?.messages.map(m=>({role:m.sender==='user'?'user'as const:'assistant'as const,content:m.text}))||[];
    
    const result=await LoadingManager.load('ai-response',async()=>await routeChatRequest(msgs),{strategy:'smart',priority:'high',showUI:false,timeout:60000,retryCount:1});
    removeThinkingRow();

    document.dispatchEvent(new CustomEvent('asuum:ai-thinking-stop'));

    const currentSession=getCurrentSession();
    const currentSessionId=currentSession?.id??null;

    if(result&&result.text){
      if(currentSessionId===targetSessionId){
        appendMessageNoScroll(result.text,'ai');
        appendToCurrent(result.text,'ai');
        addPermanentDivider();
        ensureBottomSpacer();
        smartAutoScroll();
      }else{
        appendToSession(targetSessionId,result.text,'ai');
      }
    }
  }catch(error:unknown){
    removeThinkingRow();
    document.dispatchEvent(new CustomEvent('asuum:ai-thinking-stop'));
    
    let em:string;
    const errMsg=error instanceof Error?error.message:'Unknown error';
    if(errMsg.startsWith('NO_KEY:')){
      const provider=errMsg.replace('NO_KEY:','');
      em=`⚠️ No API key for ${provider}. Please add it in Settings.`;
    }else if(errMsg==='LOCAL_MODEL_NOT_READY'){
      em='⚠️ Local model not loaded yet. Please select a cloud provider or wait for model to load.';
    }else if(errMsg.includes('All providers failed')){
      em='⚠️ All AI providers failed. Please check your API keys in Settings.';
    }else{
      em=`⚠️ ${errMsg}`;
    }
    
    const currentSession=getCurrentSession();
    const currentSessionId=currentSession?.id??null;
    if(currentSessionId===targetSessionId){
      appendMessageNoScroll(em,'ai');
      appendToCurrent(em,'ai');
      addPermanentDivider();
      ensureBottomSpacer();
      smartAutoScroll();
    }else{
      appendToSession(targetSessionId,em,'ai');
    }
  }
}

export function appendAiMessage(text:string):void{showChatScreen();appendMessageNoScroll(text,'ai');addPermanentDivider();ensureBottomSpacer();smartAutoScroll()}
function scrollToLastMessageProfessional():void{const c=document.getElementById('chatMessages');if(!c)return;requestAnimationFrame(()=>{const ch=c.children;if(ch.length===0)return;const last=ch[ch.length-1]as HTMLElement;c.scrollTo({top:Math.max(0,last.offsetTop+last.offsetHeight-c.clientHeight+3),behavior:'smooth'})})}