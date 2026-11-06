# ProjectFlow Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the existing Angular ProjectFlow app with correct summary dependencies, subtree-safe reordering, undo/redo, and a styled executive workbook containing the current Gantt image.

**Architecture:** Extend the existing signal-based `ProjectStoreService` rather than rebuilding the app. Make scheduling, row reordering, and history pure/testable store behavior; keep the task grid and app shell as thin UI adapters. Use SheetJS for imports and ExcelJS for styled XLSX output with the html2canvas capture of the full Gantt view.

**Tech Stack:** Angular 22, TypeScript 6, signals, Vitest, SheetJS (`xlsx`) for import, ExcelJS for export, html2canvas for Gantt capture, Tailwind CSS 4.

**Spec:** `docs/superpowers/specs/2026-11-06-projectflow-design.md`

## Global Constraints

- Angular 22, standalone components, signals, `inject()`, no NgModules, no `standalone: true`, no explicit `OnPush` (defaults in v22).
- Tailwind CSS 4 for styling.
- Vitest for unit tests.
- Strict TypeScript, no `any`.
- Must pass AXE / WCAG AA (focus management, contrast, ARIA).
- Store current project state in browser `localStorage`; keep undo/redo history in memory only.
- SheetJS (`xlsx`) imports XLSX/CSV; ExcelJS exports styled XLSX and embeds the Gantt image; html2canvas captures the full current Gantt view.

## Review Focus

- A leaf task depending on a summary uses the summary's latest rolled-up finish, including when a descendant's schedule changes; test in Task 1.
- A summary cannot be moved into its own descendants or leave its descendants detached; test in Task 2.
- A summary cannot depend on itself or one of its descendants (implicit hierarchy dependency cycle); test in Task 1.
- Undo/redo restores exact project data and derived schedule, and a new edit after undo clears the redo branch; test in Task 3.
- Timeline export includes the current date headers and visible task bars, not a placeholder or only the Gantt body; test in Task 4.

---

### Task 1: Correct summary dependency scheduling

**Files:**
- Modify: `src/app/services/project-store.service.ts`
- Modify: `src/app/services/project-store.service.spec.ts`

**Interfaces:**
- Consumes: `ProjectState`, `Task`, and the existing calendar helpers from `src/app/utils/date-utils.ts`.
- Produces: `calculateSchedule(state: ProjectState): Task[]` behavior that rolls summaries up during fixed-point scheduling; `wouldCycle(tasks: Task[], taskUid: number, predecessorUid: number): boolean` also rejects a summary depending on itself or a descendant.

- [ ] **Step 1: Write failing scheduler tests**

Add tests that:
- Link a leaf task to a summary whose last child finishes on 2026-10-19 and assert the leaf starts on 2026-10-20.
- Change a descendant duration and assert the summary-dependent task moves to the next working day after the newly rolled-up finish.
- Assert linking a summary to itself or to one of its descendants is identified as a cycle.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- --watch=false --include=src/app/services/project-store.service.spec.ts`
Expected: the new summary-dependency tests fail because rollups currently run only after the leaf scheduling pass and hierarchy cycles are not represented in predecessor traversal.

- [ ] **Step 3: Interleave summary rollups into scheduling**

Update the fixed-point iteration to calculate leaf dates from current predecessor dates, then roll up summaries bottom-up before deciding whether the schedule converged. Include summary start/finish changes in convergence detection. Extend cycle detection to treat a summary's descendants as implicit schedule inputs.

- [ ] **Step 4: Run focused tests and verify pass**

Run: `npm test -- --watch=false --include=src/app/services/project-store.service.spec.ts`
Expected: all store tests pass, including the new summary predecessor and hierarchy-cycle cases.

- [ ] **Step 5: Commit**

```bash
git add src/app/services/project-store.service.ts src/app/services/project-store.service.spec.ts
git commit -m "fix: schedule dependencies on summary tasks"
```

### Task 2: Reorder task subtrees safely

**Files:**
- Modify: `src/app/services/project-store.service.ts`
- Modify: `src/app/services/project-store.service.spec.ts`
- Modify: `src/app/components/task-grid/task-grid.component.ts`

**Interfaces:**
- Consumes: Task IDs from visible task rows and the store's flat task list.
- Produces: `reorderTasks(sourceUid: number, targetUid: number, position: 'before' | 'after'): void`; the method moves a summary and its contiguous descendants as one block, inserts as a sibling of the target (after a summary means after its subtree), applies one level delta to preserve the block's internal hierarchy, and ignores drops inside the source subtree.

- [ ] **Step 1: Write failing reorder tests**

Add tests that:
- Move a summary and assert its children and nested descendants remain contiguous and retain relative levels.
- Move a leaf task before/after another row and assert the requested order.
- Reject a drop onto the summary's own descendant without changing the state.
- Reorder while a summary is collapsed using UIDs (not visible-row indexes) and assert the correct full task list changes.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- --watch=false --include=src/app/services/project-store.service.spec.ts`
Expected: subtree, descendant-drop, and collapsed-row tests fail against the current single-row index-based implementation.

