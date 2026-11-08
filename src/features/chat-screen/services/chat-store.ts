/** chat-store.ts — V1 CLEAN + REGENERATE DELETE-BELOW */
export interface ChatMessage{text:string;sender:'user'|'ai';timestamp:number;}
export interface ChatSession{id:string;title:string;messages:ChatMessage[];createdAt:number;updatedAt:number;}
export interface SessionGroup{label:string;items:ChatSession[];}
const STORAGE_KEY='asuum_chat_sessions',CURRENT_KEY='asuum_current_session';
let sessions:ChatSession[]=[],currentSessionId:string|null=null;
const listeners:Array<()=>void>=[];
function loadFromStorage():void{try{const raw=localStorage.getItem(STORAGE_KEY),parsed=raw?(JSON.parse(raw)as ChatSession[]):[];sessions=Array.isArray(parsed)?parsed:[];}catch(e){sessions=[];}try{currentSessionId=localStorage.getItem(CURRENT_KEY);}catch(e){currentSessionId=null;}}
function persist():void{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(sessions));if(currentSessionId)localStorage.setItem(CURRENT_KEY,currentSessionId);else localStorage.removeItem(CURRENT_KEY);}catch(e){console.warn('chat-store: persist failed',e);}}
export function onSessionChange(cb:()=>void):void{listeners.push(cb);}
export function onHistoryChange(cb:()=>void):void{listeners.push(cb);}
function notify():void{listeners.forEach(cb=>cb());}
export function getAllSessions():ChatSession[]{return sessions;}
export function getCurrentSession():ChatSession|null{if(!currentSessionId)return null;return sessions.find(s=>s.id===currentSessionId)??null;}
export function getSessionById(id:string):ChatSession|null{return sessions.find(s=>s.id===id)??null;}
export function getGroupedSessions():SessionGroup[]{const startOfToday=new Date();startOfToday.setHours(0,0,0,0);const t0=startOfToday.getTime(),t1=t0-86400000,t7=t0-7*86400000,t30=t0-30*86400000;const buckets:SessionGroup[]=[{label:'Today',items:[]},{label:'Yesterday',items:[]},{label:'Previous 7 Days',items:[]},{label:'Previous 30 Days',items:[]},{label:'Older',items:[]}];const sorted=[...sessions].sort((a,b)=>b.updatedAt-a.updatedAt);for(const s of sorted){if(s.updatedAt>=t0)buckets[0].items.push(s);else if(s.updatedAt>=t1)buckets[1].items.push(s);else if(s.updatedAt>=t7)buckets[2].items.push(s);else if(s.updatedAt>=t30)buckets[3].items.push(s);else buckets[4].items.push(s);}return buckets.filter(g=>g.items.length>0);}
export function createSession(title?:string):ChatSession{const now=Date.now();const session:ChatSession={id:`s_${now}_${Math.random().toString(36).slice(2,8)}`,title:title||'New Chat',messages:[],createdAt:now,updatedAt:now};sessions.unshift(session);currentSessionId=session.id;persist();notify();return session;}
export function startNewChat():void{currentSessionId=null;persist();notify();}
export function loadSession(id:string):void{const session=getSessionById(id);if(!session)return;currentSessionId=id;persist();notify();document.dispatchEvent(new CustomEvent('asuum:session-opened',{detail:{sessionId:session.id,title:session.title}}));}
export function appendToCurrent(text:string,sender:'user'|'ai'):void{let session=getCurrentSession();if(!session)session=createSession();session.messages.push({text,sender,timestamp:Date.now()});session.updatedAt=Date.now();if(sender==='user'&&session.messages.filter(m=>m.sender==='user').length===1){const newTitle=text.length>42?`${text.slice(0,42)}…`:text;session.title=newTitle;document.dispatchEvent(new CustomEvent('asuum:title-updated',{detail:{sessionId:session.id,title:newTitle}}));}sessions=[session,...sessions.filter(s=>s.id!==session!.id)];persist();notify();}
export function appendToSession(sessionId:string,text:string,sender:'user'|'ai'):void{const session=getSessionById(sessionId);if(!session)return;session.messages.push({text,sender,timestamp:Date.now()});session.updatedAt=Date.now();if(sender==='user'&&session.messages.filter(m=>m.sender==='user').length===1){const newTitle=text.length>42?`${text.slice(0,42)}…`:text;session.title=newTitle;document.dispatchEvent(new CustomEvent('asuum:title-updated',{detail:{sessionId:session.id,title:newTitle}}));}sessions=[session,...sessions.filter(s=>s.id!==sessionId)];persist();notify();}
export function updateMessageText(idx:number,text:string):void{const session=getCurrentSession();if(!session)return;const msg=session.messages[idx];if(!msg)return;msg.text=text;session.updatedAt=Date.now();persist();notify();}
export function renameSession(id:string,title:string):void{const session=getSessionById(id);if(!session)return;session.title=title;persist();notify();document.dispatchEvent(new CustomEvent('asuum:title-updated',{detail:{sessionId:id,title}}));}
export function deleteSession(id:string):void{sessions=sessions.filter(s=>s.id!==id);if(currentSessionId===id)currentSessionId=null;persist();notify();}
export function removeLastAiMessage():void{const session=getCurrentSession();if(!session)return;for(let i=session.messages.length-1;i>=0;i--){if(session.messages[i].sender==='ai'){session.messages.splice(i,1);break;}}session.updatedAt=Date.now();persist();notify();}

/**
 * ✅ NEW: Delete AI message at index AND all messages below it
 * Used by regenerate feature to clean up before re-generating
 */
export function deleteMessagesFromIndex(fromIndex: number): void {
  const session = getCurrentSession();
  if (!session) return;
  // Keep only messages BEFORE fromIndex
  session.messages = session.messages.slice(0, fromIndex);
  session.updatedAt = Date.now();
  persist();
  notify();
}

/**
 * ✅ Get messages up to (and including) a specific index
 * Used to build context for regeneration
 */
export function getMessagesUpTo(index: number): ChatMessage[] {
  const session = getCurrentSession();
  if (!session) return [];
  return session.messages.slice(0, index + 1);
}

export{loadSession as switchSession};
export function getSessionCount():number{return sessions.length;}
export function clearAllSessions():void{sessions=[];currentSessionId=null;persist();notify();}
loadFromStorage();
export function clearCurrentSession():void{const session=getCurrentSession();if(!session)return;session.messages=[];session.updatedAt=Date.now();session.title='New Chat';persist();notify();}