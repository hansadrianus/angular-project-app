import { DayTypeInfo, Holiday, ProjectState, Task, TaskStatus } from '../models/project.model';

export const DAY_MS = 86400000;

export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function d2s(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function s2d(s: string): Date {
  const parts = s.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export function addDays(d: Date, n: number): Date {
  const res = new Date(d);
  res.setDate(res.getDate() + n);
  return res;
}

export function calDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

export function fmt(d: Date | null): string {
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
}

export function fmtY(d: Date | null): string {
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
}

export function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getHoliday(d: Date, holidays: Holiday[]): Holiday | null {
  const s = d2s(d);
  for (const h of holidays) {
    if (h.date === s) return h;
  }
  return null;
}

export function isHoliday(d: Date, holidays: Holiday[]): boolean {
  return getHoliday(d, holidays) !== null;
}

export function isWk(d: Date, weekendDays: number[]): boolean {
  return weekendDays.includes(d.getDay());
}

export function isWorkOverride(d: Date, workingDays: string[]): boolean {
  const s = d2s(d);
  return workingDays.includes(s);
}

export function isCustomNonWork(d: Date, customNonWork: string[]): boolean {
  const s = d2s(d);
  return customNonWork.includes(s);
}

export function isNonWork(
  d: Date,
  holidays: Holiday[],
  weekendDays: number[],
  workingDays: string[],
  customNonWork: string[]
): boolean {
  if (isHoliday(d, holidays)) return true;
  if (isCustomNonWork(d, customNonWork)) return true;
  if (isWk(d, weekendDays)) {
    return !isWorkOverride(d, workingDays);
  }
  return false;
}

export function getDayType(
  d: Date,
  holidays: Holiday[],
  weekendDays: number[],
  workingDays: string[],
  customNonWork: string[]
): DayTypeInfo {
  const hol = getHoliday(d, holidays);
  if (hol) {
    return { type: 'holiday', name: hol.name || 'Public Holiday', isNonWork: true };
  }
  if (isCustomNonWork(d, customNonWork)) {
    return { type: 'customNonWork', name: 'Non-working Day', isNonWork: true };
  }
  if (isWk(d, weekendDays)) {
    if (isWorkOverride(d, workingDays)) {
      return { type: 'workingWeekend', name: 'Working Weekend', isNonWork: false };
    }
    return { type: 'weekend', name: 'Weekend', isNonWork: true };
  }
  return { type: 'workday', name: 'Working Day', isNonWork: false };
}

export function nextWorkDay(
  d: Date,
  holidays: Holiday[],
  weekendDays: number[],
  workingDays: string[],
  customNonWork: string[]
): Date {
  let r = new Date(d);
  while (isNonWork(r, holidays, weekendDays, workingDays, customNonWork)) {
    r = addDays(r, 1);
  }
  return r;
}

export function addWorkDays(
  start: Date,
  n: number,
  holidays: Holiday[],
  weekendDays: number[],
  workingDays: string[],
  customNonWork: string[]
): Date {
  if (n <= 0) return new Date(start);
  let d = new Date(start);
  let c = 1;
  while (c < n) {
    d = addDays(d, 1);
    if (!isNonWork(d, holidays, weekendDays, workingDays, customNonWork)) {
      c++;
    }
  }
  return d;
}

export function workDaysBetween(
  a: Date | null,
  b: Date | null,
  holidays: Holiday[],
  weekendDays: number[],
  workingDays: string[],
  customNonWork: string[]
): number {
  if (!a || !b || b < a) return 0;
  let d = new Date(a);
  let c = 0;
  while (d <= b) {
    if (!isNonWork(d, holidays, weekendDays, workingDays, customNonWork)) {
      c++;
    }
    d = addDays(d, 1);
  }
  return c;
}

export function taskStatus(t: Task, today: Date): TaskStatus {
  if (t.actualEnd || t.prog === 100) return 'Done';
  if (t.finish && t.finish < today) return 'Overdue';
  if (t.actualStart || t.prog > 0) return 'In progress';
  return 'Not started';
}
