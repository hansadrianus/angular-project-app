import { TestBed } from '@angular/core/testing';
import type { Task } from '../models/project.model';
import { ProjectStoreService } from './project-store.service';
import { d2s } from '../utils/date-utils';

describe('ProjectStoreService', () => {
  let service: ProjectStoreService;

  const createTask = (
    uid: number,
    name: string,
    level: number,
    dur: number,
    preds: number[] = []
  ): Task => ({
    uid,
    name,
    dur,
    level,
    preds,
    prog: 0,
    startInput: null,
    actualStart: null,
    actualEnd: null,
    collapsed: false,
    start: null,
    finish: null
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProjectStoreService]
    });
    service = TestBed.inject(ProjectStoreService);
    service.resetDemoData();
  });

  it('schedules a task after the rolled-up finish of its summary predecessor', () => {
    service.state.update((state) => ({
      ...state,
      projectStart: '2026-10-05',
      holidays: [],
      weekendDays: [0, 6],
      workingDays: [],
      customNonWork: [],
      tasks: [
        createTask(1, 'Summary', 0, 0),
        createTask(2, 'First child', 1, 5),
        createTask(3, 'Last child', 1, 11),
        createTask(4, 'Dependent leaf', 0, 1, [1])
      ]
    }));

    const tasks = service.scheduledTasks();
    const summary = tasks.find((task) => task.uid === 1);
    const dependent = tasks.find((task) => task.uid === 4);

    expect(d2s(summary!.finish!)).toBe('2026-10-19');
    expect(d2s(dependent!.start!)).toBe('2026-10-20');
  });

  it('moves a summary-dependent task when a descendant duration changes', () => {
    service.state.update((state) => ({
      ...state,
      projectStart: '2026-10-05',
      holidays: [],
      weekendDays: [0, 6],
      workingDays: [],
      customNonWork: [],
      tasks: [
        createTask(1, 'Summary', 0, 0),
        createTask(2, 'Child', 1, 5),
        createTask(3, 'Dependent leaf', 0, 1, [1])
      ]
    }));

    const initialDependent = service.scheduledTasks().find((task) => task.uid === 3);
    expect(d2s(initialDependent!.start!)).toBe('2026-10-12');

    service.state.update((state) => ({
      ...state,
      tasks: state.tasks.map((task) =>
        task.uid === 2 ? { ...task, dur: 11 } : task
      )
    }));

    const updatedTasks = service.scheduledTasks();
    const updatedSummary = updatedTasks.find((task) => task.uid === 1);
    const updatedDependent = updatedTasks.find((task) => task.uid === 3);

    expect(d2s(updatedSummary!.finish!)).toBe('2026-10-19');
    expect(d2s(updatedDependent!.start!)).toBe('2026-10-20');
  });

  it('identifies summary self-links and links to descendants as cycles', () => {
    service.state.update((state) => ({
      ...state,
      tasks: [
        createTask(1, 'Summary', 0, 0),
        createTask(2, 'Child', 1, 1),
        createTask(3, 'Other task', 0, 1)
      ]
    }));

    const tasks = service.scheduledTasks();

    expect(service.wouldCycle(tasks, 1, 1)).toBe(true);
    expect(service.wouldCycle(tasks, 1, 2)).toBe(true);
  });

  it('moves a summary subtree while preserving descendant order and relative levels', () => {
    service.state.update((state) => ({
      ...state,
      tasks: [
        createTask(1, 'Parent', 0, 0),
        createTask(2, 'Summary', 1, 0),
        createTask(3, 'Child', 2, 1),
        createTask(4, 'Nested summary', 2, 0),
        createTask(5, 'Nested child', 3, 1),
        createTask(6, 'Other child', 1, 1),
        createTask(7, 'Destination', 0, 1)
      ]
    }));

    service.reorderTasks(2, 7, 'before');

    expect(service.state().tasks.map(({ uid, level }) => [uid, level])).toEqual([
      [1, 0],
      [6, 1],
      [2, 0],
      [3, 1],
      [4, 1],
      [5, 2],
      [7, 0]
    ]);
  });

  it('undoes and redoes a task name edit without losing its scheduled dates', () => {
    const task = service.state().tasks.find((item) => item.uid === 3)!;
    const originalFinish = d2s(service.scheduledTasks().find((item) => item.uid === 3)!.finish!);

    service.updateTaskField(task.uid, 'name', 'Updated requirements');

    expect(service.canUndo()).toBe(true);
    service.undo();
    expect(service.state().tasks.find((item) => item.uid === task.uid)?.name).toBe(task.name);
    expect(d2s(service.scheduledTasks().find((item) => item.uid === task.uid)!.finish!)).toBe(
      originalFinish
    );

    service.redo();
    expect(service.state().tasks.find((item) => item.uid === task.uid)?.name).toBe(
      'Updated requirements'
    );
    expect(service.canRedo()).toBe(false);
  });

  it('clears redo history when a new edit follows undo', () => {
    service.updateTaskField(3, 'name', 'First edit');
    service.undo();

    service.updateTaskField(3, 'name', 'Different edit');

    expect(service.canRedo()).toBe(false);
    expect(service.state().tasks.find((item) => item.uid === 3)?.name).toBe('Different edit');
  });

  it('undoes and redoes a summary subtree reorder', () => {
    service.state.update((state) => ({
      ...state,
      tasks: [
        createTask(1, 'Summary', 0, 0),
        createTask(2, 'Child', 1, 1),
        createTask(3, 'Destination', 0, 1)
      ]
    }));
    const originalTasks = service.state().tasks;

    service.reorderTasks(1, 3, 'after');
    const reorderedTasks = service.state().tasks;

    service.undo();
    expect(service.state().tasks).toEqual(originalTasks);
    service.redo();
    expect(service.state().tasks).toEqual(reorderedTasks);
  });

  it('undoes and redoes holiday edits', () => {
    const originalHolidays = service.state().holidays;

    service.addHoliday('2026-10-07', 'Mid-week Holiday');
    service.undo();
    expect(service.state().holidays).toEqual(originalHolidays);

    service.redo();
    expect(service.state().holidays).toContainEqual({
      date: '2026-10-07',
      name: 'Mid-week Holiday'
    });
  });

  it('undoes and redoes clearing a project', () => {
    const originalState = service.state();

    service.clearProject();
    service.undo();
    expect(service.state()).toEqual(originalState);

    service.redo();
    expect(service.state().tasks).toEqual([]);
  });

  it('undoes and redoes imported-state replacement', () => {
    const originalState = service.state();
    const importedState = {
      ...originalState,
      tasks: [createTask(40, 'Imported task', 0, 2)]
    };

    service.loadImportedState(importedState);
    service.undo();
    expect(service.state()).toEqual(originalState);

    service.redo();
    expect(service.state()).toEqual(importedState);
  });

  it('does not record no-op edits in history', () => {
    const originalName = service.state().tasks.find((item) => item.uid === 3)!.name;

    service.updateTaskField(3, 'name', originalName);

    expect(service.canUndo()).toBe(false);
  });

  it('does not reuse a deleted task UID for a later task', () => {
    const deletedUid = Math.max(...service.state().tasks.map((task) => task.uid));
    service.selectTask(deletedUid);
    service.deleteTask();

    service.addTask();

    expect(service.selectedUid()).toBeGreaterThan(deletedUid);
  });

  it('does not reuse a deleted task UID after undo and redo', () => {
    const deletedUid = Math.max(...service.state().tasks.map((task) => task.uid));
    service.selectTask(deletedUid);
    service.deleteTask();
    service.undo();
    service.redo();

    service.addTask();

    expect(service.selectedUid()).toBeGreaterThan(deletedUid);
  });

  it('does not serialize undo or redo history to localStorage', () => {
    const storedValues = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storedValues.get(key) ?? null,
      setItem: (key: string, value: string) => storedValues.set(key, value),
      removeItem: (key: string) => storedValues.delete(key)
    });
    service.updateTaskField(3, 'name', 'Updated requirements');
    TestBed.flushEffects();
    const savedState = JSON.parse(storedValues.get('projectflow-angular-v1')!);

    expect(savedState).not.toHaveProperty('undoStack');
    expect(savedState).not.toHaveProperty('redoStack');
    expect(Object.keys(savedState).sort()).toEqual([
      'customNonWork',
      'holidays',
      'projectStart',
      'tasks',
      'weekendDays',
      'workingDays'
    ]);
    vi.unstubAllGlobals();
  });

  it('moves a leaf task before the requested sibling', () => {
    service.state.update((state) => ({
      ...state,
      tasks: [
        createTask(2, 'First', 0, 1),
        createTask(3, 'Second', 0, 1),
        createTask(1, 'Third', 0, 1)
      ]
    }));

    service.reorderTasks(1, 2, 'before');
    expect(service.state().tasks.map((task) => task.uid)).toEqual([1, 2, 3]);
  });

  it('moves a leaf task after the requested sibling', () => {
    service.state.update((state) => ({
      ...state,
      tasks: [
        createTask(1, 'First', 0, 1),
        createTask(2, 'Second', 0, 1),
        createTask(3, 'Third', 0, 1)
      ]
    }));

    service.reorderTasks(1, 2, 'after');

    expect(service.state().tasks.map((task) => task.uid)).toEqual([2, 1, 3]);
  });

  it('rejects moving a summary onto its own descendant', () => {
    service.state.update((state) => ({
      ...state,
      tasks: [
        createTask(1, 'Summary', 0, 0),
        createTask(2, 'Child', 1, 1),
        createTask(3, 'Destination', 0, 1)
      ]
    }));
    const originalTasks = service.state().tasks;

    service.reorderTasks(1, 2, 'after');

    expect(service.state().tasks).toEqual(originalTasks);
  });

  it('reorders a collapsed summary subtree by UID rather than visible row index', () => {
    service.state.update((state) => ({
      ...state,
      tasks: [
        { ...createTask(2, 'Collapsed summary', 0, 0), collapsed: true },
        createTask(3, 'Hidden child', 1, 1),
        createTask(1, 'Visible destination', 0, 1)
      ]
    }));

    expect(service.visibleTasks().map((task) => task.uid)).toEqual([2, 1]);

    service.reorderTasks(2, 1, 'after');

    expect(service.state().tasks.map((task) => task.uid)).toEqual([1, 2, 3]);
    expect(service.state().tasks.map((task) => task.level)).toEqual([0, 0, 1]);
  });

  it('should initialize with demo tasks and compute schedule', () => {
    const tasks = service.scheduledTasks();
    expect(tasks.length).toBeGreaterThan(0);
    const req = tasks.find((t) => t.name === 'Requirements');
    expect(req).toBeDefined();
    expect(req?.start).toBeDefined();
    expect(req?.finish).toBeDefined();
  });

  it('should shift task finish when adding a holiday during its duration', () => {
    // Requirements starts on 2026-10-05 with 5 working days (Mon-Fri) -> finish is 2026-10-09
    const initialTasks = service.scheduledTasks();
    const reqBefore = initialTasks.find((t) => t.name === 'Requirements')!;
    expect(d2s(reqBefore.finish!)).toBe('2026-10-09');

    // Add Wednesday 2026-10-07 as a holiday
    service.addHoliday('2026-10-07', 'Mid-week Holiday');

    const updatedTasks = service.scheduledTasks();
    const reqAfter = updatedTasks.find((t) => t.name === 'Requirements')!;
    // With Wed as holiday, 5 working days are Mon, Tue, Thu, Fri, and next Mon (2026-10-12)
    expect(d2s(reqAfter.finish!)).toBe('2026-10-12');
  });

  it('should add a new task and select it', () => {
    const countBefore = service.state().tasks.length;
    service.addTask();
    const countAfter = service.state().tasks.length;
    expect(countAfter).toBe(countBefore + 1);
    expect(service.selectedUid()).toBeDefined();
  });

  it('appends a task after undo leaves the added task selected', () => {
    const originalUids = service.state().tasks.map((task) => task.uid);

    service.addTask();
    service.undo();
    service.addTask();

    expect(service.state().tasks.map((task) => task.uid).slice(0, -1)).toEqual(originalUids);
  });

  it('should delete a selected task and clear predecessors referencing it', () => {
    // Wireframes (uid 4) depends on Requirements (uid 3)
    service.selectTask(3);
    service.deleteTask();

    const tasks = service.state().tasks;
    const wireframes = tasks.find((t) => t.name === 'Wireframes');
    expect(wireframes?.preds).not.toContain(3);
  });

  it('should prevent circular dependencies', () => {
    const tasks = service.scheduledTasks();
    // 4 depends on 3. Linking 3 to 4 would cycle.
    const wouldCycle = service.wouldCycle(tasks, 3, 4);
    expect(wouldCycle).toBe(true);

    // Linking 7 to 3 does not cycle
    const noCycle = service.wouldCycle(tasks, 7, 3);
    expect(noCycle).toBe(false);
  });

  it('should adjust timeline zoom level within bounds', () => {
    const initial = service.zoomLevel();
    service.zoomIn();
    expect(service.zoomLevel()).toBe(initial + 8);
    service.zoomOut();
    expect(service.zoomLevel()).toBe(initial);
  });
});
