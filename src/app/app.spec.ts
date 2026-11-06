import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { ProjectStoreService } from './services/project-store.service';

describe('App', () => {
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
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));

    expect(undoSpy).not.toHaveBeenCalled();
    input.remove();
    fixture.destroy();
  });
});
