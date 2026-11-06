import { Injectable, computed, effect, signal } from '@angular/core';
import {
  DashboardSegment,
  Holiday,
  ProjectState,
  ProjectStats,
  Task
} from '../models/project.model';
import {
  addDays,
  addWorkDays,
  calDays,
  d2s,
  nextWorkDay,
  s2d,
  taskStatus,
  workDaysBetween
} from '../utils/date-utils';

const LS_KEY = 'projectflow-angular-v1';
const MAX_HISTORY_ENTRIES = 100;

@Injectable({ providedIn: 'root' })
export class ProjectStoreService {
  private uidSeq = 1;
  private readonly undoHistory = signal<ProjectState[]>([]);
  private readonly redoHistory = signal<ProjectState[]>([]);

  readonly state = signal<ProjectState>(this.getInitialState());
  readonly canUndo = computed(() => this.undoHistory().length > 0);
  readonly canRedo = computed(() => this.redoHistory().length > 0);
  readonly selectedUid = signal<number | null>(null);
  readonly linkMode = signal<boolean>(false);
  readonly linkFrom = signal<number | null>(null);
  readonly zoomLevel = signal<number>(40);
  readonly savedAt = signal<string>('just now');

  // Modals state
  readonly showHolidaysModal = signal<boolean>(false);
  readonly showDashboardModal = signal<boolean>(false);

  // Scheduled tasks derived reactively
  readonly scheduledTasks = computed(() => {
    const currentState = this.state();
    return this.calculateSchedule(currentState);
  });

