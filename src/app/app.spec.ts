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
});
