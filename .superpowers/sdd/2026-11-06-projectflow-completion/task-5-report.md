# Task 5 Report: Integrated verification and accessibility

## Implementation

- Added integrated app coverage for summary expand/collapse controls and their accessible state, task status labels, keyboard row activation, summary-subtree drag reorder, holiday-driven schedule undo/redo, and accessible Gantt date/task-bar labels.
- Made task-grid rows keyboard-focusable and selectable with Enter/Space, with grid/row/cell semantics, selected state, labeled summary toggles, and explicit task status labels.
- Made Gantt date headers and task bars keyboard-operable and labeled. Added accessible names for the calendar editor's close, holiday-name, and add controls. The date header provides the keyboard alternative to the decorative timeline day columns.
- Expanded shortcut coverage to input, textarea, and contenteditable targets.

## TDD and automated verification

- **RED:** The app spec target failed against the unmodified grid/Gantt components after the new tests were added; the missing accessible labels and keyboard interaction were the expected gaps.
- **GREEN:** Angular `test` target, focused on `src/app/app.spec.ts` — 14 tests passed.
- **Full suite:** Angular `test` target — 3 test files, 44 tests passed. Two runs while the development server/production build was active timed out in the existing Excel workbook export test; after stopping the server, the full-suite rerun passed. The runner emitted its existing Node `localStorage` ExperimentalWarning.
- **Production build:** Angular `build` target with production configuration — succeeded. Angular reported the existing ExcelJS CommonJS optimization warning; output bundle remained within configured budgets.

## Accessibility checks

- Verified toolbar button DOM/tab order: Task, Delete, Link, Indent, Outdent, Undo, Redo; in the browser, Tab from Task moved to Delete.
- Verified initial disabled undo/redo states and state changes in the app tests.
- In the browser, focused a task row and pressed Enter; its `aria-selected` state changed to true.
- In the browser, used Enter and Space on the summary toggle; collapse/expand state and visible descendants updated.
- Verified Gantt date headers expose full-date labels and open the calendar editor from the keyboard; task bars expose task name and planned dates.
- Verified Ctrl+Z, Ctrl+Shift+Z, and Ctrl+Y do not invoke undo/redo while editing text in the app tests; repeated the shortcuts in the browser's task-name editor and confirmed project history/state stayed unchanged.
- No standalone AXE runner or axe-core dependency/reference is available in the repository. The available Chrome DevTools Lighthouse audit tool rejected the project output directory as outside its configured workspace roots. Running it with its default temporary output was not appropriate under the task's no-temporary-files constraint, so no automated AXE result is claimed.

## Files changed

- `src/app/app.spec.ts`
- `src/app/components/task-grid/task-grid.component.ts`
- `src/app/components/gantt/gantt.component.ts`
- `.superpowers/sdd/2026-11-06-projectflow-completion/task-5-report.md`

## Commit

- Commit message: `test: verify ProjectFlow interactions and accessibility`
- Contains only the Task 5 files listed above. The pre-existing design-doc change and untracked plans directory were preserved.

## Review round 1 fix: keyboard calendar editor focus

- **Finding:** Enter or Space opened the date editor without moving focus from the date header, and closing the keyboard-opened editor did not return focus.
- **Fix:** After keyboard activation, focus the editor's holiday-name input (or its remove-holiday action when applicable) after Angular renders it. When that keyboard-opened editor closes, restore focus to the triggering header. Pointer-opened editors retain their existing focus behavior.
- **Coverage:** Added app-level Gantt tests for focus moving into the editor and focus returning to the triggering header. The close test explicitly focuses the close control before activating it.
- **TDD RED:** Before implementing the open-focus behavior, the app spec target failed as expected: 1 failed, 15 passed; `document.activeElement` remained the date header instead of the holiday-name input. Removing focus restoration also made the close-restore test fail.
- **Test command:** Angular CLI test target `angular-project-app:test` with `--include=src/app/app.spec.ts`.
- **Final output:** 1 test file passed; 16 tests passed. The runner emitted the existing Node `localStorage` ExperimentalWarning; no test failures.
- **Full-suite verification:** Angular CLI target `angular-project-app:test` — 3 test files passed; 46 tests passed. The existing Node `localStorage` ExperimentalWarning was emitted.

## Final-review fix wave: keyboard task movement and Gantt editing

- **Finding:** Task reordering and Gantt bar movement/resizing were only available through pointer interactions.
- **Fix:** Focused task rows now reorder among siblings with `Alt+ArrowUp/Down`; the existing UID-based store reorder moves a summary and its descendants as one subtree. Focused standard Gantt bars move their planned start by one calendar day with `ArrowLeft/Right` and change duration by one day with `Shift+ArrowLeft/Right`. Existing Enter/Space selection and pointer interactions are unchanged. Shortcut text and `aria-keyshortcuts` are exposed on applicable rows/bars. Nested controls do not trigger the row/bar shortcuts.
- **Changed files:** `src/app/components/task-grid/task-grid.component.ts`, `src/app/components/gantt/gantt.component.ts`, `src/app/app.spec.ts`, `.superpowers/sdd/2026-11-06-projectflow-completion/task-5-report.md`.
- **TDD RED command:** `ng test --include=src/app/app.spec.ts`
  - Output: `src/app/app.spec.ts (18 tests | 2 failed)`; `Tests 2 failed | 16 passed`. Both new tests failed on the missing `aria-keyshortcuts` attributes before implementation.
- **Focused GREEN command:** `ng test --include=src/app/app.spec.ts`
  - Output: `Test Files 1 passed (1)`; `Tests 18 passed (18)`.
- **Full-suite command:** `ng test`
  - Output: `Test Files 3 passed (3)`; `Tests 48 passed (48)`.
- **Production build command:** `ng build --configuration production`
  - Output: `Application bundle generation complete.`; build succeeded. Angular reported the existing `exceljs` CommonJS optimization warning.
- Test runs emitted the existing Node `localStorage` ExperimentalWarning.
