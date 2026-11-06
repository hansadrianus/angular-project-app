# Task 3: Undo/redo for project mutations

## Status

Implemented in the five Task 3 application files. Project state edits now support bounded in-memory undo/redo; selection, link mode, zoom, and modal visibility are not included in snapshots. LocalStorage continues to contain only persisted project state.

## Implementation

- Added a centralized project-state commit path. It snapshots the prior serializable `ProjectState` only when the effective state changes, caps undo/redo history at 100 snapshots, and clears redo after a new edit.
- Added `canUndo`, `canRedo`, `undo()`, and `redo()` to `ProjectStoreService`. Restores go through the existing state signal, preserving autosave and schedule derivation.
- Routed task edits, add/delete, indent/outdent, collapse, linking, reorder, calendar edits, reset, clear, and import through the commit path.
- Added accessible Undo/Redo toolbar buttons and Ctrl+Z, Ctrl+Y, and Ctrl+Shift+Z shortcuts. Shortcuts are ignored in input, textarea, select, and contenteditable controls.
- Preserved monotonically increasing task UIDs after deletion; undo/redo/import restores update the UID sequence from restored data.

## TDD and verification

- Initial focused run failed at compile time because the required history API was absent, confirming the new tests exposed the missing behavior.
- A follow-up regression test failed as expected when review found a deleted task UID could be reused; sequence updates were narrowed to imports and history restores.
- Focused test target: **30 tests passed** across `project-store.service.spec.ts` and `app.spec.ts`.
- Full test target: **30 tests passed** across 2 test files.
- Production build: **passed**.
- `git diff --check`: **passed**.

The test runner reports a benign Node warning that `localStorage` is unavailable without `--localstorage-file`; the persistence test supplies its own storage stub.

## Self-review

The state snapshot only copies `ProjectState` fields and task data, strips derived `Date` values to `null`, and excludes UI-only signals. No-op edits do not add history or clear redo. Undo/redo restore through the normal state signal so autosave remains active. Existing summary scheduling and hierarchy-aware subtree reorder behavior is unchanged and remains covered by the focused suite.

## Scope and commit

Changed application files:

- `src/app/services/project-store.service.ts`
- `src/app/services/project-store.service.spec.ts`
- `src/app/app.ts`
- `src/app/app.html`
- `src/app/app.spec.ts`

The pre-existing changes in `docs/superpowers/specs/2026-11-06-projectflow-design.md` and `docs/superpowers/plans/` were left untouched and excluded from the Task 3 commit.

## Review round 1 fix: UID reuse after redo

- Added a regression test that deletes the highest-UID task, undoes the deletion, redoes it, then adds a task and verifies that the deleted UID is not reused.
- **TDD RED:** `npm.cmd test -- --watch=false --include=src/app/services/project-store.service.spec.ts` — 1 failed, 23 passed. The regression failed because the new task received UID 12, equal to the deleted UID 12.
- **Fix:** UID sequence restoration now keeps the greater of its current high-water mark and the next UID implied by restored tasks, rather than lowering the sequence when a restore omits a previously used UID.
- **TDD GREEN:** `npm.cmd test -- --watch=false --include=src/app/services/project-store.service.spec.ts` — 1 test file passed; 24 tests passed.
- Test output included Node's existing experimental warning that localStorage is unavailable without `--localstorage-file`; the suite passed.
