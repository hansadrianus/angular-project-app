export interface Task {
  uid: number;
  name: string;
  dur: number; // working days (0 = milestone)
  level: number; // hierarchy depth, 0 = top
  preds: number[]; // predecessor uids (finish-to-start)
  prog: number; // 0–100
  startInput: string | null; // user/drag-set plan start anchor (yyyy-mm-dd)
  actualStart: string | null; // yyyy-mm-dd
  actualEnd: string | null; // yyyy-mm-dd; setting it forces prog=100
  collapsed: boolean;
  // Computed by scheduler:
  start: Date | null;
  finish: Date | null;
}

export interface Holiday {
  date: string; // yyyy-mm-dd
  name: string; // e.g. "Thanksgiving"
}

export interface DayTypeInfo {
  type: 'workday' | 'weekend' | 'holiday' | 'customNonWork' | 'workingWeekend';
  name: string;
  isNonWork: boolean;
}

export interface ProjectState {
  projectStart: string; // yyyy-mm-dd
  holidays: Holiday[];
  weekendDays: number[]; // [0, 6] = Sun, Sat (configurable recurring non-working days)
  workingDays: string[]; // yyyy-mm-dd manual working-weekend overrides
  customNonWork: string[]; // yyyy-mm-dd manual non-working day overrides
  tasks: Task[];
}

export type TaskStatus = 'Done' | 'In progress' | 'Not started' | 'Overdue';

export interface DashboardSegment {
  label: string;
  count: number;
  color: string;
}

export interface ProjectStats {
  totalTasks: number;
  leavesCount: number;
  summariesCount: number;
  milestonesCount: number;
  doneCount: number;
  inProgressCount: number;
  notStartedCount: number;
  overdueCount: number;
  overallProgress: number;
}
