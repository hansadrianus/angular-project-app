# ProjectFlow — Design Doc

**Date:** 2026-11-06
**Status:** Approved

## Intent and why

A browser-based project management app in the spirit of Microsoft Project, built in the existing Angular 22 workspace. The user manages projects as a task grid plus a Gantt timeline, saves data in the browser (no server), and exports a board-ready Excel report. The interactive prototype (`.superpowers/brainstorm/…/prototype-v1.html`) is the approved spec for look, feel, and behavior — the real app reproduces it with production-quality Angular code.

## Goals

- Task grid + Gantt timeline, stacked vertically (grid on top, full-width Gantt below)
- Full task CRUD with inline cell editing
- Task hierarchy (summary tasks / subtasks) via indent/outdent, with collapse/expand per summary row
- Finish-to-start dependencies with auto-scheduling (successor starts next working day after latest predecessor finishes)
- Weekend + public-holiday-aware scheduling (both non-working; configurable weekend days, named public holidays, and one-click timeline day marking)
- Plan Start / Plan Finish (scheduled) vs Actual Start / Actual End (user-entered)
- % complete with duration-weighted rollup to summary tasks
- Drag-and-drop row reordering (summary moves its subtree; levels clamp to keep hierarchy valid)
- Undo/redo for project mutations, including task edits, dependency changes, date/duration changes, reorder, holiday changes, and import; undo/redo history is session-only and is not persisted
- Drag Gantt bars to move (changes plan start) and drag edges to resize (changes duration)
- Status column (read-only, computed): Done / In progress / Not started / Overdue
- Dashboard overlay: overall completion, task-status donut, progress by phase, "needs attention" (overdue + started-late)
- Browser persistence via localStorage (autosave on every change)
- Export to `.xlsx`: Tasks sheet, Executive Summary sheet (headline numbers + text bar charts), Timeline sheet (embedded Gantt image)
- Import from `.xlsx`/`.csv` in the same format (round-trip), rebuilding hierarchy from indentation and predecessors from row numbers
- Clear project (with confirmation) and Reset demo data

## Non-goals (v1)

