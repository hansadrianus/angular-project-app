import { TestBed } from '@angular/core/testing';
import { ProjectStoreService } from './project-store.service';
import { d2s } from '../utils/date-utils';

describe('ProjectStoreService', () => {
  let service: ProjectStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProjectStoreService]
    });
    service = TestBed.inject(ProjectStoreService);
    service.resetDemoData();
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
