# Task Grid Divider Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep task-grid header labels clear of resize dividers in the live grid and preserve PNG export.

**Architecture:** Keep the existing centered 24px accessible resize separator. Move only its visible 1px divider to the separator's center, so the visual line aligns to the grid boundary while pointer and keyboard resizing remain unchanged.

**Tech Stack:** Angular 22, TypeScript, Tailwind CSS 4, Vitest, Chrome DevTools.

**Spec:** [2026-11-07-task-grid-divider-alignment-design.md](../specs/2026-11-07-task-grid-divider-alignment-design.md)

## Global Constraints

- Preserve pointer and keyboard resizing and current accessible separator semantics.
- Keep row layout, column widths, labels, and capture behavior unchanged.
- The PNG export contains the Gantt chart only, not task-grid columns; verify it still exports successfully.

## Review Focus

- The divider is centered on each actual track boundary, not the edge of its 24px hit area; assert the decorative line uses a centered position.
- Resize hit areas remain 24px and centered; assert the separator retains its current width and translation.
- Hover and keyboard focus continue to indicate the divider; verify existing focus outline and hover styling remain available.
- Narrow columns keep their labels unobscured; inspect the default and minimum-width task-name/duration boundaries in-browser.
- The PNG export's capture target excludes the task grid; verify PNG export still works and does not change scope.

---

### Task 1: Align task-grid header divider visuals

**Files:**
- Modify: `src/app/components/task-grid/task-grid.component.ts`
- Test: `src/app/components/task-grid/task-grid.component.spec.ts`

**Interfaces:**
- Consumes: Existing `role="separator"` hit areas and column track layout.
- Produces: A centered, decorative divider inside each existing separator; no resize API changes.

- [x] **Step 1: Write a failing test**

Add a test named `centers the visible divider inside the resize hit area` that asserts a separator keeps its 24px centered hit target and contains a decorative border at its center, with pointer events disabled on the decoration.

- [x] **Step 2: Run the focused test and verify it fails**

Run: `npm.cmd test -- --watch=false --include src/app/components/task-grid/task-grid.component.spec.ts`
Expected: The new test fails because the separator currently draws its border at the far edge and has no centered decorative line.

- [x] **Step 3: Move the visible line to the hit area's center**

In the separator template in `task-grid.component.ts`, keep the existing 24px hit area and translation. Remove the border from the hit area and render its visible hoverable border as a centered, pointer-transparent decorative child.

- [x] **Step 4: Run focused tests**

Run: `npm.cmd test -- --watch=false --include src/app/components/task-grid/task-grid.component.spec.ts`
Expected: All task-grid tests pass, including the new divider-alignment test.

- [x] **Step 5: Verify the full app and PNG export**

Run the full test suite and production build. In the browser, check the header at default and minimum adjacent widths. Confirm the capture target is only the Gantt chart, then export a PNG and verify the download still succeeds.

- [ ] **Step 6: Commit the verified changes**

```bash
git add src/app/components/task-grid/task-grid.component.ts src/app/components/task-grid/task-grid.component.spec.ts docs/superpowers/specs/2026-11-07-task-grid-divider-alignment-design.md docs/superpowers/plans/2026-11-07-task-grid-divider-alignment.md
git commit -m "fix: align task grid resize dividers"
```
