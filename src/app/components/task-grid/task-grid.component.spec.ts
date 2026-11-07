import { TestBed } from '@angular/core/testing';
import { TaskGridComponent } from './task-grid.component';
import { ProjectStoreService } from '../../services/project-store.service';

const createPointerEvent = (type: string, clientX: number): PointerEvent => {
  const event = new Event(type, { bubbles: true, cancelable: true }) as PointerEvent;
  Object.defineProperties(event, {
    button: { value: 0 },
    clientX: { value: clientX },
    pointerId: { value: 1 }
  });
  return event;
};

describe('TaskGridComponent column resizing', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskGridComponent],
      providers: [ProjectStoreService]
    }).compileComponents();
  });

  it('uses shared full-width tracks for the header and task rows', () => {
    const fixture = TestBed.createComponent(TaskGridComponent);
    fixture.detectChanges();

    const table = fixture.nativeElement.querySelector('[role="table"]') as HTMLElement;
    const header = table.querySelector('[role="row"]') as HTMLElement;
    const firstColumnHeader = header.querySelector('[role="columnheader"]') as HTMLElement;
    const taskRow = table.querySelector('[role="row"][aria-label^="Task:"]') as HTMLElement;

    expect(firstColumnHeader.classList.contains('overflow-visible')).toBe(true);
    expect(firstColumnHeader.querySelector('span')?.classList.contains('truncate')).toBe(true);
    expect(table.classList.contains('w-full')).toBe(true);
    expect(table.classList.contains('min-w-[920px]')).toBe(true);
    expect(header.style.gridTemplateColumns).toBe(taskRow.style.gridTemplateColumns);
    expect(header.style.gridTemplateColumns).toContain('minmax(80px, 1fr)');
    fixture.destroy();
  });

  it('centers the visible divider inside the resize hit area', () => {
    const fixture = TestBed.createComponent(TaskGridComponent);
    fixture.detectChanges();

    const separator = fixture.nativeElement.querySelector(
      '[role="separator"][aria-label="Resize ID and Task Name columns"]'
    ) as HTMLElement;
    const visibleDivider = separator.querySelector('[aria-hidden="true"]') as HTMLElement | null;

    expect(separator.classList.contains('w-6')).toBe(true);
    expect(separator.classList.contains('translate-x-1/2')).toBe(true);
    expect(separator.classList.contains('border-r')).toBe(false);
    expect(visibleDivider).toBeTruthy();
    expect(visibleDivider?.classList.contains('left-1/2')).toBe(true);
    expect(visibleDivider?.classList.contains('border-l')).toBe(true);
    expect(visibleDivider?.classList.contains('pointer-events-none')).toBe(true);
    fixture.destroy();
  });

  it('resizes adjacent columns with the pointer and clamps them to their minimums', () => {
    const fixture = TestBed.createComponent(TaskGridComponent);
    fixture.detectChanges();

    const separator = fixture.nativeElement.querySelector(
      '[role="separator"][aria-label="Resize Task Name and Duration columns"]'
    ) as HTMLElement;
    const header = fixture.nativeElement.querySelector('[role="row"]') as HTMLElement;

    separator.dispatchEvent(createPointerEvent('pointerdown', 200));
    separator.dispatchEvent(createPointerEvent('pointermove', 180));
    fixture.detectChanges();

    expect(separator.getAttribute('aria-valuenow')).toBe('238');
    expect(header.style.gridTemplateColumns).toContain('200px 80px');

    separator.dispatchEvent(createPointerEvent('pointerdown', 200));
    separator.dispatchEvent(createPointerEvent('pointermove', 1000));
    fixture.detectChanges();

    expect(separator.getAttribute('aria-valuenow')).toBe('266');
    expect(header.style.gridTemplateColumns).toContain('228px 52px');

    separator.dispatchEvent(createPointerEvent('pointerdown', 200));
    separator.dispatchEvent(createPointerEvent('pointermove', -900));
    separator.dispatchEvent(createPointerEvent('pointerup', -900));
    fixture.detectChanges();

    expect(separator.getAttribute('aria-valuenow')).toBe('178');
    expect(header.style.gridTemplateColumns).toContain('140px 140px');
    fixture.destroy();
  });

  it('resizes by eight pixels with arrow keys without crossing minimum widths', () => {
    const fixture = TestBed.createComponent(TaskGridComponent);
    fixture.detectChanges();

    const separator = fixture.nativeElement.querySelector(
      '[role="separator"][aria-label="Resize Task Name and Duration columns"]'
    ) as HTMLElement;
    const header = fixture.nativeElement.querySelector('[role="row"]') as HTMLElement;
    const leftEvent = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      bubbles: true,
      cancelable: true
    });

    separator.dispatchEvent(leftEvent);
    fixture.detectChanges();
    expect(leftEvent.defaultPrevented).toBe(true);
    expect(separator.getAttribute('aria-valuenow')).toBe('250');

    separator.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
    );
    fixture.detectChanges();
    expect(separator.getAttribute('aria-valuenow')).toBe('258');

    for (let i = 0; i < 20; i++) {
      separator.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })
      );
    }
    fixture.detectChanges();

    expect(separator.getAttribute('aria-valuenow')).toBe('178');
    expect(header.style.gridTemplateColumns).toContain('140px 140px');

    for (let i = 0; i < 20; i++) {
      separator.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
      );
    }
    fixture.detectChanges();

    expect(separator.getAttribute('aria-valuenow')).toBe('266');
    expect(header.style.gridTemplateColumns).toContain('228px 52px');
    fixture.destroy();
  });

  it('resizes the flexible Status column up to its minimum width', () => {
    const fixture = TestBed.createComponent(TaskGridComponent);
    fixture.detectChanges();

    const separator = fixture.nativeElement.querySelector(
      '[role="separator"][aria-label="Resize % Comp. and Status columns"]'
    ) as HTMLElement;

    expect(separator.getAttribute('aria-valuemax')).toBe('840');
    for (let i = 0; i < 10; i++) {
      separator.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
      );
    }
    fixture.detectChanges();

    expect(separator.getAttribute('aria-valuenow')).toBe('840');
    fixture.destroy();
  });

  it('uses the rendered table width when expanding beyond the minimum width', () => {
    const fixture = TestBed.createComponent(TaskGridComponent);
    fixture.detectChanges();

    const table = fixture.nativeElement.querySelector('[role="table"]') as HTMLElement;
    Object.defineProperty(table, 'clientWidth', { configurable: true, value: 1080 });
    fixture.detectChanges();
    expect(fixture.componentInstance.taskTable()?.nativeElement).toBe(table);
    expect(table.clientWidth).toBe(1080);
    const separator = fixture.nativeElement.querySelector(
      '[role="separator"][aria-label="Resize % Comp. and Status columns"]'
    ) as HTMLElement;

    for (let i = 0; i < 25; i++) {
      separator.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
      );
    }
    fixture.detectChanges();

    expect(separator.getAttribute('aria-valuemax')).toBe('1000');
    expect(separator.getAttribute('aria-valuenow')).toBe('1000');
    fixture.destroy();
  });
});
