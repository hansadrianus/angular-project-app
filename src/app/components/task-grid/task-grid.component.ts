import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Task } from '../../models/project.model';
import { ProjectStoreService } from '../../services/project-store.service';
import { d2s, fmt, s2d, taskStatus } from '../../utils/date-utils';

interface EditingCell {
  uid: number;
  field: 'name' | 'dur' | 'start' | 'actualStart' | 'actualEnd' | 'preds' | 'prog';
  value: string;
}

interface ColumnResizeState {
  boundaryIndex: number;
  startX: number;
  startWidths: number[];
}

@Component({
  selector: 'app-task-grid',
  template: `
    <div class="overflow-x-auto border-b-2 border-r border-slate-300 select-none">
      <div #taskTable class="w-full min-w-[920px]" role="table" aria-label="Project tasks">
        <!-- Table Header -->
        <div
          role="row"
          class="grid w-full h-[29px] bg-slate-100 font-semibold text-slate-600 text-xs border-b border-slate-300"
          [style.grid-template-columns]="columnTemplate()"
        >
          @for (column of columnLabels; track column; let i = $index) {
            <div role="columnheader" class="relative min-w-0 overflow-visible p-1.5">
              <span class="block min-w-0 truncate pr-2">{{ column }}</span>
              @if (i < columnLabels.length - 1) {
                <div
                  role="separator"
                  aria-orientation="vertical"
                  tabindex="0"
                  [attr.aria-label]="'Resize ' + column + ' and ' + columnLabels[i + 1] + ' columns'"
                  [attr.aria-valuenow]="getBoundaryValue(i)"
                  [attr.aria-valuemin]="getBoundaryMinimum(i)"
                  [attr.aria-valuemax]="getBoundaryMaximum(i)"
                  class="group absolute top-0 right-0 z-10 h-full w-6 translate-x-1/2 cursor-col-resize touch-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                  (pointerdown)="onColumnResizePointerDown($event, i)"
                  (pointermove)="onColumnResizePointerMove($event)"
                  (pointerup)="onColumnResizePointerUp()"
                  (pointercancel)="onColumnResizePointerUp()"
                  (keydown)="onColumnResizeKeydown($event, i)"
                >
                  <span
                    aria-hidden="true"
                    class="pointer-events-none absolute inset-y-0 left-1/2 border-l border-slate-300 group-hover:border-blue-500"
                  ></span>
                </div>
              }
            </div>
          }
        </div>

        <!-- Table Rows -->
        @for (t of visibleTasks(); track t.uid) {
          @let isSum = isSummary(t.uid);
          @let isSel = t.uid === store.selectedUid();
          @let status = getStatus(t, isSum);

          <div
            role="row"
            tabindex="0"
            [attr.aria-label]="'Task: ' + t.name"
            [attr.aria-selected]="isSel"
            aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
            title="Reorder among sibling tasks with Alt+ArrowUp/Down"
            class="grid w-full h-[28px] border-b border-slate-100 text-xs cursor-pointer transition-colors"
            [style.grid-template-columns]="columnTemplate()"
            [class.bg-slate-100]="isSum && !isSel"
            [class.font-semibold]="isSum"
            [class.bg-blue-100]="isSel && !isSum"
            [class.bg-blue-200]="isSel && isSum"
            [class.hover:bg-slate-50]="!isSel"
            (click)="onRowClick(t.uid)"
            (keydown)="onRowKeydown($event, t.uid)"
            draggable="true"
            (dragstart)="onDragStart($event, t.uid)"
            (dragover)="onDragOver($event)"
            (drop)="onDrop($event, t.uid)"
          >
            <!-- ID / Drag handle -->
            <div role="cell" class="min-w-0 truncate text-center p-1.5 text-slate-400 cursor-grab">
              ⠿ {{ getRowNumber(t.uid) }}
            </div>

            <!-- Task Name -->
            <div
              role="cell"
              class="min-w-0 p-1.5 flex items-center overflow-hidden"
              [style.padding-left.px]="6 + t.level * 16"
              (dblclick)="startEdit(t, 'name')"
            >
              @if (isSum) {
                <button
                  type="button"
                  [attr.aria-label]="(t.collapsed ? 'Expand ' : 'Collapse ') + t.name"
                  [attr.aria-expanded]="!t.collapsed"
                  class="w-4 h-4 mr-1 text-slate-500 hover:text-slate-800 flex items-center justify-center shrink-0"
                  (click)="toggleCollapse($event, t.uid)"
                >
                  {{ t.collapsed ? '▸' : '▾' }}
                </button>
              } @else {
                <span class="w-4 mr-1 shrink-0"></span>
              }

              @if (isEditing(t.uid, 'name')) {
                <input
                  #editInput
                  type="text"
                  [value]="editing()?.value"
                  (blur)="commitEdit(t, editInput.value)"
                  (keydown.enter)="commitEdit(t, editInput.value)"
                  (keydown.escape)="cancelEdit()"
                  class="w-full h-[22px] px-1 text-xs border border-blue-500 rounded outline-none bg-white"
                  (click)="$event.stopPropagation()"
                />
              } @else {
                <span class="truncate cursor-text" (click)="startEdit(t, 'name')">{{ t.name }}</span>
              }
            </div>

            <!-- Duration -->
            <div role="cell" class="min-w-0 overflow-hidden whitespace-nowrap p-1.5" (click)="!isSum && startEdit(t, 'dur')">
              @if (isEditing(t.uid, 'dur')) {
                <input
                  #durInput
                  type="number"
                  min="0"
                  [value]="editing()?.value"
                  (blur)="commitEdit(t, durInput.value)"
                  (keydown.enter)="commitEdit(t, durInput.value)"
                  (keydown.escape)="cancelEdit()"
                  class="w-full h-[22px] px-1 text-xs border border-blue-500 rounded outline-none bg-white"
                  (click)="$event.stopPropagation()"
                />
              } @else {
                <span>{{ t.dur }}d</span>
              }
            </div>

            <!-- Plan Start -->
            <div role="cell" class="min-w-0 overflow-hidden whitespace-nowrap p-1.5" (click)="!isSum && startEdit(t, 'start')">
              @if (isEditing(t.uid, 'start')) {
                <input
                  #startInputEl
                  type="date"
                  [value]="editing()?.value"
                  (blur)="commitEdit(t, startInputEl.value)"
                  (keydown.enter)="commitEdit(t, startInputEl.value)"
                  (keydown.escape)="cancelEdit()"
                  class="w-full h-[22px] px-0.5 text-xs border border-blue-500 rounded outline-none bg-white"
                  (click)="$event.stopPropagation()"
                />
              } @else {
                <span>{{ formatShortDate(t.start) }}</span>
              }
            </div>

            <!-- Plan Finish -->
            <div role="cell" class="min-w-0 overflow-hidden whitespace-nowrap p-1.5 text-slate-700">
              {{ formatShortDate(t.finish) }}
            </div>

            <!-- Actual Start -->
            <div role="cell" class="min-w-0 overflow-hidden whitespace-nowrap p-1.5" (click)="!isSum && startEdit(t, 'actualStart')">
              @if (isEditing(t.uid, 'actualStart')) {
                <input
                  #actStartInput
                  type="date"
                  [value]="editing()?.value"
                  (blur)="commitEdit(t, actStartInput.value)"
                  (keydown.enter)="commitEdit(t, actStartInput.value)"
                  (keydown.escape)="cancelEdit()"
                  class="w-full h-[22px] px-0.5 text-xs border border-blue-500 rounded outline-none bg-white"
                  (click)="$event.stopPropagation()"
                />
              } @else {
                <span [class.text-slate-400]="!t.actualStart">{{ t.actualStart ? formatStringDate(t.actualStart) : '—' }}</span>
              }
            </div>

            <!-- Actual End -->
            <div role="cell" class="min-w-0 overflow-hidden whitespace-nowrap p-1.5" (click)="!isSum && startEdit(t, 'actualEnd')">
              @if (isEditing(t.uid, 'actualEnd')) {
                <input
                  #actEndInput
                  type="date"
                  [value]="editing()?.value"
                  (blur)="commitEdit(t, actEndInput.value)"
                  (keydown.enter)="commitEdit(t, actEndInput.value)"
                  (keydown.escape)="cancelEdit()"
                  class="w-full h-[22px] px-0.5 text-xs border border-blue-500 rounded outline-none bg-white"
                  (click)="$event.stopPropagation()"
                />
              } @else {
                <span [class.text-slate-400]="!t.actualEnd">{{ t.actualEnd ? formatStringDate(t.actualEnd) : '—' }}</span>
              }
            </div>

            <!-- Predecessors -->
            <div role="cell" class="min-w-0 overflow-hidden whitespace-nowrap p-1.5" (click)="!isSum && startEdit(t, 'preds')">
              @if (isEditing(t.uid, 'preds')) {
                <input
                  #predInput
                  type="text"
                  [value]="editing()?.value"
                  (blur)="commitEdit(t, predInput.value)"
                  (keydown.enter)="commitEdit(t, predInput.value)"
                  (keydown.escape)="cancelEdit()"
                  class="w-full h-[22px] px-1 text-xs border border-blue-500 rounded outline-none bg-white"
                  (click)="$event.stopPropagation()"
                />
              } @else {
                <span>{{ formatPreds(t.preds) }}</span>
              }
            </div>

            <!-- % Complete -->
            <div role="cell" class="min-w-0 p-1.5" (click)="!isSum && startEdit(t, 'prog')">
              @if (isEditing(t.uid, 'prog')) {
                <input
                  #progInput
                  type="number"
                  min="0"
                  max="100"
                  [value]="editing()?.value"
                  (blur)="commitEdit(t, progInput.value)"
                  (keydown.enter)="commitEdit(t, progInput.value)"
                  (keydown.escape)="cancelEdit()"
                  class="w-full h-[22px] px-1 text-xs border border-blue-500 rounded outline-none bg-white"
                  (click)="$event.stopPropagation()"
                />
              } @else {
                <div class="flex items-center gap-1.5">
                  <div class="flex-1 h-1.5 bg-slate-200 rounded overflow-hidden">
                    <div class="h-full bg-blue-600 rounded" [style.width.%]="t.prog"></div>
                  </div>
                  <span class="w-7 text-right text-[11px] text-slate-500">{{ t.prog }}%</span>
                </div>
              }
            </div>

            <!-- Status -->
            <div role="cell" class="min-w-0 overflow-hidden p-1 flex items-center">
              @if (status) {
                <span
                  [attr.aria-label]="'Status: ' + status"
                  class="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  [class.bg-green-100]="status === 'Done'"
                  [class.text-green-800]="status === 'Done'"
                  [class.bg-blue-100]="status === 'In progress'"
                  [class.text-blue-800]="status === 'In progress'"
                  [class.bg-slate-100]="status === 'Not started'"
                  [class.text-slate-600]="status === 'Not started'"
                  [class.bg-red-100]="status === 'Overdue'"
                  [class.text-red-800]="status === 'Overdue'"
                >
                  {{ status }}
                </span>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class TaskGridComponent {
  readonly store = inject(ProjectStoreService);
  readonly taskTable = viewChild<ElementRef<HTMLElement>>('taskTable');

  readonly visibleTasks = this.store.visibleTasks;
  readonly allScheduledTasks = this.store.scheduledTasks;
  readonly columnLabels = [
    'ID',
    'Task Name',
    'Duration',
    'Plan Start',
    'Plan Finish',
    'Actual Start',
    'Actual End',
    'Pred.',
    '% Comp.',
    'Status'
  ];
  readonly columnWidths = signal([38, 220, 60, 84, 84, 84, 84, 70, 80]);
  readonly columnTemplate = computed(() => {
    const widths = this.columnWidths();
    return [...widths.map((width) => `${width}px`), `minmax(${this.minimumStatusWidth}px, 1fr)`].join(
      ' '
    );
  });

  readonly editing = signal<EditingCell | null>(null);
  private dragSourceUid: number | null = null;
  private readonly columnMinimumWidths = [38, 140, 52, 72, 72, 72, 72, 54, 68];
  private readonly minimumStatusWidth = 80;
  private columnResize: ColumnResizeState | null = null;

  private readonly today = computed(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  getBoundaryValue(index: number): number {
    return this.columnWidths()
      .slice(0, index + 1)
      .reduce((total, width) => total + width, 0);
  }

  getBoundaryMinimum(index: number): number {
    const widths = this.columnWidths();
    return (
      widths.slice(0, index).reduce((total, width) => total + width, 0) +
      this.columnMinimumWidths[index]
    );
  }

  getBoundaryMaximum(index: number): number {
    const widths = this.columnWidths();
    if (index === widths.length - 1) {
      return this.getTableWidth() - this.minimumStatusWidth;
    }

    return (
      widths.slice(0, index).reduce((total, width) => total + width, 0) +
      widths[index] +
      widths[index + 1] -
      this.columnMinimumWidths[index + 1]
    );
  }

  onColumnResizePointerDown(event: PointerEvent, boundaryIndex: number): void {
    if (event.button !== 0) return;
    event.preventDefault();
    this.columnResize = {
      boundaryIndex,
      startX: event.clientX,
      startWidths: [...this.columnWidths()]
    };

    const separator = event.currentTarget as HTMLElement;
    if (typeof separator.setPointerCapture === 'function') {
      separator.setPointerCapture(event.pointerId);
    }
  }

  onColumnResizePointerMove(event: PointerEvent): void {
    if (!this.columnResize) return;
    this.resizeBoundary(
      this.columnResize.boundaryIndex,
      this.columnResize.startWidths,
      event.clientX - this.columnResize.startX
    );
  }

  onColumnResizePointerUp(): void {
    this.columnResize = null;
  }

  onColumnResizeKeydown(event: KeyboardEvent, boundaryIndex: number): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 8 : -8;
    this.resizeBoundary(boundaryIndex, this.columnWidths(), delta);
  }

  private resizeBoundary(boundaryIndex: number, startWidths: number[], delta: number): void {
    const isFinalBoundary = boundaryIndex === startWidths.length - 1;
    const leftMinimum = this.columnMinimumWidths[boundaryIndex];
    const minimumDelta = leftMinimum - startWidths[boundaryIndex];
    const maximumDelta = isFinalBoundary
      ? Math.max(
          0,
          this.getTableWidth() -
            startWidths.reduce((total, width) => total + width, 0) -
            this.minimumStatusWidth
        )
      : startWidths[boundaryIndex + 1] - this.columnMinimumWidths[boundaryIndex + 1];
    const appliedDelta = Math.max(minimumDelta, Math.min(delta, maximumDelta));
    const nextWidths = [...startWidths];
    nextWidths[boundaryIndex] += appliedDelta;
    if (!isFinalBoundary) {
      nextWidths[boundaryIndex + 1] -= appliedDelta;
    }
    this.columnWidths.set(nextWidths);
  }

  private getTableWidth(): number {
    return Math.max(this.taskTable()?.nativeElement.clientWidth ?? 0, 920);
  }

  isSummary(uid: number): boolean {
    const tasks = this.allScheduledTasks();
    const idx = tasks.findIndex((t) => t.uid === uid);
    return idx >= 0 && this.store.isSummaryIndex(tasks, idx);
  }

  getRowNumber(uid: number): number {
    return this.allScheduledTasks().findIndex((t) => t.uid === uid) + 1;
  }

  getStatus(t: Task, isSummary: boolean): string {
    if (isSummary) return '';
    return taskStatus(t, this.today());
  }

  formatShortDate(d: Date | null): string {
    return fmt(d);
  }

  formatStringDate(s: string | null): string {
    return s ? fmt(s2d(s)) : '';
  }

  formatPreds(preds: number[]): string {
    const tasks = this.allScheduledTasks();
    return preds
      .map((p) => {
        const idx = tasks.findIndex((x) => x.uid === p);
        return idx >= 0 ? idx + 1 : null;
      })
      .filter((x) => x !== null)
      .join(',');
  }

  onRowClick(uid: number): void {
    if (this.store.linkMode()) {
      this.store.handleLinkTask(uid);
      return;
    }
    this.store.selectTask(uid);
  }

  onRowKeydown(event: KeyboardEvent, uid: number): void {
    if (event.target !== event.currentTarget) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onRowClick(uid);
      return;
    }

    if (
      !event.altKey ||
      event.shiftKey ||
      event.ctrlKey ||
      event.metaKey ||
      (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')
    ) {
      return;
    }

    event.preventDefault();
    const tasks = this.allScheduledTasks();
    const sourceIndex = tasks.findIndex((task) => task.uid === uid);
    if (sourceIndex < 0) return;

    const parentUid = this.getParentUid(tasks, sourceIndex);
    const siblings = tasks.filter(
      (task, index) =>
        task.level === tasks[sourceIndex].level &&
        this.getParentUid(tasks, index) === parentUid
    );
    const siblingIndex = siblings.findIndex((task) => task.uid === uid);
    const target = siblings[siblingIndex + (event.key === 'ArrowUp' ? -1 : 1)];
    if (target) {
      this.store.reorderTasks(uid, target.uid, event.key === 'ArrowUp' ? 'before' : 'after');
    }
  }

  private getParentUid(tasks: Task[], index: number): number | null {
    const level = tasks[index].level;
    for (let cursor = index - 1; cursor >= 0; cursor--) {
      if (tasks[cursor].level < level) return tasks[cursor].uid;
    }
    return null;
  }

  toggleCollapse(event: Event, uid: number): void {
    event.stopPropagation();
    this.store.toggleCollapse(uid);
  }

  isEditing(uid: number, field: EditingCell['field']): boolean {
    const cur = this.editing();
    return cur !== null && cur.uid === uid && cur.field === field;
  }

  startEdit(t: Task, field: EditingCell['field']): void {
    if (this.isSummary(t.uid)) {
      if (field !== 'name') return;
    }

    let initialValue = '';
    if (field === 'name') initialValue = t.name;
    else if (field === 'dur') initialValue = String(t.dur);
    else if (field === 'start') initialValue = t.start ? d2s(t.start) : '';
    else if (field === 'actualStart') initialValue = t.actualStart || '';
    else if (field === 'actualEnd') initialValue = t.actualEnd || '';
    else if (field === 'prog') initialValue = String(t.prog);
    else if (field === 'preds') initialValue = this.formatPreds(t.preds);

    this.editing.set({ uid: t.uid, field, value: initialValue });
  }

  commitEdit(t: Task, rawValue: string): void {
    const cur = this.editing();
    if (!cur) return;

    const field = cur.field;
    this.editing.set(null);

    if (field === 'name') {
      const v = rawValue.trim();
      if (v) this.store.updateTaskField(t.uid, 'name', v);
    } else if (field === 'dur') {
      this.store.updateTaskField(t.uid, 'dur', Math.max(0, parseInt(rawValue, 10) || 0));
    } else if (field === 'prog') {
      this.store.updateTaskField(
        t.uid,
        'prog',
        Math.min(100, Math.max(0, parseInt(rawValue, 10) || 0))
      );
    } else if (field === 'start') {
      this.store.updateTaskField(t.uid, 'startInput', rawValue ? rawValue : null);
    } else if (field === 'actualStart') {
      this.store.updateTaskField(t.uid, 'actualStart', rawValue ? rawValue : null);
    } else if (field === 'actualEnd') {
      this.store.updateTaskField(t.uid, 'actualEnd', rawValue ? rawValue : null);
    } else if (field === 'preds') {
      const nos = rawValue
        .split(/[,\s]+/)
        .filter(Boolean)
        .map(Number);
      const all = this.allScheduledTasks();
      const uids: number[] = [];
      for (const no of nos) {
        const pt = all[no - 1];
        if (!pt) continue;
        if (this.store.wouldCycle(all, t.uid, pt.uid)) {
          alert(`Skipped pred ${no}: would create circular dependency.`);
          continue;
        }
        if (!uids.includes(pt.uid)) uids.push(pt.uid);
      }
      this.store.updateTaskField(t.uid, 'preds', uids);
    }
  }

  cancelEdit(): void {
    this.editing.set(null);
  }

  // --- Drag reordering ---

  onDragStart(e: DragEvent, uid: number): void {
    this.dragSourceUid = uid;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(uid));
    }
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(e: DragEvent, targetUid: number): void {
    e.preventDefault();
    const sourceUid = this.dragSourceUid;
    this.dragSourceUid = null;
    if (sourceUid === null || sourceUid === targetUid) return;

    const row = e.currentTarget;
    if (!(row instanceof HTMLElement)) return;
    const bounds = row.getBoundingClientRect();
    const position = e.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after';
    this.store.reorderTasks(sourceUid, targetUid, position);
  }
}