- No server, accounts, or multi-user sync — single-browser localStorage only
- No resource/cost management, baselines, or critical-path highlighting (later layers)
- No native Excel charts or pivot tables in the export (SheetJS community edition can't write them); the Timeline sheet uses an embedded image
- No printing / PDF export

## Anti-goals

- A Gantt that looks right but schedules wrong (scheduling correctness is the core value)
- An Excel export that executives can't read without explanation
- Losing user data on reload or import

## Constraints

- Angular 22, standalone components, signals, `inject()`, no NgModules, no `standalone: true`, no explicit `OnPush` (defaults in v22)
- Tailwind CSS 4 for styling
- Vitest for unit tests
- Strict TypeScript, no `any`
- Must pass AXE / WCAG AA (focus management, contrast, ARIA)
- Libraries: SheetJS (`xlsx`) for importing XLSX/CSV, ExcelJS for styled XLSX export and embedded Gantt image, html2canvas for capturing the full current Gantt view

## Approaches considered

1. **Custom-built Gantt in Angular (chosen).** The prototype proves the interaction model; we own every pixel, no license cost, clean fit with signals. Trade-off: we maintain the Gantt rendering code.
2. **Syncfusion Angular Gantt.** Full MS Project feature set out of the box, but paid license (~$995/dev/yr), its own look, heavy dependency. Rejected: cost and loss of the approved UX.
3. **Frappe Gantt (open source).** Free but far less capable than the prototype (no summary bars, no dual plan/actual bars, limited editing). Rejected: we'd fork it heavily, eroding the benefit.

The user chose **Option 1**.

## Architecture

### Data model

```ts
interface Task {
  uid: number;
  name: string;
  dur: number;            // duration in working days (0 = milestone)
  level: number;          // hierarchy depth, 0 = top
  preds: number[];        // predecessor uids (finish-to-start)
  prog: number;           // 0–100
  startInput: string | null;  // user/drag-set plan start anchor (yyyy-mm-dd)
  actualStart: string | null; // yyyy-mm-dd
  actualEnd: string | null;   // yyyy-mm-dd; setting it forces prog=100
  collapsed: boolean;
  // computed by the scheduler, never persisted:
  start: Date | null;     // plan start
  finish: Date | null;    // plan finish
}

interface Holiday {
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
}
```

### Scheduling engine (`SchedulerService`)

- Working-day calendar: weekends (`state.weekendDays`, default [0, 6]), custom non-working days (`state.customNonWork`), and public holidays (`state.holidays`) are non-working; manual working-weekend overrides in `state.workingDays` are treated as working
- Forward pass in array order, iterated to a fixed point: each non-summary task's plan start = max(startInput, next working day after latest predecessor finish, projectStart); plan finish = start + duration working days
- Summary rollups (bottom-up): plan start/finish = min/max of children; duration = working days between; % complete = duration-weighted average of children; actual start/end = min/max of children's actuals
- Circular-dependency guard on link creation and predecessor editing

### Components

- `App` — shell with toolbar
- `TaskGridComponent` — the table; inline editing, row selection, drag-to-reorder, collapse toggles, status badges
- `GanttComponent` — the timeline; dual-tier header (month/year group banner + individual day columns displaying the calendar date e.g. "Oct 5" and day-of-week "Mon"), timeline columns with calendar date labels and visible weekend & holiday shading (warm red with `🏖️` badge for holidays, soft grey for weekends), zoom controls (🔍− / 🔍+), interactive popover on clicking any day header or column to "Mark as Holiday" / "Mark as Weekend/Working day", plan bars (blue, red when overdue), actual bars (green, red when late), summary bars, milestone diamonds, dependency arrows (SVG), today line, bar drag/resize
- `DashboardComponent` — overlay with completion, status donut, phase progress, needs-attention
- `HolidaysComponent` — Holidays & Weekends Manager modal; configure weekly weekend days with presets (Sat+Sun, Fri+Sat, Sun only), add/delete named public holidays, and view/clear single-day timeline overrides
- Toolbar actions live in `App` and call into `ProjectStoreService`

### State & services

- `ProjectStoreService` (`providedIn: 'root'`) — holds `ProjectState` as signals, exposes mutations (add/delete/indent/outdent/link/move/setCell/…), runs the scheduler as a `computed`, autosaves to localStorage (debounced)
- `ExcelService` — import via SheetJS (parse, rebuild hierarchy, resolve predecessors); export via ExcelJS (3 styled sheets, embedded timeline image)
- `CaptureService` — html2canvas wrapper for the Timeline sheet image

### Excel format (round-trip contract)

**Tasks sheet** columns: ID, Task Name, Duration (days), Plan Start, Plan Finish, Actual Start, Actual End, Predecessors, % Complete, Status. Hierarchy = 2-space indentation in Task Name; predecessors = 1-based row numbers.

**Executive Summary sheet:** title, generated date, overall completion (text bar), plan start/finish, tasks done, overdue count, status breakdown with bar chart column, phase table (plan/actual dates, % complete, progress bar), milestone table, needs-attention list.

**Timeline sheet:** title + html2canvas image of the full current Gantt view, including its date headers and task bars. ExcelJS embeds the PNG because SheetJS Community Edition does not write embedded images.

**Import** reads the Tasks sheet (or first sheet), rebuilds levels from indentation, resolves predecessors by row number, restores plan start as the scheduling anchor, keeps holidays already in the app.

## Decisions from the builder check

- **Project size / virtualization:** No row virtualization in v1. Target is small-to-medium projects (up to a few hundred tasks), which the DOM-based grid and Gantt handle fine. If larger projects become a need, virtualization is a later, additive change. *(Builder's call.)*
- **Import data-loss protection:** Import asks for confirmation before replacing the current project ("Import will replace your current project. Continue?"). This satisfies the "no data loss on import" anti-goal at trivial UX cost. *(Builder's call.)*
- **Summary tasks as predecessors:** See open question below.
- **Undo/redo history:** Keep up to 100 snapshots in memory for the current browser session; persist only the current project state in localStorage. *(Builder's call; avoids unbounded memory growth.)*

## Decisions from the user

- **Summary tasks may be predecessors.** The scheduler must calculate summary rollups within its scheduling iteration so downstream tasks always use the current rolled-up finish, not a stale value.
- **Undo/redo and subtree reorder are required.** Undo/redo covers project mutations; dragging a summary task moves its whole subtree.

## What's left to the builder

- Exact component file layout under `src/app/`
- Tailwind class choices for the visual design (match the prototype's look)
- Signal Form vs plain inputs for inline cell editing (builder's call; cells are simple enough that plain inputs are fine)
- Undo/redo keyboard shortcuts and toolbar placement (builder's call; provide visible toolbar buttons and Ctrl+Z / Ctrl+Y)
- Test coverage: scheduler (working-day math, rollups, circular guard), Excel round-trip, store mutations
- Accessibility pass: keyboard navigation of the grid, ARIA roles for the Gantt, focus management in overlays
