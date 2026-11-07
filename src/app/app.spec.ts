import { TestBed } from '@angular/core/testing';
import type { Task } from './models/project.model';
import { App } from './app';
import { ProjectStoreService } from './services/project-store.service';
import { CaptureService } from './services/capture.service';
import { ExcelService } from './services/excel.service';
import { d2s } from './utils/date-utils';

const onePixelPng =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0uUAAAAASUVORK5CYII=';

const createTask = (
  uid: number,
  name: string,
  level: number,
  dur: number,
  prog = 0
): Task => ({
  uid,
  name,
  dur,
  level,
  preds: [],
  prog,
  startInput: null,
  actualStart: null,
  actualEnd: null,
  collapsed: false,
  start: null,
  finish: null
});

const setProject = (store: ProjectStoreService, tasks: Task[]): void => {
  store.state.update((state) => ({
    ...state,
    projectStart: '2026-10-05',
    holidays: [],
    weekendDays: [0, 6],
    workingDays: [],
    customNonWork: [],
    tasks
  }));
};

describe('App', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [ProjectStoreService]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render brand title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('ProjectFlow');
  });

  it('downloads a PNG captured from the full Gantt wrapper with a project-based filename', async () => {
    const fixture = TestBed.createComponent(App);
    const captureService = TestBed.inject(CaptureService);
    const capture = vi.spyOn(captureService, 'captureElement').mockResolvedValue(onePixelPng);
    let downloadFilename = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      downloadFilename = this.download;
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const ganttWrapper = compiled.querySelector('app-gantt .gantt-wrap') as HTMLElement;
    const exportButton = compiled.querySelector(
      'button[aria-label="Export Gantt PNG"]'
    ) as HTMLButtonElement | null;
    expect(exportButton).toBeTruthy();
    if (!exportButton) {
      fixture.destroy();
      return;
    }

    exportButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(capture).toHaveBeenCalledWith(ganttWrapper);
    expect(downloadFilename).toBe('website-redesign-gantt.png');
    expect(exportButton.disabled).toBe(false);
    fixture.destroy();
  });

  it('alerts on image capture failure and restores the export button', async () => {
    const fixture = TestBed.createComponent(App);
    const capture = vi
      .spyOn(TestBed.inject(CaptureService), 'captureElement')
      .mockRejectedValue(new Error('capture failed'));
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const exportButton = compiled.querySelector(
      'button[aria-label="Export Gantt PNG"]'
    ) as HTMLButtonElement | null;
    expect(exportButton).toBeTruthy();
    if (!exportButton) {
      fixture.destroy();
      return;
    }

    exportButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(capture).toHaveBeenCalledTimes(1);
    expect(alert).toHaveBeenCalledWith('Image export error: capture failed');
    expect(exportButton.disabled).toBe(false);
    fixture.destroy();
  });

  it('uses a generic filename when exporting an empty project', async () => {
    const fixture = TestBed.createComponent(App);
    setProject(TestBed.inject(ProjectStoreService), []);
    vi.spyOn(TestBed.inject(CaptureService), 'captureElement').mockResolvedValue(onePixelPng);
    let downloadFilename = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      downloadFilename = this.download;
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const exportButton = compiled.querySelector(
      'button[aria-label="Export Gantt PNG"]'
    ) as HTMLButtonElement | null;
    expect(exportButton).toBeTruthy();
    if (!exportButton) {
      fixture.destroy();
      return;
    }

    exportButton.click();
    await fixture.whenStable();

    expect(downloadFilename).toBe('project-gantt.png');
    fixture.destroy();
  });

  it('disables the image export button while capture is pending', async () => {
    const fixture = TestBed.createComponent(App);
    let resolveCapture!: (dataUrl: string) => void;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.spyOn(TestBed.inject(CaptureService), 'captureElement').mockReturnValue(
      new Promise((resolve) => {
        resolveCapture = resolve;
      })
    );
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const exportButton = compiled.querySelector(
      'button[aria-label="Export Gantt PNG"]'
    ) as HTMLButtonElement | null;
    expect(exportButton).toBeTruthy();
    if (!exportButton) {
      fixture.destroy();
      return;
    }

    exportButton.click();
    fixture.detectChanges();
    expect(exportButton.disabled).toBe(true);

    resolveCapture(onePixelPng);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(exportButton.disabled).toBe(false);
    fixture.destroy();
  });

  it('prevents image capture while an Excel export is pending', async () => {
    const fixture = TestBed.createComponent(App);
    let finishExcelExport!: () => void;
    vi.spyOn(TestBed.inject(ExcelService), 'exportProject').mockReturnValue(
      new Promise<void>((resolve) => {
        finishExcelExport = resolve;
      })
    );
    const capture = vi.spyOn(TestBed.inject(CaptureService), 'captureElement');
    fixture.detectChanges();

    const app = fixture.componentInstance;
    const compiled = fixture.nativeElement as HTMLElement;
    const imageButton = compiled.querySelector(
      'button[aria-label="Export Gantt PNG"]'
    ) as HTMLButtonElement;
    const excelButton = Array.from(compiled.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Export to Excel')
    ) as HTMLButtonElement;

    void app.onExport();
    fixture.detectChanges();
    expect(imageButton.disabled).toBe(true);
    await app.onExportGanttImage();
    expect(capture).not.toHaveBeenCalled();

    finishExcelExport();
    await fixture.whenStable();
    fixture.destroy();
  });

  it('prevents Excel export while image capture is pending', async () => {
    const fixture = TestBed.createComponent(App);
    let finishImageCapture!: (dataUrl: string) => void;
    const exportProject = vi.spyOn(TestBed.inject(ExcelService), 'exportProject');
    vi.spyOn(TestBed.inject(CaptureService), 'captureElement').mockReturnValue(
      new Promise<string>((resolve) => {
        finishImageCapture = resolve;
      })
    );
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    fixture.detectChanges();

    const app = fixture.componentInstance;
    const compiled = fixture.nativeElement as HTMLElement;
    const imageButton = compiled.querySelector(
      'button[aria-label="Export Gantt PNG"]'
    ) as HTMLButtonElement;
    const excelButton = Array.from(compiled.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Export to Excel')
    ) as HTMLButtonElement;

    void app.onExportGanttImage();
    fixture.detectChanges();
    expect(excelButton.disabled).toBe(true);
    await app.onExport();
    expect(exportProject).not.toHaveBeenCalled();

    finishImageCapture(onePixelPng);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(imageButton.disabled).toBe(false);
    fixture.destroy();
  });

  it('should have initial demo tasks scheduled', () => {
    const store = TestBed.inject(ProjectStoreService);
    const tasks = store.scheduledTasks();
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks[0].name).toContain('Website Redesign');
  });

  it('should respect holidays and weekend days in schedule', () => {
    const store = TestBed.inject(ProjectStoreService);
    const state = store.state();
    expect(state.weekendDays).toEqual([0, 6]);
    expect(state.holidays.length).toBeGreaterThan(0);
  });

  it('renders undo and redo controls with state-based disabled status', async () => {
    const fixture = TestBed.createComponent(App);
    const store = TestBed.inject(ProjectStoreService);
    fixture.detectChanges();
    await fixture.whenStable();

    const undoButton = fixture.nativeElement.querySelector(
      'button[aria-label="Undo"]'
    ) as HTMLButtonElement;
    const redoButton = fixture.nativeElement.querySelector(
      'button[aria-label="Redo"]'
    ) as HTMLButtonElement;
    expect(undoButton.disabled).toBe(true);
    expect(redoButton.disabled).toBe(true);

    store.updateTaskField(3, 'name', 'Updated requirements');
    fixture.detectChanges();
    expect(undoButton.disabled).toBe(false);
    undoButton.click();
    fixture.detectChanges();
    expect(store.state().tasks.find((task) => task.uid === 3)?.name).toBe('Requirements');
    expect(redoButton.disabled).toBe(false);
  });

  it('keeps toolbar controls in keyboard focus order', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('header button')
    );
    const labels = buttons.map((button) =>
      (button.getAttribute('aria-label') ?? button.textContent ?? '').trim().replace(/\s+/g, ' ')
    );

    expect(labels.slice(0, 7)).toEqual([
      '+ Task',
      '🗑 Delete',
      '🔗 Link',
      '⇥ Indent',
      '⇤ Outdent',
      'Undo',
      'Redo'
    ]);
    expect(buttons.every((button) => button.tabIndex >= 0)).toBe(true);
    fixture.destroy();
  });

  it('expands and collapses a summary with an accessible keyboard-operable control', () => {
    const fixture = TestBed.createComponent(App);
    const store = TestBed.inject(ProjectStoreService);
    setProject(store, [createTask(1, 'Summary', 0, 0), createTask(2, 'Child', 1, 1)]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const collapseButton = compiled.querySelector(
      'button[aria-label="Collapse Summary"]'
    ) as HTMLButtonElement;
    expect(collapseButton).toBeTruthy();
    if (!collapseButton) return;
    expect(collapseButton.type).toBe('button');
    expect(collapseButton.getAttribute('aria-expanded')).toBe('true');
    expect(compiled.querySelector('[aria-label="Task: Child"]')).toBeTruthy();

    collapseButton.focus();
    collapseButton.click();
    fixture.detectChanges();

    const expandButton = compiled.querySelector(
      'button[aria-label="Expand Summary"]'
    ) as HTMLButtonElement;
    expect(expandButton.getAttribute('aria-expanded')).toBe('false');
    expect(compiled.querySelector('[aria-label="Task: Child"]')).toBeNull();
    fixture.destroy();
  });

  it('exposes task status labels to assistive technology', () => {
    const fixture = TestBed.createComponent(App);
    const store = TestBed.inject(ProjectStoreService);
    setProject(store, [createTask(1, 'Completed task', 0, 1, 100)]);
    fixture.detectChanges();

    const status = (fixture.nativeElement as HTMLElement).querySelector(
      '[aria-label="Status: Done"]'
    );
    expect(status?.textContent?.trim()).toBe('Done');
    fixture.destroy();
  });

  it('activates a focused task row with Enter and Space', () => {
    const fixture = TestBed.createComponent(App);
    const store = TestBed.inject(ProjectStoreService);
    setProject(store, [createTask(1, 'Keyboard task', 0, 1)]);
    fixture.detectChanges();

    const row = (fixture.nativeElement as HTMLElement).querySelector(
      '[role="row"][aria-label="Task: Keyboard task"]'
    ) as HTMLElement;
    expect(row).toBeTruthy();
    if (!row) return;
    expect(row.tabIndex).toBe(0);

    row.focus();
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(store.selectedUid()).toBe(1);

    store.selectTask(null);
    row.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(store.selectedUid()).toBe(1);
    fixture.destroy();
  });

  it('reorders siblings with Alt+Arrow keys and moves summary subtrees together', () => {
    const fixture = TestBed.createComponent(App);
    const store = TestBed.inject(ProjectStoreService);
    setProject(store, [
      createTask(1, 'Summary A', 0, 0),
      createTask(2, 'Child A1', 1, 1),
      createTask(3, 'Child A2', 1, 1),
      createTask(4, 'Summary B', 0, 0),
      createTask(5, 'Child B', 1, 1),
      createTask(6, 'Standalone', 0, 1)
    ]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const childRow = compiled.querySelector(
      '[role="row"][aria-label="Task: Child A1"]'
    ) as HTMLElement;
    expect(childRow?.getAttribute('aria-keyshortcuts')).toBe('Alt+ArrowUp Alt+ArrowDown');
    expect(childRow?.getAttribute('title')).toContain('Alt+ArrowUp/Down');
    const summaryToggle = compiled.querySelector(
      'button[aria-label="Collapse Summary A"]'
    ) as HTMLButtonElement;
    summaryToggle.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true })
    );
    expect(store.state().tasks.map((task) => task.uid)).toEqual([1, 2, 3, 4, 5, 6]);

    childRow.focus();
    childRow.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true })
    );
    fixture.detectChanges();
    expect(store.state().tasks.map((task) => task.uid)).toEqual([1, 3, 2, 4, 5, 6]);

    const summaryRow = compiled.querySelector(
      '[role="row"][aria-label="Task: Summary A"]'
    ) as HTMLElement;
    summaryRow.focus();
    summaryRow.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true })
    );
    fixture.detectChanges();
    expect(store.state().tasks.map((task) => task.uid)).toEqual([4, 5, 1, 3, 2, 6]);
    expect(store.state().tasks.map((task) => task.level)).toEqual([0, 1, 0, 1, 1, 0]);

    const movedSummaryRow = compiled.querySelector(
      '[role="row"][aria-label="Task: Summary A"]'
    ) as HTMLElement;
    movedSummaryRow.focus();
    movedSummaryRow.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true })
    );
    fixture.detectChanges();
    expect(store.state().tasks.map((task) => task.uid)).toEqual([1, 3, 2, 4, 5, 6]);
    fixture.destroy();
  });

  it('moves a summary and its descendants together through the task grid', () => {
    const fixture = TestBed.createComponent(App);
    const store = TestBed.inject(ProjectStoreService);
    setProject(store, [
      createTask(1, 'Summary', 0, 0),
      createTask(2, 'Child', 1, 1),
      createTask(3, 'Destination', 0, 1)
    ]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const summaryRow = compiled.querySelector(
      '[role="row"][aria-label="Task: Summary"]'
    ) as HTMLElement;
    const destinationRow = compiled.querySelector(
      '[role="row"][aria-label="Task: Destination"]'
    ) as HTMLElement;
    expect(summaryRow).toBeTruthy();
    expect(destinationRow).toBeTruthy();
    if (!summaryRow || !destinationRow) return;
    vi.spyOn(destinationRow, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      right: 100,
      bottom: 28,
      left: 0,
      width: 100,
      height: 28,
      toJSON: () => ({})
    });

    summaryRow.dispatchEvent(new Event('dragstart', { bubbles: true }));
    const dropEvent = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(dropEvent, 'clientY', { value: 28 });
    destinationRow.dispatchEvent(dropEvent);

    expect(store.state().tasks.map((task) => task.uid)).toEqual([3, 1, 2]);
    expect(store.state().tasks.map((task) => task.level)).toEqual([0, 0, 1]);
    fixture.destroy();
  });

  it('preserves holiday-driven schedule changes through undo and redo', () => {
    const fixture = TestBed.createComponent(App);
    const store = TestBed.inject(ProjectStoreService);
    setProject(store, [createTask(1, 'Delivery', 0, 3)]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const originalFinish = d2s(store.scheduledTasks()[0].finish!);
    expect(originalFinish).toBe('2026-10-07');

    const holidayDate = compiled.querySelector(
      '[aria-label^="2026-10-06"]'
    ) as HTMLElement;
    expect(holidayDate).toBeTruthy();
    if (!holidayDate) return;
    holidayDate.click();
    fixture.detectChanges();

    const holidayName = compiled.querySelector(
      'input[placeholder="Holiday name (optional)"]'
    ) as HTMLInputElement;
    holidayName.value = 'Delivery blackout';
    holidayName.dispatchEvent(new Event('input', { bubbles: true }));
    compiled.querySelector('button[aria-label="Add Holiday"]')?.dispatchEvent(
      new Event('click', { bubbles: true })
    );
    fixture.detectChanges();

    const holidayFinish = d2s(store.scheduledTasks()[0].finish!);
    expect(holidayFinish).toBe('2026-10-08');

    (compiled.querySelector('button[aria-label="Undo"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(d2s(store.scheduledTasks()[0].finish!)).toBe(originalFinish);

    (compiled.querySelector('button[aria-label="Redo"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(d2s(store.scheduledTasks()[0].finish!)).toBe(holidayFinish);
    fixture.destroy();
  });

  it('provides accessible labels for Gantt dates and task bars', () => {
    const fixture = TestBed.createComponent(App);
    const store = TestBed.inject(ProjectStoreService);
    setProject(store, [createTask(1, 'Accessible task', 0, 2)]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[aria-label^="2026-10-05"]')).toBeTruthy();
    expect(
      compiled.querySelector('[aria-label="Task bar: Accessible task, starts 2026-10-05, finishes 2026-10-06"]')
    ).toBeTruthy();
    fixture.destroy();
  });

  it('moves and resizes a focused Gantt bar with arrow keys', () => {
    const fixture = TestBed.createComponent(App);
    const store = TestBed.inject(ProjectStoreService);
    setProject(store, [createTask(1, 'Keyboard schedule', 0, 3)]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const bar = compiled.querySelector(
      '[aria-label^="Task bar: Keyboard schedule"]'
    ) as HTMLElement;
    expect(bar?.getAttribute('aria-keyshortcuts')).toBe(
      'ArrowLeft ArrowRight Shift+ArrowLeft Shift+ArrowRight'
    );
    expect(bar?.getAttribute('title')).toContain('Shift+ArrowLeft/Right');
    bar.focus();

    const moveEvent = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true
    });
    bar.dispatchEvent(moveEvent);
    fixture.detectChanges();
    expect(moveEvent.defaultPrevented).toBe(true);
    expect(d2s(store.scheduledTasks()[0].start!)).toBe('2026-10-06');
    expect(store.scheduledTasks()[0].dur).toBe(3);

    bar.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        shiftKey: true,
        bubbles: true,
        cancelable: true
      })
    );
    fixture.detectChanges();
    expect(store.scheduledTasks()[0].dur).toBe(4);

    bar.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        shiftKey: true,
        bubbles: true,
        cancelable: true
      })
    );
    fixture.detectChanges();
    expect(store.scheduledTasks()[0].dur).toBe(3);

    const nestedEditor = document.createElement('input');
    bar.append(nestedEditor);
    nestedEditor.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true
      })
    );
    fixture.detectChanges();
    expect(d2s(store.scheduledTasks()[0].start!)).toBe('2026-10-06');
    bar.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        bubbles: true,
        cancelable: true
      })
    );
    fixture.detectChanges();
    expect(d2s(store.scheduledTasks()[0].start!)).toBe('2026-10-05');
    fixture.destroy();
  });

  it('moves focus into the calendar editor when opened from a date header by keyboard', async () => {
    const fixture = TestBed.createComponent(App);
    const store = TestBed.inject(ProjectStoreService);
    setProject(store, [createTask(1, 'Task', 0, 2)]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const dateHeader = compiled.querySelector(
      '[aria-label^="2026-10-05"]'
    ) as HTMLElement;
    dateHeader.focus();
    dateHeader.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );
    fixture.detectChanges();
    await fixture.whenStable();

    const holidayName = compiled.querySelector(
      'input[aria-label="Holiday name (optional)"]'
    ) as HTMLInputElement;
    expect(document.activeElement).toBe(holidayName);
    fixture.destroy();
  });

  it('restores focus to the date header when its keyboard-opened calendar editor closes', async () => {
    const fixture = TestBed.createComponent(App);
    const store = TestBed.inject(ProjectStoreService);
    setProject(store, [createTask(1, 'Task', 0, 2)]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const dateHeader = compiled.querySelector(
      '[aria-label^="2026-10-05"]'
    ) as HTMLElement;
    dateHeader.focus();
    dateHeader.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', bubbles: true })
    );
    fixture.detectChanges();
    await fixture.whenStable();

    const closeButton = compiled.querySelector(
      'button[aria-label="Close calendar editor"]'
    ) as HTMLButtonElement;
    closeButton.focus();
    closeButton.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.activeElement).toBe(dateHeader);
    fixture.destroy();
  });

  it('dispatches undo and redo keyboard shortcuts through the store', () => {
    const fixture = TestBed.createComponent(App);
    const store = TestBed.inject(ProjectStoreService);
    const undoSpy = vi.spyOn(store, 'undo');
    const redoSpy = vi.spyOn(store, 'redo');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true }));

    expect(undoSpy).toHaveBeenCalledTimes(1);
    expect(redoSpy).toHaveBeenCalledTimes(2);
    fixture.destroy();
  });

  it('ignores undo and redo keyboard shortcuts while editing text', () => {
    const fixture = TestBed.createComponent(App);
    const store = TestBed.inject(ProjectStoreService);
    const undoSpy = vi.spyOn(store, 'undo');
    const redoSpy = vi.spyOn(store, 'redo');
    fixture.detectChanges();

    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    Object.defineProperty(editable, 'isContentEditable', { value: true });
    for (const element of [document.createElement('input'), document.createElement('textarea'), editable]) {
      document.body.append(element);
      element.focus();
      for (const keyEvent of [
        { key: 'z', shiftKey: false },
        { key: 'z', shiftKey: true },
        { key: 'y', shiftKey: false }
      ]) {
        element.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: keyEvent.key,
            ctrlKey: true,
            shiftKey: keyEvent.shiftKey,
            bubbles: true
          })
        );
      }
      element.remove();
    }

    expect(undoSpy).not.toHaveBeenCalled();
    expect(redoSpy).not.toHaveBeenCalled();
    fixture.destroy();
  });
});
