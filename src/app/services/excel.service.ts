import { Injectable, inject } from '@angular/core';
import * as XLSX from 'xlsx';
import { ProjectState, Task } from '../models/project.model';
import { calDays, d2s, fmtY, s2d, taskStatus } from '../utils/date-utils';
import { CaptureService } from './capture.service';

@Injectable({ providedIn: 'root' })
export class ExcelService {
  private captureService = inject(CaptureService);

  async exportProject(
    state: ProjectState,
    scheduledTasks: Task[],
    ganttElement?: HTMLElement
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const leaves = scheduledTasks.filter((t, i) => !this.isSummary(scheduledTasks, i) && t.dur > 0);
    const done = leaves.filter((t) => taskStatus(t, today) === 'Done').length;
    const over = leaves.filter((t) => taskStatus(t, today) === 'Overdue').length;
    const inprog = leaves.filter((t) => taskStatus(t, today) === 'In progress').length;
    const ns = leaves.length - done - over - inprog;

    let wSum = 0;
    let wDur = 0;
    leaves.forEach((t) => {
      wSum += t.dur * (t.prog / 100);
      wDur += t.dur;
    });
    const overall = wDur ? Math.round((100 * wSum) / wDur) : 0;

    const root = scheduledTasks[0];
    const projName = root ? root.name.replace(/^◆\s*/, '') : 'Project';
    const milestones = scheduledTasks.filter(
      (t, i) => !this.isSummary(scheduledTasks, i) && t.dur === 0
    );
    const phases = scheduledTasks.filter((t, i) => this.isSummary(scheduledTasks, i));

    const byUid = new Map<number, Task>();
    scheduledTasks.forEach((t) => byUid.set(t.uid, t));
    const rowNo = (t: Task) => scheduledTasks.findIndex((x) => x.uid === t.uid) + 1;

    // 1. Tasks Sheet
    const taskRows: unknown[][] = [
      [
        'ID',
        'Task Name',
        'Duration (days)',
        'Plan Start',
        'Plan Finish',
        'Actual Start',
        'Actual End',
        'Predecessors',
        '% Complete',
        'Status'
      ]
    ];

    scheduledTasks.forEach((t, i) => {
      const sum = this.isSummary(scheduledTasks, i);
      const status = sum ? '' : taskStatus(t, today);
      const predNos = t.preds
        .map((p) => {
          const x = byUid.get(p);
          return x ? rowNo(x) : null;
        })
        .filter((x) => x !== null)
        .join(', ');

      taskRows.push([
        i + 1,
        '  '.repeat(t.level) + t.name,
        t.dur,
        fmtY(t.start),
        fmtY(t.finish),
        t.actualStart ? fmtY(s2d(t.actualStart)) : '',
        t.actualEnd ? fmtY(s2d(t.actualEnd)) : '',
        predNos,
        t.prog / 100,
        status
      ]);
    });

    // 2. Executive Summary Sheet
    const barChart = (pct: number) => {
      const p = Math.max(0, Math.min(100, Math.round(pct)));
      const filled = Math.round(p / 10);
      return '█'.repeat(filled) + '░'.repeat(10 - filled);
    };

    const summaryRows: unknown[][] = [
      [`${projName} — Executive Status Report`],
      ['Generated', fmtY(today)],
      [],
      ['Overall completion', `${barChart(overall)}  ${overall}%`],
      ['Plan start', root?.start ? fmtY(root.start) : ''],
      ['Plan finish', root?.finish ? fmtY(root.finish) : ''],
      ['Tasks done', `${done} of ${leaves.length}`],
      ['Overdue tasks', over],
      [],
      ['Status', 'Tasks', 'Chart'],
      ['Done', done, barChart(leaves.length ? (done / leaves.length) * 100 : 0)],
      ['In progress', inprog, barChart(leaves.length ? (inprog / leaves.length) * 100 : 0)],
      ['Not started', ns, barChart(leaves.length ? (ns / leaves.length) * 100 : 0)],
      ['Overdue', over, barChart(leaves.length ? (over / leaves.length) * 100 : 0)],
      [],
      ['Phase', 'Plan Start', 'Plan Finish', 'Actual Start', 'Actual End', '% Complete', 'Progress']
    ];

    for (const p of phases) {
      summaryRows.push([
        p.name,
        fmtY(p.start),
        fmtY(p.finish),
        p.actualStart ? fmtY(s2d(p.actualStart)) : '',
        p.actualEnd ? fmtY(s2d(p.actualEnd)) : '',
        `${p.prog}%`,
        barChart(p.prog)
      ]);
    }

    summaryRows.push([], ['Milestone', 'Plan Date', 'Actual Date', 'Status']);
    for (const m of milestones) {
      summaryRows.push([
        m.name.replace(/^◆\s*/, ''),
        fmtY(m.start),
        m.actualEnd ? fmtY(s2d(m.actualEnd)) : '',
        taskStatus(m, today)
      ]);
    }

    summaryRows.push([], ['⚠ Needs attention']);
    const risks = leaves.filter((t) => taskStatus(t, today) === 'Overdue');
    if (risks.length > 0) {
      risks.forEach((t) => summaryRows.push([t.name, `Was due ${fmtY(t.finish)}`, `${t.prog}% done`]));
    } else {
      summaryRows.push(['Nothing overdue']);
    }

    leaves
      .filter((t) => t.actualStart && t.start && s2d(t.actualStart) > t.start)
      .forEach((t) => {
        if (t.start && t.actualStart) {
          summaryRows.push([
            t.name,
            `Started ${calDays(t.start, s2d(t.actualStart))}d late`,
            ''
          ]);
        }
      });

    // 3. Timeline Sheet
    const timelineRows: unknown[][] = [
      [`${projName} — Timeline Overview`],
      ['Generated', fmtY(today)],
      [],
      ['The full Gantt timeline is displayed in the web application with interactive zoom and drag features.'],
      ['Total working days scheduled:', scheduledTasks.reduce((acc, t) => acc + (t.dur || 0), 0)]
    ];

    const wb = XLSX.utils.book_new();

    const wsTasks = XLSX.utils.aoa_to_sheet(taskRows);
    wsTasks['!cols'] = [
      { wch: 6 },
      { wch: 32 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 }
    ];
    XLSX.utils.book_append_sheet(wb, wsTasks, 'Tasks');

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = [
      { wch: 28 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 20 }
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');

    const wsTimeline = XLSX.utils.aoa_to_sheet(timelineRows);
    XLSX.utils.book_append_sheet(wb, wsTimeline, 'Timeline');

    // Generate and download
    const filename = `${projName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-report.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  parseExcelFile(data: ArrayBuffer, currentState: ProjectState): ProjectState {
    const wb = XLSX.read(data, { type: 'array', cellDates: true });
    const sheetName = wb.SheetNames.includes('Tasks') ? 'Tasks' : wb.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
      header: 1,
      raw: true
    });

    const tasks: Task[] = [];
    const predMap: number[][] = [];
    let maxUid = 0;

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row[1] == null || String(row[1]).trim() === '') continue;

      const rawName = String(row[1]);
      const name = rawName.trim();
      const level = Math.min(6, Math.floor((rawName.length - rawName.trimStart().length) / 2));
      const dur = Math.max(0, parseInt(String(row[2]), 10) || 0);

      const planStart = this.parseDateCell(row[3]);
      const actualStart = this.parseDateCell(row[5]);
      const actualEnd = this.parseDateCell(row[6]);

      let progRaw = row[8];
      let prog = 0;
      if (typeof progRaw === 'string') prog = parseFloat(progRaw.replace('%', ''));
      else if (typeof progRaw === 'number') {
        prog = progRaw > 0 && progRaw <= 1 ? progRaw * 100 : progRaw;
      }
      prog = Math.min(100, Math.max(0, Math.round(prog || 0)));

      const predNos = String(row[7] || '')
        .split(/[,\s]+/)
        .filter(Boolean)
        .map(Number);

      const task: Task = {
        uid: ++maxUid,
        name,
        dur,
        level,
        preds: [],
        prog,
        startInput: planStart,
        actualStart,
        actualEnd,
        collapsed: false,
        start: null,
        finish: null
      };

      tasks.push(task);
      predMap.push(predNos);
    }

    if (tasks.length === 0) {
      throw new Error('No valid tasks found in the uploaded file.');
    }

    // Resolve predecessors by row index
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      const nos = predMap[i];
      for (const no of nos) {
        const p = tasks[no - 1];
        if (p && p.uid !== t.uid && !t.preds.includes(p.uid)) {
          t.preds.push(p.uid);
        }
      }
    }

    const starts = tasks.map((t) => t.startInput).filter(Boolean).sort() as string[];
    const projectStart = starts[0] || d2s(new Date());

    return {
      projectStart,
      tasks,
      holidays: currentState.holidays,
      weekendDays: currentState.weekendDays,
      workingDays: currentState.workingDays,
      customNonWork: currentState.customNonWork
    };
  }

  private parseDateCell(v: unknown): string | null {
    if (v == null || v === '') return null;
    if (v instanceof Date && !isNaN(v.getTime())) return d2s(v);
    if (typeof v === 'number') {
      const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
      return d2s(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    }
    const d = new Date(String(v));
    return isNaN(d.getTime()) ? null : d2s(d);
  }

  private isSummary(tasks: Task[], i: number): boolean {
    return i < tasks.length - 1 && tasks[i + 1].level > tasks[i].level;
  }
}