- [ ] **Step 3: Implement UID-based subtree movement**

In the store, resolve source and target by UID, slice the complete source subtree, calculate the target insertion point after removing the source block, insert at the target's sibling level (after a summary means after its subtree), adjust all moved levels by the same delta, and reject a target within the source block. In the task grid, calculate before/after from the pointer position and pass row UIDs rather than visible indexes.

- [ ] **Step 4: Run focused tests and verify pass**

Run: `npm test -- --watch=false --include=src/app/services/project-store.service.spec.ts`
Expected: all reorder tests pass; the existing UI continues to select and render the moved task.

- [ ] **Step 5: Commit**

```bash
git add src/app/services/project-store.service.ts src/app/services/project-store.service.spec.ts src/app/components/task-grid/task-grid.component.ts
git commit -m "fix: move task subtrees when reordering"
```

### Task 3: Add undo/redo for project mutations

**Files:**
- Modify: `src/app/services/project-store.service.ts`
- Modify: `src/app/services/project-store.service.spec.ts`
- Modify: `src/app/app.ts`
- Modify: `src/app/app.html`
- Modify: `src/app/app.spec.ts`

**Interfaces:**
- Produces store API: `canUndo: Signal<boolean>`, `canRedo: Signal<boolean>`, `undo(): void`, `redo(): void`.
- History snapshots contain only serializable project state; selection, link mode, zoom, and modal visibility are not history entries.
- Every effective project-state mutation (task fields, add/delete, indent/outdent, collapse, link, reorder, calendar edits, clear/reset, import) records one prior snapshot; no-op updates do not.

- [x] **Step 1: Write failing history tests**

Add tests that assert:
- Undo restores a prior task name and its derived schedule; redo reapplies the name.
- Undoing an edit and making a different edit clears redo availability.
- Undo/redo covers subtree reorder, holiday edits, clear, and imported-state replacement.
- Undo/redo history is not serialized to localStorage.

- [x] **Step 2: Run focused tests and verify failure**

Run: `npm test -- --watch=false --include=src/app/services/project-store.service.spec.ts`
Expected: tests fail because history state and undo/redo methods do not exist.

- [x] **Step 3: Implement bounded in-memory history in the store**

Centralize project-state updates behind a commit helper that snapshots the previous state only when the next state differs. Add undo/redo stacks with a maximum of 100 snapshots, clear redo on a new edit, and ensure restored states still flow through the existing autosave effect.

- [x] **Step 4: Add accessible toolbar actions and keyboard shortcuts**

Add Undo and Redo buttons to the app toolbar, bind their disabled state to `canUndo`/`canRedo`, and add `host: { '(window:keydown)': 'onWindowKeydown($event)' }` to the root component. Handle `Ctrl+Z` / `Ctrl+Y` plus `Ctrl+Shift+Z`; ignore shortcuts while focus is in an input, textarea, select, or contenteditable element. Add app tests for visible/disabled controls and shortcut dispatch.

- [x] **Step 5: Run focused tests and verify pass**

Run: `npm test -- --watch=false --include=src/app/services/project-store.service.spec.ts --include=src/app/app.spec.ts`
Expected: all store and app tests pass; undo/redo buttons and shortcuts invoke the same store operations.

- [x] **Step 6: Commit**

```bash
git add src/app/services/project-store.service.ts src/app/services/project-store.service.spec.ts src/app/app.ts src/app/app.html src/app/app.spec.ts
git commit -m "feat: add project undo and redo"
```

