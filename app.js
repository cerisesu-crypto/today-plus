const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "today-plus-tasks-v1";
let tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
let currentView = "today";

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const parseDate = (s) => new Date(`${s}T00:00:00`);
const startOfWeek = (date) => { const d = new Date(date); d.setHours(0,0,0,0); d.setDate(d.getDate() - ((d.getDay()+6)%7)); return d; };
const endOfWeek = (date) => { const d = startOfWeek(date); d.setDate(d.getDate()+7); return d; };
const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
const dateLabel = (s) => s ? `${Number(s.slice(5,7))}/${Number(s.slice(8,10))}` : "";
const escapeHTML = (s) => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function setHeader() {
  const d = new Date();
  $("today-date").textContent = d.toLocaleDateString("zh-TW",{year:"numeric",month:"long",day:"numeric",weekday:"long"});
  $("week-label").textContent = `第 ${Math.ceil((((d - new Date(d.getFullYear(),0,1))/86400000) + new Date(d.getFullYear(),0,1).getDay()+1)/7)} 週`;
}
function getVisibleTasks() {
  const now = new Date(), today = todayISO();
  if (currentView === "today") return tasks.filter(t => t.date === today).sort(sortTasks);
  if (currentView === "tasks") return [...tasks].sort((a,b)=>a.date.localeCompare(b.date)||sortTasks(a,b));
  if (currentView === "calendar") {
    return tasks.filter(t => t.date.slice(0,7) === today.slice(0,7)).sort(sortTasks);
  }
  return [...tasks].sort((a,b)=>b.date.localeCompare(a.date));
}
function sortTasks(a,b) {
  const rank = {"高":0,"中":1,"低":2};
  return (a.time||"99:99").localeCompare(b.time||"99:99") || rank[a.priority]-rank[b.priority];
}
function render() {
  const today = todayISO(), weekStart = startOfWeek(new Date()), weekEnd = endOfWeek(new Date());
  const todayTasks = tasks.filter(t=>t.date===today);
  const todayDone = todayTasks.filter(t=>t.done).length;
  const pct = todayTasks.length ? Math.round(todayDone/todayTasks.length*100) : 0;
  $("progress-number").textContent = `${pct}%`; $("ring-number").textContent = `${pct}%`;
  $("progress-detail").textContent = `已完成 ${todayDone} / ${todayTasks.length} 項任務`;
  $("progress-ring").style.background = `conic-gradient(var(--orange) ${pct}%,#ffffff30 0)`;
  const weekTasks = tasks.filter(t=>{const d=parseDate(t.date);return d>=weekStart&&d<weekEnd;});
  const weekDone = weekTasks.filter(t=>t.done).length;
  const weekPct = weekTasks.length ? Math.round(weekDone/weekTasks.length*100) : 0;
  $("week-percent").textContent = `${weekPct}%`; $("week-bar").style.width = `${weekPct}%`;
  $("week-note").textContent = weekTasks.length ? `本週已完成 ${weekDone} 項，還有 ${weekTasks.length-weekDone} 項待完成。` : "新增任務，開始安排本週的節奏。";

  const headings = {today:"今日待辦",tasks:"所有任務",calendar:"本月任務",stats:"任務紀錄"};
  $("task-heading").textContent = headings[currentView];
  const visible = getVisibleTasks();
  $("task-list").innerHTML = visible.map(t=>`
    <article class="task-card ${t.done?"done":""}">
      <button class="check" data-toggle="${t.id}" aria-label="${t.done?"取消完成":"標記完成"}">${t.done?"✓":""}</button>
      <div class="task-main">
        <div class="task-title">${escapeHTML(t.title)}</div>
        <div class="task-meta">${dateLabel(t.date)} ${t.time?`・${escapeHTML(t.time)}`:""} ・${escapeHTML(t.category)}${t.note?` ・${escapeHTML(t.note)}`:""}</div>
      </div>
      <span class="priority ${t.priority==="高"?"high":t.priority==="低"?"low":""}">${t.priority}優先</span>
      <button class="delete-button" data-delete="${t.id}" aria-label="刪除任務">×</button>
    </article>`).join("");
  $("empty-state").style.display = visible.length ? "none" : "block";
  $("empty-state").querySelector("strong").textContent = currentView==="today"?"今天還沒有安排":"目前沒有任務";
  $("empty-state").querySelector("p").textContent = currentView==="today"?"把想完成的事情加進來吧。":"新增一項任務，開始規劃吧。";
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===currentView));
}
function openDialog() {
  $("task-date").value = todayISO(); $("task-time").value = ""; $("task-title").value = ""; $("task-note").value = "";
  $("task-dialog").showModal(); $("task-title").focus();
}
$("add-task").addEventListener("click",openDialog);
$("close-dialog").addEventListener("click",()=>$("task-dialog").close());
$("task-form").addEventListener("submit",e=>{
  e.preventDefault();
  const title=$("task-title").value.trim(); if(!title)return;
  tasks.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),title,date:$("task-date").value,time:$("task-time").value,category:$("task-category").value,priority:$("task-priority").value,note:$("task-note").value.trim(),done:false,createdAt:new Date().toISOString()});
  save(); $("task-dialog").close(); currentView="today"; render();
});
$("task-list").addEventListener("click",e=>{
  const toggle=e.target.closest("[data-toggle]"); const del=e.target.closest("[data-delete]");
  if(toggle){const t=tasks.find(x=>x.id===toggle.dataset.toggle);if(t)t.done=!t.done;save();render();}
  if(del){tasks=tasks.filter(x=>x.id!==del.dataset.delete);save();render();}
});
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>{currentView=b.dataset.view;render();}));
$("show-all").addEventListener("click",()=>{currentView="tasks";render();});
setHeader(); render();
if("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./sw.js").catch(()=>{});
