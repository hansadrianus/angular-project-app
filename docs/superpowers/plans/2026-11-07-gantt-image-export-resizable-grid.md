# Gantt Image Export and Resizable Task Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-range Gantt PNG download and let users resize task-grid columns while the grid fills its available width.

**Architecture:** Reuse `CaptureService.captureElement` to render the existing Gantt wrapper, and add image download state/handling to `App`. Change the task grid to shared CSS Grid tracks computed from signal-backed widths; add keyboard- and pointer-operable column separators and let the last track expand to fill the grid.

**Tech Stack:** Angular 22 standalone components, signals, TypeScript, Vitest, existing `html2canvas`-backed capture service.

**Spec:** `docs/superpowers/specs/2026-11-07-gantt-image-export-resizable-grid-design.md`

## Global Constraints

- Export the complete Gantt timeline as a high-resolution PNG on a white background, including dates outside the currently visible scroll area.
- Make task-grid columns resizable, keep each column aligned across the header and task rows, and fill the available width through the right border.
- Keep export separate from the existing Excel workbook export.
- Do not add image formats, image editing, or persisted column preferences.
- Resizers should be operable by pointer and keyboard and expose their state accessibly.
- Keep Excel export output unchanged and prevent concurrent Excel and PNG captures of the shared Gantt element.

## Review Focus

- An export capture failure must alert the user and clear the busy state; test rejection handling and restored UI state in Task 1.
- Empty or punctuation-only project names must still yield a valid download filename; test the fallback in Task 1.
- Export must pass the Gantt wrapper (whose capture includes its scrollable content), not the task grid; test the capture target and PNG filename in Task 1.
- PNG and Excel exports must not capture the shared Gantt element simultaneously; test both overlapping invocation orders in Task 2.
- Dragging or keyboard-resizing must not shrink a column below its minimum width; test the pointer and keyboard boundaries in Task 2.
- Grid tracks must remain aligned and the last column must fill available width; test shared templates and full-width sizing in Task 2.

---

### Task 1: Export the Gantt timeline as PNG

**Files:**
- Modify: `src/app/app.html`
- Modify: `src/app/app.ts`
- Test: `src/app/app.spec.ts`

**Interfaces:**
- Consumes: `GanttComponent.ganttCaptureElement` and `CaptureService.captureElement(element: HTMLElement): Promise<string>`.
- Produces: `App.onExportGanttImage(): Promise<void>`, `App.isGanttImageExporting`, `App.isExcelExporting`, and a toolbar button labeled `Export Gantt PNG`. The two export actions are mutually exclusive.

- [x] **Step 1: Write failing export tests**

Add tests in `app.spec.ts` asserting that `onExportGanttImage` captures the Gantt wrapper, downloads the returned data URL as `<project-slug>-gantt.png`, and resets `isGanttImageExporting` after success. Add a rejection test asserting an `Image export error` alert and cleared busy state. Add a case where an empty/punctuation-only root name uses `project-gantt.png`. Assert the toolbar button is disabled while exporting and that PNG and Excel exports cannot run concurrently.

- [x] **Step 2: Run the app tests and verify the new tests fail**

Run the configured Angular `test` target. Expected: the new tests fail because the image action and button do not yet exist.

- [x] **Step 3: Implement the image export in `App`**

Inject `CaptureService`; use the queried Gantt wrapper as the capture target; download the returned PNG data URL with a sanitized project-based filename and generic fallback; report errors using the existing alert pattern; and always clear the busy state. Add a separate toolbar button and busy label; keep Excel workbook output unchanged.

- [x] **Step 4: Run the app tests and verify they pass**

Run the configured Angular `test` target. Expected: image-export tests and existing app tests pass.

- [x] **Step 5: Commit the export task**

```bash
git add src/app/app.html src/app/app.ts src/app/app.spec.ts
git commit -m "feat: export gantt timeline as png"
```

### Task 2: Make task-grid columns resizable and full-width

**Files:**
- Modify: `src/app/components/task-grid/task-grid.component.ts`
- Create: `src/app/components/task-grid/task-grid.component.spec.ts`
- Modify: `src/app/app.ts`
- Modify: `src/app/app.html`
- Modify: `src/app/app.spec.ts`

**Interfaces:**
- Consumes: existing visible-task and scheduled-task signals in `TaskGridComponent`.
- Produces: signal-backed shared column widths and a computed grid-template string used by both the header and every task row; each column has a labeled separator with keyboard and pointer resizing.

- [x] **Step 1: Write failing task-grid tests**

Create `TaskGridComponent` tests asserting that the header and task rows use the same initial grid template, the table is full-width with a minimum width, pointer resizing updates the shared track width, keyboard ArrowLeft/ArrowRight resize by 8 px, the accessible separator exposes its current width, and neither input method can shrink a column below its defined minimum.

- [x] **Step 2: Run the focused task-grid test and verify it fails**

Run the configured Angular `test` target. Expected: the new tests fail because the grid still uses fixed flex widths and has no separators.

- [x] **Step 3: Implement shared resizable grid tracks**

Replace hard-coded per-cell widths with one shared grid-template binding. Preserve the existing fixed-track widths in column order: `38, 220, 60, 84, 84, 84, 84, 70, 80` px. Use these minimums: `38, 140, 52, 72, 72, 72, 72, 54, 68` px, with an `80px` minimum for the final Status track. Make Status `minmax(80px, 1fr)` so it consumes extra width. Add a separator between each adjacent pair of columns with `role="separator"`, an accessible name and `aria-valuenow`; support pointer drag and 8 px keyboard adjustments while enforcing minimums for both adjacent columns. Resizing the final boundary must use the actual table width so Status can be reduced to its minimum. Keep widths in memory only.

- [x] **Step 4: Run focused and full tests**

Run the focused task-grid test, then the configured Angular `test` target. Expected: both pass, including the existing app and Excel tests. Also verify the separator remains visible at its column boundary and the flexible Status column's resize bound follows the rendered table width.

- [x] **Step 5: Commit the grid task**

```bash
git add src/app/components/task-grid/task-grid.component.ts src/app/components/task-grid/task-grid.component.spec.ts src/app/app.ts src/app/app.html src/app/app.spec.ts
git commit -m "feat: resize task grid columns"
```

### Task 3: Verify the production build

**Files:**
- No additional files.

**Interfaces:**
- Consumes: the completed image export and task-grid changes.
- Produces: a successful production build.

- [x] **Step 1: Run the Angular production build**

Run the configured Angular `build` target with the production configuration. Expected: compilation succeeds without template or type errors.