### Task 4: Export a styled executive workbook with the live Gantt image

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/app/services/excel.service.ts`
- Modify: `src/app/services/capture.service.ts`
- Modify: `src/app/app.ts`
- Modify: `src/app/components/gantt/gantt.component.ts`
- Create: `src/app/services/excel.service.spec.ts`

**Interfaces:**
- `ExcelService.createWorkbook(state: ProjectState, scheduledTasks: Task[], ganttElement?: HTMLElement): Promise<ExcelJS.Workbook>` builds the three-sheet workbook for testability.
- `ExcelService.exportProject(state: ProjectState, scheduledTasks: Task[], ganttElement?: HTMLElement): Promise<void>` remains the download entry point and writes the workbook returned by `createWorkbook`.
- `CaptureService.captureElement(element: HTMLElement): Promise<string>` continues to return a PNG data URL.
- SheetJS remains the import parser; ExcelJS becomes the XLSX writer so the export can contain both styles and an embedded PNG.

- [x] **Step 1: Write failing export tests**

Add tests that call `createWorkbook` with a demo project and verify it contains `Tasks`, `Executive Summary`, and `Timeline`; the executive summary has the report title, completion/status visuals, and phase summary; the Tasks sheet preserves the approved columns; and Timeline contains an embedded PNG image rather than placeholder text. Include a no-Gantt-element case that still creates the other sheets and clearly labels the missing timeline capture.

- [x] **Step 2: Run focused tests and verify failure**

Run: `npm test -- --watch=false --include=src/app/services/excel.service.spec.ts`
Expected: tests fail because Timeline currently contains explanatory placeholder text and the writer does not embed images.

- [x] **Step 3: Add ExcelJS and implement workbook export**

Add `exceljs`; retain `xlsx` for import. Implement `createWorkbook(state: ProjectState, scheduledTasks: Task[], ganttElement?: HTMLElement): Promise<ExcelJS.Workbook>` and keep `exportProject(state: ProjectState, scheduledTasks: Task[], ganttElement?: HTMLElement): Promise<void>` as the download API. Rebuild the three-sheet export with board-ready formatting: titled executive summary, styled section/header rows, readable column widths, frozen task headers, task filters, percentage formats, and clear status/progress visuals. Capture the full Gantt wrapper (date headers and current visible bars) with `CaptureService` and add it as a PNG image in the Timeline worksheet using ExcelJS. If no Gantt element is supplied, label the missing timeline capture in the worksheet.

- [x] **Step 4: Run focused tests and verify pass**

Run: `npm test -- --watch=false --include=src/app/services/excel.service.spec.ts`
Expected: workbook sheet names, rows, key styles, and embedded image are verified.

- [x] **Step 5: Run production build**

Run: `npm run build`
Expected: build succeeds with the browser-compatible ExcelJS bundle and strict TypeScript checks.

- [x] **Step 6: Commit**

```bash
git add package.json package-lock.json src/app/services/excel.service.ts src/app/services/excel.service.spec.ts src/app/services/capture.service.ts src/app/app.ts src/app/components/gantt/gantt.component.ts
git commit -m "feat: export executive workbook with gantt image"
```

### Task 5: End-to-end verification and accessibility checks

**Files:**
- Modify: `src/app/app.spec.ts`
- Modify: `src/app/components/task-grid/task-grid.component.ts`
- Modify: `src/app/components/gantt/gantt.component.ts`

**Interfaces:**
- Consumes the completed store, grid, Gantt, undo/redo, and Excel export behavior.
- Produces test coverage for accessible hierarchy controls and verified integrated interactions.

- [x] **Step 1: Add integrated behavior tests**

Cover keyboard access to expand/collapse, status labels on tasks, task reorder preserving a subtree, and undo/redo preserving schedule changes after holiday edits.

- [x] **Step 2: Run the full test suite**

Run: `npm test -- --watch=false`
Expected: all tests pass.

- [x] **Step 3: Run production build**

Run: `npm run build`
Expected: production build succeeds without TypeScript or template errors.

- [x] **Step 4: Verify keyboard and accessibility behavior**

Manually verify toolbar focus order, disabled undo/redo button states, grid row expand/collapse keyboard activation, Gantt accessible labels, and that Ctrl+Z/Y do not override text editing. Run the available AXE check against the app.

- [x] **Step 5: Commit**

```bash
git add src/app/app.spec.ts src/app/components/task-grid/task-grid.component.ts src/app/components/gantt/gantt.component.ts
git commit -m "test: verify projectflow interactions and accessibility"
```
