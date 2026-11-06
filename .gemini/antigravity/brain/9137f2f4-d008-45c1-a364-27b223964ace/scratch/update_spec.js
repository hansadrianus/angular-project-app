const fs = require('fs');
const path = require('path');

const specPath = path.resolve('docs/superpowers/specs/2026-11-06-projectflow-design.md');
let doc = fs.readFileSync(specPath, 'utf8').replace(/\r\n/g, '\n');

// 1. Update goals
doc = doc.replace(
  '- Weekend + public-holiday-aware scheduling (both non-working)',
  '- Weekend + public-holiday-aware scheduling (both non-working; configurable weekend days, named public holidays, and one-click timeline day marking)'
);

// 2. Update ProjectState
const oldState = `interface ProjectState {
  projectStart: string;   // yyyy-mm-dd
  holidays: string[];     // yyyy-mm-dd, non-working
  tasks: Task[];          // flat array, hierarchy via level + order
}`;

const newState = `interface Holiday {
  date: string;           // yyyy-mm-dd
  name: string;           // e.g. "Thanksgiving", "Labor Day"
}

interface ProjectState {
  projectStart: string;   // yyyy-mm-dd
  holidays: (Holiday | string)[]; // public holidays (non-working)
  weekendDays: number[];  // [0, 6] for Sun, Sat (configurable recurring non-working days)
  workingDays: string[];  // yyyy-mm-dd manual working-weekend overrides
  customNonWork: string[];// yyyy-mm-dd manual non-working day overrides
  tasks: Task[];          // flat array, hierarchy via level + order
}`;

doc = doc.replace(oldState, newState);

// 3. Update Scheduling engine
const oldScheduler = `- Working-day calendar: weekends + \`state.holidays\` are non-working`;
const newScheduler = `- Working-day calendar: weekends (\`state.weekendDays\`, default [0, 6]), custom non-working days (\`state.customNonWork\`), and public holidays (\`state.holidays\`) are non-working; manual working-weekend overrides in \`state.workingDays\` are treated as working`;
doc = doc.replace(oldScheduler, newScheduler);

// 4. Update GanttComponent & HolidaysComponent
const oldGanttComp = `- \`GanttComponent\` — the timeline; week header, weekend/holiday shading, plan bars (blue, red when overdue), actual bars (green, red when late), summary bars, milestone diamonds, dependency arrows (SVG), today line, bar drag/resize
- \`DashboardComponent\` — overlay with completion, status donut, phase progress, needs-attention
- \`HolidaysComponent\` — overlay to add/remove holiday dates`;

const newGanttComp = `- \`GanttComponent\` — the timeline; dual-row header (week groups + day numbers/letters), visible weekend & holiday column shading (warm red with \`🏖️\` badge for holidays, soft grey for weekends), interactive popover on clicking any day header or column to "Mark as Holiday" / "Mark as Weekend/Working day", plan bars (blue, red when overdue), actual bars (green, red when late), summary bars, milestone diamonds, dependency arrows (SVG), today line, bar drag/resize
- \`DashboardComponent\` — overlay with completion, status donut, phase progress, needs-attention
- \`HolidaysComponent\` — Holidays & Weekends Manager modal; configure weekly weekend days with presets (Sat+Sun, Fri+Sat, Sun only), add/delete named public holidays, and view/clear single-day timeline overrides`;

doc = doc.replace(oldGanttComp, newGanttComp);

fs.writeFileSync(specPath, doc, 'utf8');
console.log('Successfully updated design spec doc');
