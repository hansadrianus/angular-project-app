# Task Grid Divider Alignment Design

## Intent

Keep task-grid header labels clear of the column-resize divider in the live grid and exported PNG.

## Approaches

- **Center the visible divider in the existing resize hit area (chosen):** preserve the current accessible, forgiving resize target and put its 1px visual line on the actual column boundary. This corrects the cause without changing resize behavior.
- **Increase header-label spacing:** masks the misplaced line and consumes scarce width in narrow columns, so it is not preferred.

## Scope and constraints

- Adjust only the header resize handle's visible divider; retain pointer and keyboard resizing and current accessible separator semantics.
- Keep row layout, column widths, labels, and capture behavior unchanged.
- The PNG export captures only the Gantt chart, not the task grid; verify the export remains functional, but divider alignment applies to the live grid only.
