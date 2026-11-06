import { Injectable, inject } from '@angular/core';
import type ExcelJS from 'exceljs';
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
    ganttElement?: HTMLElement,
  ): Promise<void> {
    const workbook = await this.createWorkbook(state, scheduledTasks, ganttElement);
    const buffer = await workbook.xlsx.writeBuffer();
    const root = scheduledTasks[0];
    const projectName = root ? root.name.replace(/^◆\s*/, '') : 'Project';
    const filename = `${projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-report.xlsx`;
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = filename;
    downloadLink.click();
    URL.revokeObjectURL(url);
  }

  async createWorkbook(
    state: ProjectState,
    scheduledTasks: Task[],
    ganttElement?: HTMLElement,
  ): Promise<ExcelJS.Workbook> {
    const exceljs = await import('exceljs');
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
      (t, i) => !this.isSummary(scheduledTasks, i) && t.dur === 0,
    );
    const phases = scheduledTasks.filter((t, i) => this.isSummary(scheduledTasks, i));

    const byUid = new Map<number, Task>();
    scheduledTasks.forEach((t) => byUid.set(t.uid, t));
    const rowNo = (t: Task) => scheduledTasks.findIndex((x) => x.uid === t.uid) + 1;
    const workbook = new exceljs.default.Workbook();
    workbook.creator = 'ProjectFlow';
    workbook.created = new Date();
    workbook.modified = new Date();

    const navy = '17365D';
    const paleBlue = 'DCE6F1';
    const white = 'FFFFFF';
    const borderColor = 'D9E2F3';
    const applySectionHeader = (row: ExcelJS.Row): void => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: navy } };
        cell.font = { bold: true, color: { argb: white } };
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.border = { bottom: { style: 'thin', color: { argb: borderColor } } };
      });
      row.height = 24;
    };

    // Tasks
    const tasksSheet = workbook.addWorksheet('Tasks');
    tasksSheet.columns = [
      { header: 'ID', key: 'id', width: 7 },
      { header: 'Task Name', key: 'name', width: 38 },
      { header: 'Duration (days)', key: 'duration', width: 16 },
      { header: 'Plan Start', key: 'planStart', width: 15 },
      { header: 'Plan Finish', key: 'planFinish', width: 15 },
      { header: 'Actual Start', key: 'actualStart', width: 15 },
      { header: 'Actual End', key: 'actualEnd', width: 15 },
      { header: 'Predecessors', key: 'predecessors', width: 16 },
      { header: '% Complete', key: 'progress', width: 14 },
      { header: 'Status', key: 'status', width: 16 },
    ];
    applySectionHeader(tasksSheet.getRow(1));
    tasksSheet.views = [{ state: 'frozen', ySplit: 1 }];
    tasksSheet.autoFilter = { from: 'A1', to: `J${Math.max(1, scheduledTasks.length + 1)}` };

    scheduledTasks.forEach((task, index) => {
      const summaryTask = this.isSummary(scheduledTasks, index);
      const predecessors = task.preds
        .map((uid) => byUid.get(uid))
        .filter((predecessor): predecessor is Task => predecessor !== undefined)
        .map((predecessor) => rowNo(predecessor))
        .join(', ');
      const row = tasksSheet.addRow([
        index + 1,
        `${'  '.repeat(task.level)}${task.name}`,
        task.dur,
        fmtY(task.start),
        fmtY(task.finish),
        task.actualStart ? fmtY(s2d(task.actualStart)) : '',
        task.actualEnd ? fmtY(s2d(task.actualEnd)) : '',
        predecessors,
        task.prog / 100,
        summaryTask ? '' : taskStatus(task, today),
      ]);
      row.getCell(9).numFmt = '0%';
      row.alignment = { vertical: 'middle' };
      row.eachCell((cell) => {
        cell.border = { bottom: { style: 'hair', color: { argb: borderColor } } };
      });
      if (summaryTask) {
        row.font = { bold: true, color: { argb: navy } };
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: paleBlue } };
      } else {
        const status = row.getCell(10).value;
        const statusColor: Record<string, string> = {
          Done: 'E2F0D9',
          'In progress': 'DDEBF7',
          'Not started': 'F2F2F2',
          Overdue: 'FCE4D6',
        };
        const color = statusColor[String(status)];
        if (color) {
          row.getCell(10).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: color },
          };
          row.getCell(10).font = { bold: true };
        }
      }
    });

    // Executive Summary
    const barChart = (pct: number) => {
      const p = Math.max(0, Math.min(100, Math.round(pct)));
      const filled = Math.round(p / 10);
      return '█'.repeat(filled) + '░'.repeat(10 - filled);
    };

    const summarySheet = workbook.addWorksheet('Executive Summary');
    summarySheet.columns = [
      { width: 32 },
      { width: 18 },
      { width: 22 },
      { width: 18 },
      { width: 18 },
      { width: 15 },
      { width: 22 },
    ];
    summarySheet.mergeCells('A1:G1');
    summarySheet.getCell('A1').value = `${projName} — Executive Status Report`;
    summarySheet.getCell('A1').font = { bold: true, size: 18, color: { argb: white } };
    summarySheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: navy },
    };
    summarySheet.getCell('A1').alignment = { vertical: 'middle' };
    summarySheet.getRow(1).height = 34;
    summarySheet.getCell('A2').value = 'Generated';
    summarySheet.getCell('B2').value = fmtY(today);
    summarySheet.getCell('A4').value = 'Overall completion';
    summarySheet.getCell('B4').value = overall / 100;
    summarySheet.getCell('B4').numFmt = '0%';
    summarySheet.getCell('C4').value = barChart(overall);
    summarySheet.getCell('A5').value = 'Plan start';
    summarySheet.getCell('B5').value = root?.start
      ? fmtY(root.start)
      : fmtY(s2d(state.projectStart));
    summarySheet.getCell('A6').value = 'Plan finish';
    summarySheet.getCell('B6').value = root?.finish ? fmtY(root.finish) : '';
    summarySheet.getCell('A7').value = 'Tasks done';
    summarySheet.getCell('B7').value = `${done} of ${leaves.length}`;
    summarySheet.getCell('A8').value = 'Overdue tasks';
    summarySheet.getCell('B8').value = over;

    summarySheet.addRow([]);
    const statusHeader = summarySheet.addRow(['Status', 'Tasks', 'Visual']);
    applySectionHeader(statusHeader);
    const statusRows: [string, number, string, string][] = [
      ['Done', done, barChart(leaves.length ? (done / leaves.length) * 100 : 0), 'E2F0D9'],
      [
        'In progress',
        inprog,
        barChart(leaves.length ? (inprog / leaves.length) * 100 : 0),
        'DDEBF7',
      ],
      ['Not started', ns, barChart(leaves.length ? (ns / leaves.length) * 100 : 0), 'F2F2F2'],
      ['Overdue', over, barChart(leaves.length ? (over / leaves.length) * 100 : 0), 'FCE4D6'],
    ];
    for (const [label, count, visual, color] of statusRows) {
      const row = summarySheet.addRow([label, count, visual]);
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
      row.getCell(1).font = { bold: true };
    }

    summarySheet.addRow([]);
    const phaseHeader = summarySheet.addRow([
      'Phase',
      'Plan Start',
      'Plan Finish',
      'Actual Start',
      'Actual End',
      '% Complete',
      'Progress',
    ]);
    applySectionHeader(phaseHeader);

    for (const p of phases) {
      const row = summarySheet.addRow([
        p.name,
        fmtY(p.start),
        fmtY(p.finish),
        p.actualStart ? fmtY(s2d(p.actualStart)) : '',
        p.actualEnd ? fmtY(s2d(p.actualEnd)) : '',
        p.prog / 100,
        barChart(p.prog),
      ]);
      row.getCell(6).numFmt = '0%';
      row.getCell(6).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: paleBlue },
      };
    }

    summarySheet.addRow([]);
    const milestoneHeader = summarySheet.addRow([
      'Milestone',
      'Plan Date',
      'Actual Date',
      'Status',
    ]);
    applySectionHeader(milestoneHeader);
    for (const m of milestones) {
      summarySheet.addRow([
        m.name.replace(/^◆\s*/, ''),
        fmtY(m.start),
        m.actualEnd ? fmtY(s2d(m.actualEnd)) : '',
        taskStatus(m, today),
      ]);
    }

    summarySheet.addRow([]);
    const attentionHeader = summarySheet.addRow(['Needs attention']);
    applySectionHeader(attentionHeader);
    const risks = leaves.filter((t) => taskStatus(t, today) === 'Overdue');
    if (risks.length > 0) {
      risks.forEach((task) =>
        summarySheet.addRow([task.name, `Was due ${fmtY(task.finish)}`, `${task.prog}% done`]),
      );
    } else {
      summarySheet.addRow(['Nothing overdue']);
    }

    leaves
      .filter((t) => t.actualStart && t.start && s2d(t.actualStart) > t.start)
      .forEach((t) => {
        if (t.start && t.actualStart) {
          summarySheet.addRow([
            t.name,
            `Started ${calDays(t.start, s2d(t.actualStart))}d late`,
            '',
          ]);
        }
      });

    // Timeline
    const timelineSheet = workbook.addWorksheet('Timeline');
    timelineSheet.columns = [{ width: 24 }];
    timelineSheet.mergeCells('A1:H1');
    timelineSheet.getCell('A1').value = `${projName} — Timeline Overview`;
    timelineSheet.getCell('A1').font = { bold: true, size: 16, color: { argb: white } };
    timelineSheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: navy },
    };
    timelineSheet.getRow(1).height = 30;
    timelineSheet.getCell('A2').value = 'Generated';
    timelineSheet.getCell('B2').value = fmtY(today);
    timelineSheet.getCell('A3').value = 'Total working days scheduled';
    timelineSheet.getCell('B3').value = scheduledTasks.reduce((total, task) => total + task.dur, 0);
    if (ganttElement) {
      const dataUrl = await this.captureService.captureElement(ganttElement);
      const imageId = workbook.addImage({
        base64: dataUrl.replace(/^data:image\/png;base64,/, ''),
        extension: 'png',
      });
      const imageWidth = Math.min(Math.max(ganttElement.scrollWidth, 800), 1600);
      const imageHeight = Math.round(
        imageWidth * (ganttElement.scrollHeight / Math.max(ganttElement.scrollWidth, 1)),
      );
      timelineSheet.addImage(imageId, {
        tl: { col: 0, row: 3 },
        ext: { width: imageWidth, height: imageHeight },
      });
    } else {
      timelineSheet.getCell('A4').value =
        'Timeline capture unavailable: no Gantt element was provided.';
      timelineSheet.getCell('A4').font = { italic: true, color: { argb: '7F6000' } };
    }

    return workbook;
  }

  parseExcelFile(data: ArrayBuffer, currentState: ProjectState): ProjectState {
    const wb = XLSX.read(data, { type: 'array', cellDates: true });
    const sheetName = wb.SheetNames.includes('Tasks') ? 'Tasks' : wb.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
      header: 1,
      raw: true,
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
        finish: null,
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

    const starts = tasks
      .map((t) => t.startInput)
      .filter(Boolean)
      .sort() as string[];
    const projectStart = starts[0] || d2s(new Date());

    return {
      projectStart,
      tasks,
      holidays: currentState.holidays,
      weekendDays: currentState.weekendDays,
      workingDays: currentState.workingDays,
      customNonWork: currentState.customNonWork,
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
