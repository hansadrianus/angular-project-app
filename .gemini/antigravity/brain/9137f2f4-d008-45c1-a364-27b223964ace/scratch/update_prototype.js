const fs = require('fs');
const path = require('path');

const targetFiles = [
  path.resolve('.superpowers/brainstorm/1220-1793908881/content/prototype-v1.html'),
  path.resolve('.superpowers/brainstorm/1953-1793880280/content/prototype-v1.html'),
];

for (const file of targetFiles) {
  if (!fs.existsSync(file)) {
    console.log('Skipping non-existent:', file);
    continue;
  }
  let content = fs.readFileSync(file, 'utf8');

  // Normalize line endings to LF for easier manipulation
  content = content.replace(/\r\n/g, '\n');

  // 1. Update CSS
  const oldCssTarget = `  .gantt-head { display:flex; background:#f1f5f9; font-weight:600; color:#475569; height:29px; border-bottom:1px solid #cbd5e1; }
  .gantt-head .wk { flex:1 1 0; min-width:0; text-align:center; padding:6px 0; border-right:1px solid #e2e8f0; overflow:hidden; }
  .gantt-body { position:relative; }
  .wknd { position:absolute; top:0; bottom:0; background:#f8fafc; }
  .wknd.hol { background:#fee2e2; }
  .rowline { position:absolute; left:0; right:0; height:28px; border-bottom:1px solid #f1f5f9; }
  .rowline.selected { background:rgba(37,99,235,.08); }
  .today-line { position:absolute; top:0; bottom:0; width:2px; background:#ef4444; opacity:.75; z-index:5; }
  .today-tag { position:absolute; font-size:10px; color:#ef4444; z-index:5; }`;

  const newCss = `  .gantt-head { display:flex; flex-direction:column; background:#f1f5f9; font-weight:600; color:#475569; border-bottom:1px solid #cbd5e1; position:sticky; top:0; z-index:10; }
  .gantt-head-weeks { display:flex; height:24px; border-bottom:1px solid #cbd5e1; }
  .gantt-head-weeks .wk { text-align:center; padding:3px 4px; border-right:1px solid #cbd5e1; overflow:hidden; font-size:11px; font-weight:600; color:#475569; white-space:nowrap; text-overflow:ellipsis; }
  .gantt-head-days { display:flex; height:26px; }
  .gh-day { display:flex; flex-direction:column; align-items:center; justify-content:center; border-right:1px solid #e2e8f0; font-size:9px; cursor:pointer; user-select:none; line-height:1.1; }
  .gh-day:hover { filter:brightness(0.92); }
  .gh-day .d-ltr { font-size:9px; color:#64748b; }
  .gh-day .d-num { font-size:10px; font-weight:600; }
  .gh-day.wknd { background:#e2e8f0; color:#475569; }
  .gh-day.wknd .d-ltr { color:#475569; font-weight:700; }
  .gh-day.hol { background:#fecaca; color:#991b1b; }
  .gh-day.hol .d-ltr { color:#b91c1c; font-weight:700; }
  .gh-day.custom-nw { background:#fef08a; color:#854d0e; }
  .gh-day.working-wknd { background:#bbf7d0; color:#166534; }
  .gantt-body { position:relative; }
  .day-col { position:absolute; top:0; bottom:0; pointer-events:auto; cursor:pointer; }
  .day-col.workday-col { background:transparent; border-right:1px solid #f8fafc; }
  .day-col.workday-col:hover { background:rgba(37,99,235,0.05); }
  .wknd { background:#f1f5f9; border-right:1px solid #e2e8f0; }
  .wknd:hover { outline:1px dashed #94a3b8; }
  .wknd.hol { background:#fee2e2; border-right:1px solid #fca5a5; }
  .wknd.hol:hover { outline:1px dashed #ef4444; }
  .wknd.custom-nw { background:#fef9c3; border-right:1px solid #fde047; }
  .wknd.working-wknd { background:#f0fdf4; border-right:1px dashed #86efac; }
  .hol-badge { font-size:10px; text-align:center; padding-top:2px; pointer-events:none; }
  .rowline { position:absolute; left:0; right:0; height:28px; border-bottom:1px solid #f1f5f9; pointer-events:none; }
  .rowline.selected { background:rgba(37,99,235,.08); }
  .today-line { position:absolute; top:0; bottom:0; width:2px; background:#ef4444; opacity:.75; z-index:5; pointer-events:none; }
  .today-tag { position:absolute; font-size:10px; color:#ef4444; z-index:5; pointer-events:none; }
  .day-popover { position:fixed; z-index:100; background:#fff; border:1px solid #cbd5e1; border-radius:8px; box-shadow:0 12px 30px rgba(0,0,0,.2); padding:12px; width:270px; font-size:12px; }
  .pop-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; font-size:12px; border-bottom:1px solid #f1f5f9; padding-bottom:6px; }
  .pop-badge { padding:2px 6px; border-radius:4px; font-size:10px; font-weight:600; }
  .pop-badge.hol { background:#fee2e2; color:#b91c1c; }
  .pop-badge.wknd { background:#f1f5f9; color:#475569; }
  .pop-badge.workday { background:#dcfce7; color:#166534; }
  .pop-badge.custom-nw { background:#fef9c3; color:#854d0e; }
  .pop-badge.working-wknd { background:#dcfce7; color:#15803d; }
  .pop-btn { display:block; width:100%; padding:6px 10px; margin-top:6px; border-radius:5px; border:1px solid #cbd5e1; background:#f8fafc; cursor:pointer; text-align:left; font-size:12px; }
  .pop-btn:hover { background:#f1f5f9; }
  .pop-btn.primary { background:#2563eb; color:#fff; border-color:#2563eb; }
  .pop-btn.primary:hover { background:#1d4ed8; }
  .pop-btn.danger { background:#fee2e2; color:#b91c1c; border-color:#fca5a5; }
  .pop-btn.danger:hover { background:#fecaca; }`;

  if (content.includes(oldCssTarget)) {
    content = content.replace(oldCssTarget, newCss);
    console.log('CSS updated successfully in', file);
  } else {
    console.log('Could not find CSS target in', file);
  }

  // 2. Toolbar & Hint
  content = content.replace(
    '<button class="tbtn" data-act="holidays">📅 Holidays</button>',
    '<button class="tbtn" data-act="holidays">📅 Holidays & Weekends</button>'
  );
  content = content.replace(
    /Task grid on top, Gantt timeline below.*?\(both non-working\)/g,
    'Task grid on top, Gantt timeline below · Click any date column or header to Mark as Holiday or Weekend · Drag bars to move/resize · Red columns = holidays, grey = weekends (both non-working for auto-scheduling)'
  );

  // 3. Date helpers & seed
  const oldDateHelpers = `/* ---------- date helpers (local, weekend-aware) ---------- */
const pad = n => String(n).padStart(2,'0');
function d2s(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function s2d(s){ const p=s.split('-').map(Number); return new Date(p[0],p[1]-1,p[2]); }
function addDays(d,n){ const r=new Date(d); r.setDate(r.getDate()+n); return r; }
function isWk(d){ return d.getDay()===0 || d.getDay()===6; }
function isHoliday(d){ return state && state.holidays && state.holidays.includes(d2s(d)); }
function isNonWork(d){ return isWk(d) || isHoliday(d); }
function nextWorkDay(d){ let r=new Date(d); while(isNonWork(r)) r=addDays(r,1); return r; }
function addWorkDays(start,n){ if(n<=0) return new Date(start); let d=new Date(start), c=1; while(c<n){ d=addDays(d,1); if(!isNonWork(d)) c++; } return d; }
function workDaysBetween(a,b){ if(!a||!b||b<a) return 0; let d=new Date(a), c=0; while(d<=b){ if(!isNonWork(d)) c++; d=addDays(d,1); } return c; }
const calDays = (a,b) => Math.round((b-a)/DAY);
const fmt = d => d ? d.toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '';
const fmtY = d => d ? d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '';`;

  const newDateHelpers = `/* ---------- date helpers (local, weekend-aware) ---------- */
const pad = n => String(n).padStart(2,'0');
function d2s(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function s2d(s){ const p=s.split('-').map(Number); return new Date(p[0],p[1]-1,p[2]); }
function addDays(d,n){ const r=new Date(d); r.setDate(r.getDate()+n); return r; }
function escapeHtml(str){ return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function getHoliday(d){
  if(!state || !state.holidays) return null;
  const s = typeof d === 'string' ? d : d2s(d);
  for(const h of state.holidays){
    if(typeof h === 'string' && h === s) return { date: s, name: 'Public Holiday' };
    if(h && h.date === s) return h;
  }
  return null;
}
function isHoliday(d){ return getHoliday(d) !== null; }
function isWk(d){
  const wkDays = (state && state.weekendDays) || [0, 6];
  return wkDays.includes(d.getDay());
}
function isWorkOverride(d){
  const s = typeof d === 'string' ? d : d2s(d);
  return state && state.workingDays && state.workingDays.includes(s);
}
function isCustomNonWork(d){
  const s = typeof d === 'string' ? d : d2s(d);
  return state && state.customNonWork && state.customNonWork.includes(s);
}
function isNonWork(d){
  if(isHoliday(d)) return true;
  if(isCustomNonWork(d)) return true;
  if(isWk(d)) return !isWorkOverride(d);
  return false;
}
function getDayType(d){
  const hol = getHoliday(d);
  if(hol) return { type: 'holiday', name: hol.name || 'Public Holiday', isNonWork: true };
  if(isCustomNonWork(d)) return { type: 'customNonWork', name: 'Non-working Day', isNonWork: true };
  if(isWk(d)){
    if(isWorkOverride(d)) return { type: 'workingWeekend', name: 'Working Weekend', isNonWork: false };
    return { type: 'weekend', name: 'Weekend', isNonWork: true };
  }
  return { type: 'workday', name: 'Working Day', isNonWork: false };
}

function nextWorkDay(d){ let r=new Date(d); while(isNonWork(r)) r=addDays(r,1); return r; }
function addWorkDays(start,n){ if(n<=0) return new Date(start); let d=new Date(start), c=1; while(c<n){ d=addDays(d,1); if(!isNonWork(d)) c++; } return d; }
function workDaysBetween(a,b){ if(!a||!b||b<a) return 0; let d=new Date(a), c=0; while(d<=b){ if(!isNonWork(d)) c++; d=addDays(d,1); } return c; }
const calDays = (a,b) => Math.round((b-a)/DAY);
const fmt = d => d ? d.toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '';
const fmtY = d => d ? d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '';`;

  if (content.includes(oldDateHelpers)) {
    content = content.replace(oldDateHelpers, newDateHelpers);
    console.log('Date helpers updated successfully in', file);
  } else {
    console.log('Could not find date helpers in', file);
  }

  // Update seed()
  content = content.replace(
    `state = { projectStart:'2026-10-05', tasks:t, holidays:['2026-10-13','2026-11-04'] };`,
    `state = {
    projectStart: '2026-10-05',
    tasks: t,
    holidays: [
      { date: '2026-10-13', name: 'Columbus Day' },
      { date: '2026-11-04', name: 'Election Day' }
    ],
    weekendDays: [0, 6],
    workingDays: [],
    customNonWork: []
  };`
  );

  // Update save() and load()
  const oldSave = `const data = { projectStart: state.projectStart, holidays: state.holidays||[], tasks: state.tasks.map(t=>({uid:t.uid,name:t.name,dur:t.dur,level:t.level,preds:t.preds,prog:t.prog,startInput:t.startInput,actualStart:t.actualStart,actualEnd:t.actualEnd,collapsed:t.collapsed})) };`;
  const newSave = `const data = {
      projectStart: state.projectStart,
      holidays: state.holidays || [],
      weekendDays: state.weekendDays || [0, 6],
      workingDays: state.workingDays || [],
      customNonWork: state.customNonWork || [],
      tasks: state.tasks.map(t=>({uid:t.uid,name:t.name,dur:t.dur,level:t.level,preds:t.preds,prog:t.prog,startInput:t.startInput,actualStart:t.actualStart,actualEnd:t.actualEnd,collapsed:t.collapsed}))
    };`;
  content = content.replace(oldSave, newSave);

  const oldLoad = `    state=data; if(!state.holidays) state.holidays=[];`;
  const newLoad = `    state=data;
    if(!state.holidays) state.holidays=[];
    if(!state.weekendDays) state.weekendDays=[0, 6];
    if(!state.workingDays) state.workingDays=[];
    if(!state.customNonWork) state.customNonWork=[];`;
  content = content.replace(oldLoad, newLoad);

  // Update renderGantt()
  const oldRenderGanttRegex = /function renderGantt\(\)\{[\s\S]*?document\.getElementById\('gantt'\)\.innerHTML = h;\n\}/;
  const newRenderGantt = `function renderGantt(){
  const vis = visibleIdx();
  const [r0,r1] = ganttRange();
  const totalDays = calDays(r0,r1)+1;
  const wrapW = document.getElementById('ganttWrap').clientWidth || 800;
  const dayW = Math.max(Math.floor(wrapW/totalDays), 22);
  const width = Math.round(dayW*totalDays);
  const x = d => calDays(r0,d)*dayW;

  let h = '<div class="gantt-head" style="width:'+width+'px">';
  
  // 1. Top row: week groups
  h += '<div class="gantt-head-weeks">';
  let curWkStart = new Date(r0);
  let curWkDays = 0;
  for(let d=new Date(r0); d<=r1; d=addDays(d,1)){
    curWkDays++;
    const isWkEnd = (d.getDay() === 0) || (d.getTime() === r1.getTime());
    if(isWkEnd){
      const wkWidth = curWkDays * dayW;
      const label = fmt(curWkStart) + (curWkDays > 1 ? ' – ' + fmt(d) : '');
      h += '<div class="wk" style="width:'+wkWidth+'px;flex:none;">'+label+'</div>';
      curWkStart = addDays(d, 1);
      curWkDays = 0;
    }
  }
  if(curWkDays > 0){
    h += '<div class="wk" style="width:'+(curWkDays*dayW)+'px;flex:none;">'+fmt(curWkStart)+'</div>';
  }
  h += '</div>';

  // 2. Bottom row: days
  h += '<div class="gantt-head-days">';
  for(let d=new Date(r0); d<=r1; d=addDays(d,1)){
    const dt = getDayType(d);
    const ds = d2s(d);
    const dayLtr = ['S','M','T','W','T','F','S'][d.getDay()];
    const dayNum = d.getDate();
    let cls = 'gh-day';
    if(dt.type === 'holiday') cls += ' hol';
    else if(dt.type === 'customNonWork') cls += ' custom-nw';
    else if(dt.type === 'weekend') cls += ' wknd';
    else if(dt.type === 'workingWeekend') cls += ' working-wknd';
    h += '<div class="'+cls+'" data-date="'+ds+'" style="width:'+dayW+'px;flex:none;" title="'+ds+' ('+escapeHtml(dt.name)+') — Click to mark/unmark Holiday or Weekend">'
      + '<span class="d-ltr">'+dayLtr+'</span><span class="d-num">'+dayNum+'</span></div>';
  }
  h += '</div></div>';

  const bodyH = vis.length*ROW_H;
  h += '<div class="gantt-body" style="width:'+width+'px;height:'+bodyH+'px">';
  for(let d=new Date(r0); d<=r1; d=addDays(d,1)){
    const dt = getDayType(d);
    const ds = d2s(d);
    let cls = 'day-col workday-col';
    let content = '';
    if(dt.type === 'holiday'){
      cls = 'wknd hol day-col';
      content = '<div class="hol-badge" title="'+escapeHtml(dt.name)+'">🏖️</div>';
    } else if(dt.type === 'customNonWork'){
      cls = 'wknd custom-nw day-col';
    } else if(dt.type === 'weekend'){
      cls = 'wknd day-col';
    } else if(dt.type === 'workingWeekend'){
      cls = 'wknd working-wknd day-col';
    }
    h += '<div class="'+cls+'" data-date="'+ds+'" style="left:'+x(d)+'px;width:'+dayW+'px" title="'+ds+' ('+escapeHtml(dt.name)+') — Click to mark/unmark Holiday or Weekend">'+content+'</div>';
  }
  vis.forEach((i,r)=>{
    h += '<div class="rowline'+(state.tasks[i].uid===selectedUid?' selected':'')+'" style="top:'+(r*ROW_H)+'px"></div>';
  });
  const today=new Date(); today.setHours(0,0,0,0);
  if(today>=r0 && today<=r1){
    h += '<div class="today-line" style="left:'+x(today)+'px"></div><div class="today-tag" style="left:'+(x(today)-12)+'px;top:0">today</div>';
  }
  vis.forEach((i,r)=>{
    const t=state.tasks[i]; if(!t.start) return;
    const y = r*ROW_H + 7;
    if(t.actualStart){
      const as = s2d(t.actualStart);
      const ae = t.actualEnd ? s2d(t.actualEnd) : (today > as ? today : as);
      const aw = x(ae)+dayW - x(as);
      const aLate = !t.actualEnd && t.finish < today;
      h += '<div class="abar'+(aLate?' late':'')+'" style="left:'+x(as)+'px;top:'+(r*ROW_H+ROW_H-8)+'px;width:'+Math.max(aw,6)+'px"></div>';
    }
    if(isSum(i)){
      const w = x(t.finish)+dayW - x(t.start);
      h += '<div class="sbar" data-uid="'+t.uid+'" style="left:'+x(t.start)+'px;top:'+(y+1)+'px;width:'+Math.max(w,12)+'px"></div>';
    } else if(t.dur===0){
      h += '<div class="mstone" data-uid="'+t.uid+'" style="left:'+(x(t.start)+2)+'px;top:'+y+'px"></div>';
    } else {
      const w = x(t.finish)+dayW - x(t.start);
      const late = t.finish < today && t.prog<100;
      h += '<div class="bar'+(late?' late':'')+'" data-uid="'+t.uid+'" style="left:'+x(t.start)+'px;top:'+y+'px;width:'+w+'px">'
        + '<div class="fill" style="width:'+t.prog+'%"></div>'
        + '<div class="rz l" data-rz="l"></div><div class="rz r" data-rz="r"></div></div>';
    }
  });
  // dependency arrows
  let svg = '<svg class="deps" width="'+width+'" height="'+bodyH+'" viewBox="0 0 '+width+' '+bodyH+'">'
    + '<defs><marker id="ah" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7" fill="none" stroke="#64748b" stroke-width="1.3"/></marker></defs>';
  const rowOf = {}; vis.forEach((i,r)=>{ rowOf[state.tasks[i].uid]=r; });
  vis.forEach((i)=>{
    const t=state.tasks[i];
    for(const pid of t.preds){
      const p=byUid(pid); if(!p || !p.start || !t.start) continue;
      if(rowOf[pid]==null || rowOf[t.uid]==null) continue;
      const y1 = rowOf[pid]*ROW_H + ROW_H/2, y2 = rowOf[t.uid]*ROW_H + ROW_H/2;
      const x1 = x(p.finish)+dayW, x2 = x(t.start);
      let path;
      if(x2 >= x1+10) path = 'M'+x1+','+y1+' L'+(x1+6)+','+y1+' L'+(x1+6)+','+y2+' L'+x2+','+y2;
      else path = 'M'+x1+','+y1+' L'+(x1+6)+','+y1+' L'+(x1+6)+','+(y1+12)+' L'+(x2-8)+','+(y1+12)+' L'+(x2-8)+','+y2+' L'+x2+','+y2;
      svg += '<path d="'+path+'" stroke="#64748b" stroke-width="1.3" fill="none" marker-end="url(#ah)"/>';
    }
  });
  svg += '</svg>';
  h += svg + '</div>';
  document.getElementById('gantt').innerHTML = h;
}`;

  if (oldRenderGanttRegex.test(content)) {
    content = content.replace(oldRenderGanttRegex, newRenderGantt);
    console.log('renderGantt updated successfully in', file);
  } else {
    console.log('Could not match renderGantt in', file);
  }

  // Update showHolidays() and add day popover
  const oldHolidaysRegex = /\/\* ---------- holidays ---------- \*\/[\s\S]*?document\.querySelectorAll\('\[data-delhol\]'\)\.forEach\(b=>b\.onclick=[\s\S]*?\}\);[\s\S]*?\}/;

  const newHolidaysAndPopover = `/* ---------- day popover (mark holiday & weekend) ---------- */
function closeDayPopover(){
  const pop = document.getElementById('dayPopover');
  if(pop) pop.remove();
}

function showDayPopover(dateStr, anchorX, anchorY){
  closeDayPopover();
  const d = s2d(dateStr);
  const dt = getDayType(d);
  const fullDate = d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' });

  const isHol = dt.type === 'holiday';
  const isWknd = dt.type === 'weekend';
  const isWkOverride = dt.type === 'workingWeekend';
  const isCustomNW = dt.type === 'customNonWork';

  let badgeCls = isHol ? 'hol' : (isWknd ? 'wknd' : (isCustomNW ? 'custom-nw' : (isWkOverride ? 'working-wknd' : 'workday')));

  let holHtml = '';
  if(isHol){
    holHtml = '<div style="margin:8px 0;padding:8px;background:#fef2f2;border-radius:6px;border:1px solid #fee2e2;">'
      + '<div style="font-weight:600;color:#991b1b;margin-bottom:4px">🏖️ ' + escapeHtml(dt.name) + '</div>'
      + '<button class="pop-btn danger" data-popact="del-holiday" data-date="'+dateStr+'">✕ Remove Holiday</button>'
      + '</div>';
  } else {
    holHtml = '<div style="margin:8px 0;">'
      + '<div style="font-weight:600;color:#475569;margin-bottom:4px">Mark as Public Holiday:</div>'
      + '<div style="display:flex;gap:4px">'
      + '<input type="text" id="popHolName" placeholder="Holiday name (optional)" class="cell-edit" style="height:28px;flex:1">'
      + '<button class="pop-btn primary" style="width:auto;padding:4px 10px;margin-top:0" data-popact="add-holiday" data-date="'+dateStr+'">🏖️ Add</button>'
      + '</div></div>';
  }

  let wkndHtml = '';
  if(isWknd){
    wkndHtml = '<button class="pop-btn" data-popact="mark-working" data-date="'+dateStr+'">💼 Mark as Working Weekend</button>';
  } else if(isWkOverride){
    wkndHtml = '<button class="pop-btn" data-popact="reset-working" data-date="'+dateStr+'">🛑 Revert to Weekend (Non-working)</button>';
  } else if(isCustomNW){
    wkndHtml = '<button class="pop-btn" data-popact="reset-custom-nw" data-date="'+dateStr+'">💼 Revert to Working Day</button>';
  } else if(!isHol){
    wkndHtml = '<button class="pop-btn" data-popact="mark-nonwork" data-date="'+dateStr+'">🛑 Mark as Non-working Weekend/Day</button>';
  }

  const pop = document.createElement('div');
  pop.id = 'dayPopover';
  pop.className = 'day-popover';
  pop.style.left = Math.min(anchorX, window.innerWidth - 290) + 'px';
  pop.style.top = Math.min(anchorY + 8, window.innerHeight - 230) + 'px';
  pop.innerHTML = '<div class="pop-header">'
    + '<div><strong>' + fullDate + '</strong></div>'
    + '<span class="pop-badge ' + badgeCls + '">' + escapeHtml(dt.name) + '</span>'
    + '<button style="background:none;border:none;cursor:pointer;font-size:14px;color:#94a3b8" onclick="closeDayPopover()">✕</button>'
    + '</div>'
    + '<div class="pop-body">'
    + holHtml
    + '<div style="border-top:1px solid #f1f5f9;margin:8px 0;"></div>'
    + wkndHtml
    + '</div>';

  document.body.appendChild(pop);
}

document.body.addEventListener('click', e=>{
  const b = e.target.closest('[data-popact]');
  if(!b) return;
  const act = b.dataset.popact;
  const dateStr = b.dataset.date;
  if(act === 'add-holiday'){
    const inp = document.getElementById('popHolName');
    const name = (inp && inp.value.trim()) || 'Public Holiday';
    state.holidays = (state.holidays || []).filter(h => {
      const ds = typeof h === 'string' ? h : (h ? h.date : '');
      return ds !== dateStr;
    });
    state.holidays.push({ date: dateStr, name });
  } else if(act === 'del-holiday'){
    state.holidays = (state.holidays || []).filter(h => {
      const ds = typeof h === 'string' ? h : (h ? h.date : '');
      return ds !== dateStr;
    });
  } else if(act === 'mark-working'){
    if(!state.workingDays) state.workingDays = [];
    if(!state.workingDays.includes(dateStr)) state.workingDays.push(dateStr);
  } else if(act === 'reset-working'){
    if(state.workingDays) state.workingDays = state.workingDays.filter(d => d !== dateStr);
  } else if(act === 'mark-nonwork'){
    if(!state.customNonWork) state.customNonWork = [];
    if(!state.customNonWork.includes(dateStr)) state.customNonWork.push(dateStr);
  } else if(act === 'reset-custom-nw'){
    if(state.customNonWork) state.customNonWork = state.customNonWork.filter(d => d !== dateStr);
  }
  closeDayPopover();
  render();
});

window.addEventListener('click', e=>{
  if(!e.target.closest('#dayPopover') && !e.target.closest('[data-date]') && !e.target.closest('[data-popact]')){
    closeDayPopover();
  }
});

/* ---------- holidays & weekends manager modal ---------- */
function showHolidays(){
  const wkDays = (state.weekendDays || [0, 6]);
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  
  let wkCheckboxes = '';
  dayNames.forEach((name, idx)=>{
    const checked = wkDays.includes(idx) ? 'checked' : '';
    wkCheckboxes += '<label style="display:inline-flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;padding:3px 6px;border:1px solid '+(checked?'#2563eb':'#cbd5e1')+';border-radius:4px;background:'+(checked?'#eff6ff':'#fff')+'">'
      + '<input type="checkbox" data-wkday="'+idx+'" '+checked+' style="cursor:pointer"> ' + name.slice(0,3) + '</label>';
  });

  const list = (state.holidays||[]).slice().sort((a,b)=>{
    const da = typeof a==='string'?a:a.date, db = typeof b==='string'?b:b.date;
    return da.localeCompare(db);
  });
  let rows = list.map(h=>{
    const ds = typeof h==='string'?h:h.date;
    const nm = (typeof h==='object'&&h.name)?h.name:'Public Holiday';
    return '<div style="display:flex;gap:8px;align-items:center;padding:5px 0;border-bottom:1px solid #f1f5f9;">'
      + '<span style="font-weight:600;width:120px">'+fmtY(s2d(ds))+'</span>'
      + '<span style="flex:1;color:#1e293b">'+escapeHtml(nm)+'</span>'
      + '<span class="pop-badge hol">Non-working</span>'
      + '<button class="tbtn danger" style="padding:2px 8px" data-delhol="'+ds+'">✕</button></div>';
  }).join('');
  if(!rows) rows = '<div style="color:#64748b;font-size:12px;margin:8px 0">No public holidays set. Click any date on the Gantt timeline to mark as holiday, or add one below.</div>';

  let overridesHtml = '';
  const workingDays = state.workingDays || [];
  const customNW = state.customNonWork || [];
  if(workingDays.length || customNW.length){
    let oRows = '';
    workingDays.forEach(ds=>{
      oRows += '<div style="display:flex;gap:8px;align-items:center;padding:4px 0;font-size:12px;">'
        + '<span style="font-weight:600;width:120px">'+fmtY(s2d(ds))+'</span>'
        + '<span class="pop-badge working-wknd">Working Weekend Override</span>'
        + '<span style="flex:1"></span>'
        + '<button class="tbtn danger" style="padding:2px 8px" data-delover="work:'+ds+'">✕</button></div>';
    });
    customNW.forEach(ds=>{
      oRows += '<div style="display:flex;gap:8px;align-items:center;padding:4px 0;font-size:12px;">'
        + '<span style="font-weight:600;width:120px">'+fmtY(s2d(ds))+'</span>'
        + '<span class="pop-badge custom-nw">Non-working Day Override</span>'
        + '<span style="flex:1"></span>'
        + '<button class="tbtn danger" style="padding:2px 8px" data-delover="nonwork:'+ds+'">✕</button></div>';
    });
    overridesHtml = '<div style="margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0;">'
      + '<h4 style="font-size:12px;text-transform:uppercase;color:#64748b;margin-bottom:8px">Single-Day Overrides (From Timeline Clicks)</h4>'
      + oRows + '</div>';
  }

  document.getElementById('dashHost').innerHTML =
    '<div class="overlay" id="ovl"><div class="dash" style="width:520px">'
    + '<button class="dash-close" id="dashClose">✕ Close</button>'
    + '<h2>📅 Holidays & Weekends Manager</h2>'
    + '<div class="sub">Configure weekly non-working days and public holidays. Tasks skip these when scheduling.</div>'
    
    + '<div class="card" style="margin-bottom:16px;">'
    + '<h4 style="font-size:12px;text-transform:uppercase;color:#64748b;margin-bottom:8px">Weekly Weekend Days (Non-working)</h4>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px" id="wkndGroup">'+wkCheckboxes+'</div>'
    + '<div style="display:flex;gap:6px;font-size:11px">'
    + '<span style="color:#64748b;align-self:center">Presets:</span>'
    + '<button class="tbtn" style="padding:2px 6px;font-size:11px" data-preset="sat-sun">Sat & Sun</button>'
    + '<button class="tbtn" style="padding:2px 6px;font-size:11px" data-preset="fri-sat">Fri & Sat</button>'
    + '<button class="tbtn" style="padding:2px 6px;font-size:11px" data-preset="sun-only">Sun only</button>'
    + '</div></div>'

    + '<div class="card">'
    + '<h4 style="font-size:12px;text-transform:uppercase;color:#64748b;margin-bottom:8px">Public Holidays</h4>'
    + '<div style="max-height:220px;overflow:auto;margin-bottom:12px">'+rows+'</div>'
    + '<div style="display:flex;gap:6px">'
    + '<input type="date" id="holAdd" class="cell-edit" style="width:130px;height:30px">'
    + '<input type="text" id="holAddName" placeholder="Holiday name (e.g. Labor Day)" class="cell-edit" style="flex:1;height:30px">'
    + '<button class="tbtn primary" id="holAddBtn" style="height:30px;white-space:nowrap">+ Add Holiday</button>'
    + '</div></div>'

    + overridesHtml
    + '</div></div>';

  document.getElementById('dashClose').onclick = ()=>{ document.getElementById('dashHost').innerHTML=''; };
  document.getElementById('ovl').addEventListener('click', e=>{ if(e.target.id==='ovl') document.getElementById('dashHost').innerHTML=''; });

  document.querySelectorAll('[data-wkday]').forEach(chk => {
    chk.onchange = ()=>{
      const day = Number(chk.dataset.wkday);
      let arr = (state.weekendDays || [0, 6]).slice();
      if(chk.checked && !arr.includes(day)) arr.push(day);
      else if(!chk.checked && arr.includes(day)) arr = arr.filter(d=>d!==day);
      state.weekendDays = arr;
      save(); render(); showHolidays();
    };
  });

  document.querySelectorAll('[data-preset]').forEach(btn => {
    btn.onclick = ()=>{
      const p = btn.dataset.preset;
      if(p==='sat-sun') state.weekendDays = [0, 6];
      else if(p==='fri-sat') state.weekendDays = [5, 6];
      else if(p==='sun-only') state.weekendDays = [0];
      save(); render(); showHolidays();
    };
  });

  document.getElementById('holAddBtn').onclick = ()=>{
    const v = document.getElementById('holAdd').value;
    const nm = document.getElementById('holAddName').value.trim() || 'Public Holiday';
    if(v){
      state.holidays = (state.holidays || []).filter(h => {
        const ds = typeof h === 'string' ? h : (h ? h.date : '');
        return ds !== v;
      });
      state.holidays.push({ date: v, name: nm });
      save(); render(); showHolidays();
    }
  };

  document.querySelectorAll('[data-delhol]').forEach(b=>b.onclick=()=>{
    const target = b.dataset.delhol;
    state.holidays = (state.holidays || []).filter(h => {
      const ds = typeof h === 'string' ? h : (h ? h.date : '');
      return ds !== target;
    });
    save(); render(); showHolidays();
  });

  document.querySelectorAll('[data-delover]').forEach(b=>b.onclick=()=>{
    const parts = b.dataset.delover.split(':');
    const type = parts[0], ds = parts[1];
    if(type === 'work' && state.workingDays) state.workingDays = state.workingDays.filter(d=>d!==ds);
    if(type === 'nonwork' && state.customNonWork) state.customNonWork = state.customNonWork.filter(d=>d!==ds);
    save(); render(); showHolidays();
  });
}`;

  if (oldHolidaysRegex.test(content)) {
    content = content.replace(oldHolidaysRegex, newHolidaysAndPopover);
    console.log('showHolidays updated successfully in', file);
  } else {
    console.log('Could not match showHolidays in', file);
  }

  // Update clear in toolbar:
  content = content.replace(
    `tasks: [], holidays: []`,
    `tasks: [], holidays: [], weekendDays: [0, 6], workingDays: [], customNonWork: []`
  );

  // Update gantt click listener
  const oldGanttClick = `document.getElementById('gantt').addEventListener('click', e=>{
  const s = e.target.closest('.sbar, .mstone');
  if(s){ const uid=Number(s.dataset.uid); if(linkClick(uid)) return; selectedUid=uid; render(); }
});`;

  const newGanttClick = `document.getElementById('gantt').addEventListener('click', e=>{
  const s = e.target.closest('.sbar, .mstone');
  if(s){ const uid=Number(s.dataset.uid); if(linkClick(uid)) return; selectedUid=uid; render(); return; }
  const bar = e.target.closest('.bar');
  if(bar){
    const uid = Number(bar.dataset.uid);
    if(linkClick(uid)) return;
    selectedUid = uid;
    render();
    return;
  }
  const dayTarget = e.target.closest('[data-date]');
  if(dayTarget && (!drag || !drag.moved)){
    const dateStr = dayTarget.dataset.date;
    showDayPopover(dateStr, e.clientX, e.clientY);
  }
});`;

  content = content.replace(oldGanttClick, newGanttClick);

  fs.writeFileSync(file, content, 'utf8');
  console.log('Finished writing:', file);
}