  // Hierarchy visibility (respects summary collapsed state)
  readonly visibleTasks = computed(() => {
    const tasks = this.scheduledTasks();
    const visible: Task[] = [];
    const stack: number[] = [];

    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      while (stack.length > 0 && stack[stack.length - 1] >= t.level) {
        stack.pop();
      }
      if (stack.length > 0) continue;

      visible.push(t);
      if (t.collapsed && this.isSummaryIndex(tasks, i)) {
        stack.push(t.level);
      }
    }
    return visible;
  });

  // Overall Gantt date range
  readonly ganttRange = computed<[Date, Date]>(() => {
    const tasks = this.scheduledTasks();
    const currentState = this.state();
    let minS: Date | null = null;
    let maxF: Date | null = null;

    for (const t of tasks) {
      if (!t.start) continue;
      if (!minS || t.start < minS) minS = t.start;
      if (!maxF || (t.finish && t.finish > maxF)) maxF = t.finish;
    }

    if (!minS) {
      minS = s2d(currentState.projectStart);
      maxF = addDays(minS, 30);
    }
    return [addDays(minS, -3), addDays(maxF || minS, 7)];
  });

  // Stats computed
  readonly stats = computed<ProjectStats>(() => {
    const tasks = this.scheduledTasks();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const leaves = tasks.filter((t, i) => !this.isSummaryIndex(tasks, i));
    const summaries = tasks.filter((t, i) => this.isSummaryIndex(tasks, i));
    const milestones = leaves.filter((t) => t.dur === 0);

    let done = 0;
    let inProgress = 0;
    let notStarted = 0;
    let overdue = 0;
    let wSum = 0;
    let wDur = 0;

    for (const t of leaves) {
      const status = taskStatus(t, today);
      if (status === 'Done') done++;
      else if (status === 'Overdue') overdue++;
      else if (status === 'In progress') inProgress++;
      else notStarted++;

      const dur = t.dur || 0;
      wSum += dur * (t.prog / 100);
      wDur += dur;
    }

    const overallProgress = wDur > 0 ? Math.round((100 * wSum) / wDur) : 0;

    return {
      totalTasks: tasks.length,
      leavesCount: leaves.length,
      summariesCount: summaries.length,
      milestonesCount: milestones.length,
      doneCount: done,
      inProgressCount: inProgress,
      notStartedCount: notStarted,
      overdueCount: overdue,
      overallProgress
    };
  });

  readonly dashboardSegments = computed<DashboardSegment[]>(() => {
    const s = this.stats();
    return [
      { label: 'Done', count: s.doneCount, color: '#16a34a' },
      { label: 'In progress', count: s.inProgressCount, color: '#2563eb' },
      { label: 'Not started', count: s.notStartedCount, color: '#cbd5e1' },
      { label: 'Overdue', count: s.overdueCount, color: '#dc2626' }
    ];
  });

  constructor() {
    // Auto-save on state change
    effect(() => {
      const s = this.state();
      this.persistToStorage(s);
    });
  }

  // --- Task mutations ---

  addTask(): void {
    this.commitState((s) => {
      const tasks = [...s.tasks];
      const selId = this.selectedUid();
      const selectedIndex = selId !== null ? tasks.findIndex((t) => t.uid === selId) : -1;
      const selIdx = selectedIndex >= 0 ? selectedIndex : tasks.length - 1;
      const lvl = selIdx >= 0 && tasks[selIdx] ? tasks[selIdx].level : 0;

      const newTask: Task = {
        uid: this.uidSeq++,
        name: 'New task',
        dur: 1,
        level: lvl,
        preds: [],
        prog: 0,
        startInput: null,
        actualStart: null,
        actualEnd: null,
        collapsed: false,
        start: null,
        finish: null
      };

      tasks.splice(selIdx + 1, 0, newTask);
      this.selectedUid.set(newTask.uid);
      return { ...s, tasks };
    });
  }

  deleteTask(): void {
    const selId = this.selectedUid();
    if (selId === null) return;

    this.commitState((s) => {
      const tasks = [...s.tasks];
      const idx = tasks.findIndex((t) => t.uid === selId);
      if (idx < 0) return s;

      let end = idx;
      if (this.isSummaryIndex(tasks, idx)) {
        end = this.childRange(tasks, idx)[1];
      }

      const removed = new Set(tasks.splice(idx, end - idx + 1).map((task) => task.uid));
      const updatedTasks = tasks.map((task) => ({
        ...task,
        preds: task.preds.filter((pred) => !removed.has(pred))
      }));

      this.selectedUid.set(null);
      return { ...s, tasks: updatedTasks };
    });
  }

  indent(): void {
    const selId = this.selectedUid();
    if (selId === null) return;

    this.commitState((s) => {
      const tasks = [...s.tasks];
      const i = tasks.findIndex((t) => t.uid === selId);
      if (i <= 0) return s;

      const prev = tasks[i - 1];
      if (tasks[i].level <= prev.level) {
        const delta = 1;
        const end = this.isSummaryIndex(tasks, i) ? this.childRange(tasks, i)[1] : i;
        for (let k = i; k <= end; k++) {
          tasks[k] = { ...tasks[k], level: tasks[k].level + delta };
        }
      }
      return { ...s, tasks };
    });
  }

  outdent(): void {
    const selId = this.selectedUid();
    if (selId === null) return;

    this.commitState((s) => {
      const tasks = [...s.tasks];
      const i = tasks.findIndex((t) => t.uid === selId);
      if (i < 0 || tasks[i].level <= 0) return s;

      const end = this.isSummaryIndex(tasks, i) ? this.childRange(tasks, i)[1] : i;
      for (let k = i; k <= end; k++) {
        tasks[k] = { ...tasks[k], level: Math.max(0, tasks[k].level - 1) };
      }
      return { ...s, tasks };
    });
  }

  toggleCollapse(uid: number): void {
    this.commitState((s) => {
      const tasks = s.tasks.map((t) => (t.uid === uid ? { ...t, collapsed: !t.collapsed } : t));
      return { ...s, tasks };
    });
  }

  selectTask(uid: number | null): void {
    this.selectedUid.set(uid);
  }

  updateTaskField(uid: number, field: keyof Task, value: unknown): void {
    this.commitState((s) => {
      const tasks = s.tasks.map((t) => {
        if (t.uid !== uid) return t;
        const updated = { ...t };
        if (field === 'name') updated.name = String(value || '').trim() || t.name;
        else if (field === 'dur') updated.dur = Math.max(0, parseInt(String(value), 10) || 0);
        else if (field === 'prog')
          updated.prog = Math.min(100, Math.max(0, parseInt(String(value), 10) || 0));
        else if (field === 'startInput') updated.startInput = value ? String(value) : null;
        else if (field === 'actualStart') updated.actualStart = value ? String(value) : null;
        else if (field === 'actualEnd') {
          updated.actualEnd = value ? String(value) : null;
          if (updated.actualEnd) updated.prog = 100;
        } else if (field === 'preds' && Array.isArray(value)) {
          updated.preds = value as number[];
        }
        return updated;
      });
      return { ...s, tasks };
    });
  }

  reorderTasks(sourceUid: number, targetUid: number, position: 'before' | 'after'): void {
    this.commitState((s) => {
      const sourceIndex = s.tasks.findIndex((task) => task.uid === sourceUid);
      const targetIndex = s.tasks.findIndex((task) => task.uid === targetUid);
      if (sourceIndex < 0 || targetIndex < 0) return s;

      const sourceEnd = this.isSummaryIndex(s.tasks, sourceIndex)
        ? this.childRange(s.tasks, sourceIndex)[1]
        : sourceIndex;
      if (targetIndex >= sourceIndex && targetIndex <= sourceEnd) return s;

      const moved = s.tasks.slice(sourceIndex, sourceEnd + 1);
      const remaining = [
        ...s.tasks.slice(0, sourceIndex),
        ...s.tasks.slice(sourceEnd + 1)
      ];
      const remainingTargetIndex = remaining.findIndex((task) => task.uid === targetUid);
      const targetEnd = this.isSummaryIndex(remaining, remainingTargetIndex)
        ? this.childRange(remaining, remainingTargetIndex)[1]
        : remainingTargetIndex;
      const insertionIndex =
        position === 'before' ? remainingTargetIndex : targetEnd + 1;
      const levelDelta = remaining[remainingTargetIndex].level - moved[0].level;
      const adjustedBlock = moved.map((task) => ({
        ...task,
        level: task.level + levelDelta
      }));

      remaining.splice(insertionIndex, 0, ...adjustedBlock);
      return { ...s, tasks: remaining };
    });
  }

  // --- Linking ---

  toggleLinkMode(): void {
    this.linkMode.update((v) => !v);
    this.linkFrom.set(null);
  }

  handleLinkTask(uid: number): boolean {
    if (!this.linkMode()) return false;

    const from = this.linkFrom();
    if (from === null) {
      this.linkFrom.set(uid);
      return true;
    }

    if (from === uid) {
      this.linkFrom.set(null);
      this.linkMode.set(false);
      return true;
    }

    // Link from -> uid
    this.commitState((s) => {
      if (this.wouldCycle(s.tasks, uid, from)) {
        alert('Cannot link tasks: circular dependency detected.');
        return s;
      }
      const tasks = s.tasks.map((t) => {
        if (t.uid === uid && !t.preds.includes(from)) {
          return { ...t, preds: [...t.preds, from] };
        }
        return t;
      });
      return { ...s, tasks };
    });

    this.linkFrom.set(null);
    this.linkMode.set(false);
    return true;
  }

  // --- Calendar & Holidays mutations ---

  addHoliday(date: string, name: string): void {
    this.commitState((s) => {
      const holidays = s.holidays.filter((h) => h.date !== date);
      holidays.push({ date, name: name.trim() || 'Public Holiday' });
      return { ...s, holidays };
    });
  }

  deleteHoliday(date: string): void {
    this.commitState((s) => ({
      ...s,
      holidays: s.holidays.filter((h) => h.date !== date)
    }));
  }

  setWeekendDays(days: number[]): void {
    this.commitState((s) => ({ ...s, weekendDays: [...days] }));
  }

  toggleWorkingWeekend(date: string): void {
    this.commitState((s) => {
      const workingDays = s.workingDays.includes(date)
        ? s.workingDays.filter((d) => d !== date)
        : [...s.workingDays, date];
      return { ...s, workingDays };
    });
  }

  toggleCustomNonWork(date: string): void {
    this.commitState((s) => {
      const customNonWork = s.customNonWork.includes(date)
        ? s.customNonWork.filter((d) => d !== date)
        : [...s.customNonWork, date];
      return { ...s, customNonWork };
    });
  }

  zoomIn(): void {
    this.zoomLevel.update((z) => Math.min(80, z + 8));
  }

  zoomOut(): void {
    this.zoomLevel.update((z) => Math.max(24, z - 8));
  }

  resetDemoData(): void {
    this.uidSeq = 1;
    this.commitState(() => this.getDemoState());
    this.selectedUid.set(null);
  }

  clearProject(): void {
    this.uidSeq = 1;
    this.commitState(() => ({
      projectStart: d2s(new Date()),
      holidays: [],
      weekendDays: [0, 6],
      workingDays: [],
      customNonWork: [],
      tasks: []
    }));
    this.selectedUid.set(null);
  }

  loadImportedState(newState: ProjectState): void {
    this.commitState(() => this.snapshot(newState));
    this.updateUidSequence(this.state().tasks);
    this.selectedUid.set(null);
  }

  undo(): void {
    const history = this.undoHistory();
    const previousState = history.at(-1);
    if (!previousState) return;

    this.undoHistory.set(history.slice(0, -1));
    this.redoHistory.update((redo) => this.limitHistory([...redo, this.snapshot(this.state())]));
    this.restoreState(previousState);
  }

  redo(): void {
    const history = this.redoHistory();
    const nextState = history.at(-1);
    if (!nextState) return;

    this.redoHistory.set(history.slice(0, -1));
    this.undoHistory.update((undo) => this.limitHistory([...undo, this.snapshot(this.state())]));
    this.restoreState(nextState);
  }

  private commitState(update: (state: ProjectState) => ProjectState): void {
    this.state.update((currentState) => {
      const previousSnapshot = this.snapshot(currentState);
      const nextState = update(currentState);
      const nextSnapshot = this.snapshot(nextState);

      if (JSON.stringify(previousSnapshot) !== JSON.stringify(nextSnapshot)) {
        this.undoHistory.update((history) => this.limitHistory([...history, previousSnapshot]));
        this.redoHistory.set([]);
      }

      return nextState;
    });
  }

  private snapshot(state: ProjectState): ProjectState {
    return {
      projectStart: state.projectStart,
      holidays: state.holidays.map((holiday) => ({ ...holiday })),
      weekendDays: [...state.weekendDays],
      workingDays: [...state.workingDays],
      customNonWork: [...state.customNonWork],
      tasks: state.tasks.map((task) => ({
        uid: task.uid,
        name: task.name,
        dur: task.dur,
        level: task.level,
        preds: [...task.preds],
        prog: task.prog,
        startInput: task.startInput,
        actualStart: task.actualStart,
        actualEnd: task.actualEnd,
        collapsed: task.collapsed,
        start: null,
        finish: null
      }))
    };
  }

  private limitHistory(history: ProjectState[]): ProjectState[] {
    return history.slice(-MAX_HISTORY_ENTRIES);
  }

  private restoreState(state: ProjectState): void {
    const restoredState = this.snapshot(state);
    this.state.set(restoredState);
    this.updateUidSequence(restoredState.tasks);
    const selectedUid = this.selectedUid();
    if (selectedUid !== null && !restoredState.tasks.some((task) => task.uid === selectedUid)) {
      this.selectedUid.set(null);
    }
  }

  private updateUidSequence(tasks: Task[]): void {
    this.uidSeq = Math.max(
      this.uidSeq,
      tasks.length ? Math.max(...tasks.map((task) => task.uid)) + 1 : 1
    );
  }

  // --- Scheduler engine ---

  private calculateSchedule(state: ProjectState): Task[] {
    const tasks = state.tasks.map((t) => ({ ...t }));
    const byUid = new Map<number, Task>();
    tasks.forEach((t) => byUid.set(t.uid, t));

    // Forward pass for leaf tasks, fixed point iteration
    for (let iter = 0; iter < tasks.length + 2; iter++) {
      let changed = false;
      for (let i = 0; i < tasks.length; i++) {
        if (this.isSummaryIndex(tasks, i)) continue;
        const t = tasks[i];

        let s: Date | null = t.startInput ? s2d(t.startInput) : null;
        if (t.preds.length > 0) {
          let maxF: Date | null = null;
          for (const pid of t.preds) {
            const p = byUid.get(pid);
            if (p?.finish && (!maxF || p.finish > maxF)) {
              maxF = p.finish;
            }
          }
          if (maxF) {
            const c = nextWorkDay(
              addDays(maxF, 1),
              state.holidays,
              state.weekendDays,
              state.workingDays,
              state.customNonWork
            );
            if (!s || c > s) s = c;
          }
        }

        if (!s) s = s2d(state.projectStart);

        const f =
          t.dur > 0
            ? addWorkDays(
                s,
                t.dur,
                state.holidays,
                state.weekendDays,
                state.workingDays,
                state.customNonWork
              )
            : new Date(s);

        if (
          !t.start ||
          t.start.getTime() !== s.getTime() ||
          !t.finish ||
          t.finish.getTime() !== f.getTime()
        ) {
          t.start = s;
          t.finish = f;
          changed = true;
        }
      }

      if (this.rollupSummaries(tasks, state)) changed = true;
      if (!changed) break;
    }

    return tasks;
  }

  private rollupSummaries(tasks: Task[], state: ProjectState): boolean {
    let changed = false;
    for (let i = tasks.length - 1; i >= 0; i--) {
      if (!this.isSummaryIndex(tasks, i)) continue;
      const t = tasks[i];
      const [startIdx, endIdx] = this.childRange(tasks, i);

      let minS: Date | null = null;
      let maxF: Date | null = null;
      let minAS: Date | null = null;
      let maxAE: Date | null = null;
      let wSum = 0;
      let wDur = 0;

      for (let j = startIdx; j <= endIdx; j++) {
        const c = tasks[j];
        if (!c.start) continue;

        if (!minS || c.start < minS) minS = c.start;
        if (!maxF || (c.finish && c.finish > maxF)) maxF = c.finish;
        if (c.actualStart && (!minAS || s2d(c.actualStart) < minAS)) minAS = s2d(c.actualStart);
        if (c.actualEnd && (!maxAE || s2d(c.actualEnd) > maxAE)) maxAE = s2d(c.actualEnd);

        const w = c.dur || 0;
        wSum += w * (c.prog / 100);
        wDur += w;
      }

      if (t.start?.getTime() !== minS?.getTime() || t.finish?.getTime() !== maxF?.getTime()) {
        changed = true;
      }
      t.start = minS;
      t.finish = maxF;
      t.dur =
        minS && maxF
          ? workDaysBetween(
              minS,
              maxF,
              state.holidays,
              state.weekendDays,
              state.workingDays,
              state.customNonWork
            )
          : 0;
      t.prog = wDur > 0 ? Math.round((100 * wSum) / wDur) : 0;
      t.actualStart = minAS ? d2s(minAS) : null;
      t.actualEnd = maxAE ? d2s(maxAE) : null;
    }

    return changed;
  }

  isSummaryIndex(tasks: Task[], i: number): boolean {
    return i < tasks.length - 1 && tasks[i + 1].level > tasks[i].level;
  }

  childRange(tasks: Task[], i: number): [number, number] {
    let j = i + 1;
    while (j < tasks.length && tasks[j].level > tasks[i].level) {
      j++;
    }
    return [i + 1, j - 1];
  }

  wouldCycle(tasks: Task[], tUid: number, predUid: number): boolean {
    if (tUid === predUid) return true;
    const byUid = new Map<number, Task>();
    const indexByUid = new Map<number, number>();
    tasks.forEach((t, i) => {
      byUid.set(t.uid, t);
      indexByUid.set(t.uid, i);
    });

    const targetIndex = indexByUid.get(tUid);
    const predIndex = indexByUid.get(predUid);
    if (
      targetIndex !== undefined &&
      predIndex !== undefined &&
      this.isSummaryIndex(tasks, targetIndex)
    ) {
      const [, endIdx] = this.childRange(tasks, targetIndex);
      if (predIndex > targetIndex && predIndex <= endIdx) return true;
    }

    const seen = new Set<number>();
    const stack = [predUid];
    while (stack.length > 0) {
      const u = stack.pop()!;
      if (u === tUid) return true;
      if (seen.has(u)) continue;
      seen.add(u);
      const t = byUid.get(u);
      const index = indexByUid.get(u);
      if (t) {
        stack.push(...t.preds);
        if (index !== undefined && this.isSummaryIndex(tasks, index)) {
          const [, endIdx] = this.childRange(tasks, index);
          for (let i = index + 1; i <= endIdx; i++) {
            stack.push(tasks[i].uid);
          }
        }
      }
    }
    return false;
  }

  private getInitialState(): ProjectState {
    const fromStorage = this.loadFromStorage();
    if (fromStorage) return fromStorage;
    return this.getDemoState();
  }

  private getDemoState(): ProjectState {
    this.uidSeq = 1;
    const mk = (
      name: string,
      dur: number,
      level: number,
      preds: number[] = [],
      prog = 0,
      startInput: string | null = null,
      actualStart: string | null = null,
      actualEnd: string | null = null
    ): Task => ({
      uid: this.uidSeq++,
      name,
      dur,
      level,
      preds,
      prog,
      startInput,
      actualStart,
      actualEnd,
      collapsed: false,
      start: null,
      finish: null
    });

    const tasks: Task[] = [
      mk('Website Redesign', 0, 0),
      mk('Planning', 0, 1),
      mk('Requirements', 5, 2, [], 100, '2026-10-05', '2026-10-05', '2026-10-09'),
      mk('Wireframes', 5, 2, [3], 80, null, '2026-10-12', null),
      mk('Design', 0, 1),
      mk('Mockups', 5, 2, [4], 30, null, '2026-10-19', null),
      mk('Design system', 5, 2, [4], 10),
      mk('Development', 0, 1),
      mk('Frontend build', 10, 2, [7], 0),
      mk('Backend build', 10, 2, [7], 0),
      mk('Testing & QA', 5, 2, [9, 10], 0),
      mk('◆ Launch', 0, 2, [11], 0)
    ];

    return {
      projectStart: '2026-10-05',
      tasks,
      holidays: [
        { date: '2026-10-13', name: 'Columbus Day' },
        { date: '2026-11-04', name: 'Election Day' }
      ],
      weekendDays: [0, 6],
      workingDays: [],
      customNonWork: []
    };
  }

  private loadFromStorage(): ProjectState | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as Partial<ProjectState>;
      if (!data || !Array.isArray(data.tasks)) return null;

      const holidays = (data.holidays || []).map((h: unknown) => {
        if (typeof h === 'string') return { date: h, name: 'Public Holiday' };
        return h as Holiday;
      });

      this.uidSeq = data.tasks.length ? Math.max(...data.tasks.map((t) => t.uid)) + 1 : 1;

      return {
        projectStart: data.projectStart || '2026-10-05',
        tasks: data.tasks.map((t) => ({ ...t, start: null, finish: null })),
        holidays,
        weekendDays: data.weekendDays || [0, 6],
        workingDays: data.workingDays || [],
        customNonWork: data.customNonWork || []
      };
    } catch {
      return null;
    }
  }

  private persistToStorage(state: ProjectState): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const data: ProjectState = {
        projectStart: state.projectStart,
        holidays: state.holidays,
        weekendDays: state.weekendDays,
        workingDays: state.workingDays,
        customNonWork: state.customNonWork,
        tasks: state.tasks.map((t) => ({
          uid: t.uid,
          name: t.name,
          dur: t.dur,
          level: t.level,
          preds: t.preds,
          prog: t.prog,
          startInput: t.startInput,
          actualStart: t.actualStart,
          actualEnd: t.actualEnd,
          collapsed: t.collapsed,
          start: null,
          finish: null
        }))
      };
      localStorage.setItem(LS_KEY, JSON.stringify(data));
      this.savedAt.set(new Date().toLocaleTimeString());
    } catch {
      // Storage error ignored
    }
  }
}
