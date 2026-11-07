# Gantt Image Export and Resizable Task Grid

## Intent

Let users export the complete Gantt timeline as a presentation-ready image and adjust task-grid columns to suit their project data. The image is intended for executive presentations in Excel, Word, and PowerPoint.

## Goals and non-goals

- Add a toolbar action that downloads the complete Gantt timeline as a high-resolution PNG on a white background, including dates outside the currently visible scroll area.
- Make task-grid columns resizable, keep each column aligned across the header and task rows, and fill the available width through the right border.
- Keep export separate from the existing Excel workbook export.
- Do not add image formats, image editing, or persisted column preferences.

## Approaches

- **Export:** Capture only the visible viewport, or capture the entire Gantt range. Use the full-range capture, reusing the existing `CaptureService` capture behavior, so the presentation does not omit off-screen dates.
- **Grid:** Keep fixed-width columns with only the task-name column adjustable, or make all columns resizable with shared widths and let the last column absorb extra available space. Use the latter to satisfy the request for resizable columns and a grid that reaches the border.

## Constraints and implementation calls

Use the existing Angular app and `html2canvas` dependency. Column widths will be in-memory only and reset on reload. Resizers should be operable by pointer and keyboard and expose their state accessibly. Keep the current Excel export behavior unchanged. Serialize PNG and Excel exports because both capture the same Gantt element.
