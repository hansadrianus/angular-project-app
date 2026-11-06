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
