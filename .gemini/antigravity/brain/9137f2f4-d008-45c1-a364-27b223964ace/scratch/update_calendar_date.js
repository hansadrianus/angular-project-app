const fs = require('fs');
const path = require('path');

const targetFiles = [
  path.resolve('.superpowers/brainstorm/1220-1793908881/content/prototype-v1.html'),
  path.resolve('.superpowers/brainstorm/1953-1793880280/content/prototype-v1.html')
];

for (const file of targetFiles) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

  // 1. Update CSS for gantt-head and col-subtle-date
  const oldCssBlock = `  .gantt-head { display:flex; flex-direction:column; background:#f1f5f9; font-weight:600; color:#475569; border-bottom:1px solid #cbd5e1; position:sticky; top:0; z-index:10; }
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
  .hol-badge { font-size:10px; text-align:center; padding-top:2px; pointer-events:none; }`;

  const newCssBlock = `  .gantt-head { display:flex; flex-direction:column; background:#f1f5f9; font-weight:600; color:#475569; border-bottom:2px solid #cbd5e1; position:sticky; top:0; z-index:10; }
  .gantt-head-months { display:flex; height:22px; border-bottom:1px solid #cbd5e1; background:#e2e8f0; }
  .gantt-head-months .mo-group { text-align:center; padding:2px 6px; border-right:1px solid #cbd5e1; overflow:hidden; font-size:11px; font-weight:700; color:#334155; white-space:nowrap; text-overflow:ellipsis; }
  .gantt-head-days { display:flex; height:34px; background:#f8fafc; }
  .gh-day { display:flex; flex-direction:column; align-items:center; justify-content:center; border-right:1px solid #e2e8f0; padding:2px 1px; cursor:pointer; user-select:none; line-height:1.15; }
  .gh-day:hover { filter:brightness(0.92); box-shadow:inset 0 0 0 1px #2563eb; }
  .gh-day .d-cal-date { font-size:10px; font-weight:700; color:#0f172a; white-space:nowrap; letter-spacing:-0.01em; }
  .gh-day .d-dow { font-size:9px; font-weight:600; color:#64748b; margin-top:1px; }
  .gh-day.today { outline:2px solid #ef4444; outline-offset:-2px; }
  .gh-day.wknd { background:#f1f5f9; }
  .gh-day.wknd .d-cal-date { color:#475569; }
  .gh-day.wknd .d-dow { color:#64748b; font-weight:700; }
  .gh-day.hol { background:#fecaca; }
  .gh-day.hol .d-cal-date { color:#991b1b; }
  .gh-day.hol .d-dow { color:#b91c1c; font-weight:700; }
  .gh-day.custom-nw { background:#fef08a; }
  .gh-day.custom-nw .d-cal-date { color:#854d0e; }
  .gh-day.custom-nw .d-dow { color:#a16207; }
  .gh-day.working-wknd { background:#bbf7d0; }
  .gh-day.working-wknd .d-cal-date { color:#166534; }
  .gh-day.working-wknd .d-dow { color:#15803d; }
  .gantt-body { position:relative; }
  .day-col { position:absolute; top:0; bottom:0; pointer-events:auto; cursor:pointer; }
  .day-col.workday-col { background:transparent; border-right:1px solid #f1f5f9; }
  .day-col.workday-col:hover { background:rgba(37,99,235,0.05); }
  .col-subtle-date { font-size:8px; color:#94a3b8; text-align:center; padding-top:2px; pointer-events:none; opacity:0.65; white-space:nowrap; }
  .day-col:hover .col-subtle-date { opacity:1; color:#2563eb; font-weight:700; }
  .wknd { background:#f1f5f9; border-right:1px solid #e2e8f0; }
  .wknd:hover { outline:1px dashed #94a3b8; }
  .wknd.hol { background:#fee2e2; border-right:1px solid #fca5a5; }
  .wknd.hol:hover { outline:1px dashed #ef4444; }
  .wknd.custom-nw { background:#fef9c3; border-right:1px solid #fde047; }
  .wknd.working-wknd { background:#f0fdf4; border-right:1px dashed #86efac; }
  .hol-badge { font-size:10px; text-align:center; padding-top:2px; pointer-events:none; font-weight:600; color:#991b1b; white-space:nowrap; }
  .hol-tag-date { font-size:8px; display:inline-block; margin-left:1px; }`;

  if (content.includes(oldCssBlock)) {
    content = content.replace(oldCssBlock, newCssBlock);
    console.log('CSS replaced in', file);
  } else {
    console.log('Old CSS block not found in', file);
  }

  // 2. Add Zoom controls to toolbar
  if (!content.includes('data-act="zoom-in"')) {
    content = content.replace(
      '<span class="spacer"></span>',
      `<span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:#64748b;margin-left:8px">Zoom: <button class="tbtn" style="padding:2px 8px;font-size:11px" data-act="zoom-out" title="Zoom out timeline">🔍−</button><button class="tbtn" style="padding:2px 8px;font-size:11px" data-act="zoom-in" title="Zoom in timeline">🔍+</button></span>
    <span class="spacer"></span>`
    );
  }

  // 3. Declare zoomLevel in JS
  if (!content.includes('let zoomLevel = 40;')) {
    content = content.replace(
      `const DAY = 86400000, DAY_W = 16, ROW_H = 28, HEAD_H = 29;\nconst LS_KEY = 'projectflow-proto-v1';`,
      `const DAY = 86400000, DAY_W = 16, ROW_H = 28, HEAD_H = 29;\nconst LS_KEY = 'projectflow-proto-v1';\nlet zoomLevel = 40;`
    );
  }

  // 4. Update renderGantt to include Month row, Day calendar date (e.g. "Oct 5") + Day of week ("Mon"), and body column date
  const oldRenderGanttRegex = /function renderGantt\(\)\{[\s\S]*?document\.getElementById\('gantt'\)\.innerHTML = h;\n\}/;
  const newRenderGantt = `function renderGantt(){
  const vis = visibleIdx();
  const [r0,r1] = ganttRange();
  const totalDays = calDays(r0,r1)+1;
  const wrapW = document.getElementById('ganttWrap').clientWidth || 800;
  const dayW = Math.max(Math.floor(wrapW/totalDays), zoomLevel);
  const width = Math.round(dayW*totalDays);
  const x = d => calDays(r0,d)*dayW;

  let h = '<div class="gantt-head" style="width:'+width+'px">';
  
  // 1. Top row: Month & Year groups (e.g. "October 2026")
  h += '<div class="gantt-head-months">';
  let curMoStart = new Date(r0);
  let curMoDays = 0;
  for(let d=new Date(r0); d<=r1; d=addDays(d,1)){
    curMoDays++;
    const nextDay = addDays(d, 1);
    const isMonthEnd = (nextDay.getMonth() !== d.getMonth()) || (nextDay.getFullYear() !== d.getFullYear()) || (d.getTime() === r1.getTime());
    if(isMonthEnd){
      const moWidth = curMoDays * dayW;
      const moLabel = curMoStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      h += '<div class="mo-group" style="width:'+moWidth+'px;flex:none;" title="'+moLabel+'">'+moLabel+'</div>';
      curMoStart = nextDay;
      curMoDays = 0;
    }
  }
  if(curMoDays > 0){
    h += '<div class="mo-group" style="width:'+(curMoDays*dayW)+'px;flex:none;">'+curMoStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })+'</div>';
  }
  h += '</div>';

  // 2. Bottom row: Individual day columns with Calendar Date (e.g. "Oct 5") and Day of Week ("Mon")
  const today = new Date(); today.setHours(0,0,0,0);
  h += '<div class="gantt-head-days">';
  for(let d=new Date(r0); d<=r1; d=addDays(d,1)){
    const dt = getDayType(d);
    const ds = d2s(d);
    const calDate = dayW >= 32 ? fmt(d) : String(d.getDate()); // "Oct 5" or "5"
    const dow = d.toLocaleDateString('en-US', { weekday: dayW >= 32 ? 'short' : 'narrow' }); // "Mon" or "M"
    let cls = 'gh-day';
    if(dt.type === 'holiday') cls += ' hol';
    else if(dt.type === 'customNonWork') cls += ' custom-nw';
    else if(dt.type === 'weekend') cls += ' wknd';
    else if(dt.type === 'workingWeekend') cls += ' working-wknd';
    if(d.getTime() === today.getTime()) cls += ' today';

    h += '<div class="'+cls+'" data-date="'+ds+'" style="width:'+dayW+'px;flex:none;" title="'+ds+' ('+escapeHtml(dt.name)+') — Click to mark/unmark Holiday or Weekend">'
      + '<span class="d-cal-date">'+calDate+'</span>'
      + '<span class="d-dow">'+dow+'</span></div>';
  }
  h += '</div></div>';

  const bodyH = vis.length*ROW_H;
  h += '<div class="gantt-body" style="width:'+width+'px;height:'+bodyH+'px">';
  for(let d=new Date(r0); d<=r1; d=addDays(d,1)){
    const dt = getDayType(d);
    const ds = d2s(d);
    const calDate = fmt(d);
    let cls = 'day-col workday-col';
    let content = '<div class="col-subtle-date">'+calDate+'</div>';
    if(dt.type === 'holiday'){
      cls = 'wknd hol day-col';
      content = '<div class="hol-badge" title="'+escapeHtml(dt.name)+'">🏖️ <span class="hol-tag-date">'+calDate+'</span></div>';
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
    console.log('renderGantt updated in', file);
  } else {
    console.log('Could not match renderGantt in', file);
  }

  // 5. Add zoom event handling to toolbar listener
  if (!content.includes("act==='zoom-in'")) {
    content = content.replace(
      `else if(act==='dash') showDash();`,
      `else if(act==='dash') showDash();
  else if(act==='zoom-in'){ zoomLevel = Math.min(80, zoomLevel + 8); renderGantt(); }
  else if(act==='zoom-out'){ zoomLevel = Math.max(22, zoomLevel - 8); renderGantt(); }`
    );
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log('Updated', file);
}
