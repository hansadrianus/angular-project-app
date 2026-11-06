import { Component, computed, inject, signal } from '@angular/core';
import { Task } from '../../models/project.model';
import { ProjectStoreService } from '../../services/project-store.service';
import { d2s, fmt, s2d, taskStatus } from '../../utils/date-utils';

interface EditingCell {
  uid: number;
  field: 'name' | 'dur' | 'start' | 'actualStart' | 'actualEnd' | 'preds' | 'prog';
  value: string;
}

@Component({
  selector: 'app-task-grid',
  template: `
    <div class="overflow-x-auto border-b-2 border-slate-300 select-none">
      <div class="min-w-[920px]">
        <!-- Table Header -->
        <div class="flex h-[29px] bg-slate-100 font-semibold text-slate-600 text-xs border-b border-slate-300">
          <div class="w-[38px] text-center p-1.5 shrink-0">ID</div>
          <div class="w-[220px] p-1.5 shrink-0">Task Name</div>
          <div class="w-[60px] p-1.5 shrink-0">Duration</div>
          <div class="w-[84px] p-1.5 shrink-0">Plan Start</div>
          <div class="w-[84px] p-1.5 shrink-0">Plan Finish</div>
          <div class="w-[84px] p-1.5 shrink-0">Actual Start</div>
          <div class="w-[84px] p-1.5 shrink-0">Actual End</div>
          <div class="w-[70px] p-1.5 shrink-0">Pred.</div>
          <div class="w-[80px] p-1.5 shrink-0">% Comp.</div>
          <div class="w-[96px] p-1.5 shrink-0">Status</div>
        </div>

        <!-- Table Rows -->
        @for (t of visibleTasks(); track t.uid) {
          @let isSum = isSummary(t.uid);
          @let isSel = t.uid === store.selectedUid();
          @let status = getStatus(t, isSum);

          <div
            class="flex h-[28px] border-b border-slate-100 text-xs cursor-pointer transition-colors"
            [class.bg-slate-100]="isSum && !isSel"
            [class.font-semibold]="isSum"
            [class.bg-blue-100]="isSel && !isSum"
            [class.bg-blue-200]="isSel && isSum"
            [class.hover:bg-slate-50]="!isSel"
            (click)="onRowClick(t.uid)"
            draggable="true"
            (dragstart)="onDragStart($event, t.uid)"
            (dragover)="onDragOver($event)"
            (drop)="onDrop($event, t.uid)"
          >
            <!-- ID / Drag handle -->
            <div class="w-[38px] text-center p-1.5 shrink-0 text-slate-400 cursor-grab">
              ⠿ {{ getRowNumber(t.uid) }}
            </div>

            <!-- Task Name -->
            <div
              class="w-[220px] p-1.5 shrink-0 flex items-center overflow-hidden"
              [style.padding-left.px]="6 + t.level * 16"
              (dblclick)="startEdit(t, 'name')"
            >
              @if (isSum) {
                <button
                  type="button"
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
            <div class="w-[60px] p-1.5 shrink-0" (click)="!isSum && startEdit(t, 'dur')">
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
            <div class="w-[84px] p-1.5 shrink-0" (click)="!isSum && startEdit(t, 'start')">
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
            <div class="w-[84px] p-1.5 shrink-0 text-slate-700">
              {{ formatShortDate(t.finish) }}
            </div>

            <!-- Actual Start -->
            <div class="w-[84px] p-1.5 shrink-0" (click)="!isSum && startEdit(t, 'actualStart')">
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
            <div class="w-[84px] p-1.5 shrink-0" (click)="!isSum && startEdit(t, 'actualEnd')">
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
            <div class="w-[70px] p-1.5 shrink-0" (click)="!isSum && startEdit(t, 'preds')">
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
            <div class="w-[80px] p-1.5 shrink-0" (click)="!isSum && startEdit(t, 'prog')">
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
            <div class="w-[96px] p-1 shrink-0 flex items-center">
              @if (status) {
                <span
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

  readonly visibleTasks = this.store.visibleTasks;
  readonly allScheduledTasks = this.store.scheduledTasks;

  readonly editing = signal<EditingCell | null>(null);
  private dragSourceUid: number | null = null;

  private readonly today = computed(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

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
