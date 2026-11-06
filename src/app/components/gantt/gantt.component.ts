import {
  afterNextRender,
  Component,
  ElementRef,
  Injector,
  computed,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { Task } from '../../models/project.model';
import { ProjectStoreService } from '../../services/project-store.service';
import {
  addDays,
  calDays,
  d2s,
  fmt,
  getDayType,
  s2d
} from '../../utils/date-utils';

interface DayPopoverState {
  dateStr: string;
  x: number;
  y: number;
  holidayNameInput: string;
}

interface DragState {
  uid: number;
  mode: 'move' | 'l' | 'r';
  x0: number;
  start0: Date;
  dur0: number;
  moved: boolean;
}

interface MonthGroup {
  label: string;
  width: number;
}

interface DayColumnHeader {
  dateStr: string;
  calDate: string;
  dow: string;
  isToday: boolean;
  type: string;
  name: string;
}

interface DepArrow {
  d: string;
}

@Component({
  selector: 'app-gantt',
  template: `
    <div
      #ganttWrap
      class="gantt-wrap overflow-x-auto relative select-none bg-white min-h-[300px]"
      (click)="onWrapClick($event)"
      (mousemove)="onMouseMove($event)"
      (mouseup)="onMouseUp()"
    >
      <div [style.width.px]="totalWidth()">
        <!-- 1. Dual-tier Gantt Header -->
        <div class="sticky top-0 z-20 flex flex-col bg-slate-100 font-semibold text-slate-600 border-b-2 border-slate-300">
          <!-- Month & Year Row -->
          <div class="flex h-[22px] border-b border-slate-300 bg-slate-200">
            @for (m of monthGroups(); track m.label) {
              <div
                class="text-center py-0.5 px-2 border-r border-slate-300 text-[11px] font-bold text-slate-700 truncate"
                [style.width.px]="m.width"
              >
                {{ m.label }}
              </div>
            }
          </div>

          <!-- Day Columns Row with Calendar Date & Day of Week -->
          <div class="flex h-[34px] bg-slate-50">
            @for (d of dayHeaders(); track d.dateStr) {
              <div
                role="button"
                tabindex="0"
                [attr.aria-label]="getDayAccessibleLabel(d)"
                class="flex flex-col items-center justify-center border-r border-slate-200 py-0.5 cursor-pointer transition-colors"
                [style.width.px]="dayW()"
                [class.bg-slate-200]="d.type === 'weekend'"
                [class.text-slate-600]="d.type === 'weekend'"
                [class.bg-red-200]="d.type === 'holiday'"
                [class.text-red-900]="d.type === 'holiday'"
                [class.bg-yellow-100]="d.type === 'customNonWork'"
                [class.text-yellow-900]="d.type === 'customNonWork'"
                [class.bg-green-100]="d.type === 'workingWeekend'"
                [class.text-green-800]="d.type === 'workingWeekend'"
                [class.ring-2]="d.isToday"
                [class.ring-red-500]="d.isToday"
                [class.ring-inset]="d.isToday"
                [attr.title]="d.dateStr + ' (' + d.name + ') — Click to mark/unmark Holiday or Weekend'"
                (click)="openDayPopover($event, d.dateStr)"
                (keydown)="onDayHeaderKeydown($event, d.dateStr)"
              >
                <span class="text-[10px] font-bold tracking-tight whitespace-nowrap leading-tight">
                  {{ d.calDate }}
                </span>
                <span class="text-[9px] font-semibold text-slate-500 leading-tight">
                  {{ d.dow }}
                </span>
              </div>
            }
          </div>
        </div>

        <!-- 2. Gantt Body -->
        <div
          #ganttBody
          class="relative bg-white"
          [style.width.px]="totalWidth()"
          [style.height.px]="bodyHeight()"
        >
          <!-- Vertical Day Columns (Stripes & Subtle Dates) -->
          @for (d of dayHeaders(); track d.dateStr; let idx = $index) {
            <div
              aria-hidden="true"
              class="absolute top-0 bottom-0 cursor-pointer pointer-events-auto border-r transition-colors"
              [style.left.px]="idx * dayW()"
              [style.width.px]="dayW()"
              [class.bg-slate-100]="d.type === 'weekend'"
              [class.border-slate-200]="d.type === 'weekend'"
              [class.bg-red-100]="d.type === 'holiday'"
              [class.border-red-300]="d.type === 'holiday'"
              [class.bg-yellow-50]="d.type === 'customNonWork'"
              [class.border-yellow-200]="d.type === 'customNonWork'"
              [class.bg-emerald-50]="d.type === 'workingWeekend'"
              [class.border-emerald-200]="d.type === 'workingWeekend'"
              [class.border-slate-100]="d.type === 'workday'"
              [class.hover:bg-blue-50]="d.type === 'workday'"
              [attr.title]="d.dateStr + ' (' + d.name + ') — Click to mark/unmark Holiday or Weekend'"
              (click)="openDayPopover($event, d.dateStr)"
            >
              @if (d.type === 'holiday') {
                <div class="text-[9px] text-center pt-0.5 font-bold text-red-700 whitespace-nowrap pointer-events-none">
                  🏖️ {{ d.calDate }}
                </div>
              } @else {
                <div class="text-[8px] text-center pt-0.5 text-slate-400 opacity-60 pointer-events-none whitespace-nowrap hover:opacity-100">
                  {{ d.calDate }}
                </div>
              }
            </div>
          }

          <!-- Horizontal Row Lines -->
          @for (t of visibleTasks(); track t.uid; let r = $index) {
            <div
              class="absolute left-0 right-0 h-[28px] border-b border-slate-100 pointer-events-none"
              [style.top.px]="r * rowH"
              [class.bg-blue-50]="t.uid === store.selectedUid()"
            ></div>
          }

          <!-- Today Vertical Line -->
          @if (todayX() !== null) {
            <div
              class="absolute top-0 bottom-0 w-[2px] bg-red-500 z-10 pointer-events-none opacity-80"
              [style.left.px]="todayX()"
            ></div>
            <div
              class="absolute text-[10px] text-red-600 font-bold z-10 pointer-events-none -translate-x-1/2 top-0"
              [style.left.px]="todayX()"
            >
              today
            </div>
          }

          <!-- Task Bars & Milestones -->
          @for (t of visibleTasks(); track t.uid; let r = $index) {
            @if (t.start) {
              @let y = r * rowH + 7;
              @let isSum = isSummary(t.uid);
              @let isOverdue = t.finish && t.finish < today() && t.prog < 100;
              @let isSel = t.uid === store.selectedUid();

              <!-- Actual bar (below plan bar) -->
              @if (t.actualStart) {
                @let asX = getX(s2d(t.actualStart));
                @let aeDate = t.actualEnd ? s2d(t.actualEnd) : (today() > s2d(t.actualStart) ? today() : s2d(t.actualStart));
                @let aw = Math.max(getX(aeDate) + dayW() - asX, 6);
                @let aLate = !t.actualEnd && t.finish && t.finish < today();

                <div
                  class="absolute h-[5px] rounded z-10"
                  [style.left.px]="asX"
                  [style.top.px]="r * rowH + rowH - 7"
                  [style.width.px]="aw"
                  [class.bg-green-600]="!aLate"
                  [class.bg-red-600]="aLate"
                ></div>
              }

              <!-- Summary bar -->
              @if (isSum) {
                @let sX = getX(t.start);
                @let sW = Math.max(getX(t.finish!) + dayW() - sX, 12);

                <div
                  role="button"
                  tabindex="0"
                  [attr.aria-label]="getTaskBarAccessibleLabel(t)"
                  class="absolute h-[12px] bg-slate-700 z-10 cursor-pointer"
                  [style.left.px]="sX"
                  [style.top.px]="y + 1"
                  [style.width.px]="sW"
                  style="clip-path: polygon(0 0, 100% 0, 100% 60%, calc(100% - 6px) 100%, calc(100% - 6px) 60%, 6px 60%, 6px 100%, 0 60%);"
                  (click)="onTaskBarClick($event, t.uid)"
                  (keydown)="onTaskBarKeydown($event, t.uid)"
                ></div>
              }
              <!-- Milestone diamond -->
              @else if (t.dur === 0) {
                @let mX = getX(t.start) + 2;

                <div
                  role="button"
                  tabindex="0"
                  [attr.aria-label]="getTaskBarAccessibleLabel(t)"
                  class="absolute w-[12px] h-[12px] bg-slate-900 rotate-45 z-10 cursor-pointer"
                  [style.left.px]="mX"
                  [style.top.px]="y"
                  (click)="onTaskBarClick($event, t.uid)"
                  (keydown)="onTaskBarKeydown($event, t.uid)"
                ></div>
              }
              <!-- Standard plan bar -->
              @else {
                @let bX = getX(t.start);
                @let bW = getX(t.finish!) + dayW() - bX;

                <div
                  role="button"
                  tabindex="0"
                  [attr.aria-label]="getTaskBarAccessibleLabel(t)"
                  aria-keyshortcuts="ArrowLeft ArrowRight Shift+ArrowLeft Shift+ArrowRight"
                  title="Move planned start one calendar day with ArrowLeft/Right; change duration one day with Shift+ArrowLeft/Right"
                  class="absolute h-[14px] rounded z-10 cursor-grab flex overflow-hidden shadow-sm"
                  [style.left.px]="bX"
                  [style.top.px]="y"
                  [style.width.px]="bW"
                  [class.bg-blue-600]="!isOverdue"
                  [class.bg-red-600]="isOverdue"
                  [class.ring-2]="isSel"
                  [class.ring-blue-400]="isSel"
                  (mousedown)="onBarMouseDown($event, t)"
                  (keydown)="onTaskBarKeydown($event, t.uid)"
                >
                  <!-- Progress Fill -->
                  <div
                    class="h-full rounded"
                    [style.width.%]="t.prog"
                    [class.bg-blue-900]="!isOverdue"
                    [class.bg-red-900]="isOverdue"
                  ></div>

                  <!-- Resize Handle Left -->
                  <div
                    class="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/20"
                    (mousedown)="onResizeMouseDown($event, t, 'l')"
                  ></div>
                  <!-- Resize Handle Right -->
                  <div
                    class="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/20"
                    (mousedown)="onResizeMouseDown($event, t, 'r')"
                  ></div>
                </div>
              }
            }
          }

          <!-- SVG Dependency Arrows -->
          <svg
            aria-hidden="true"
            class="absolute inset-0 pointer-events-none z-10"
            [style.width.px]="totalWidth()"
            [style.height.px]="bodyHeight()"
          >
            <defs>
              <marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                <path d="M0,0 L7,3.5 L0,7" fill="none" stroke="#64748b" stroke-width="1.3" />
              </marker>
            </defs>
            @for (arrow of depArrows(); track $index) {
              <path [attr.d]="arrow.d" stroke="#64748b" stroke-width="1.3" fill="none" marker-end="url(#arrow)" />
            }
          </svg>
        </div>
      </div>

      <!-- 3. Day Click Popover (Mark as Holiday & Weekend) -->
      @if (popover(); as p) {
        @let d = s2d(p.dateStr);
        @let dt = getDayInfo(d);
        @let fullDate = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

        <div
          class="fixed z-50 bg-white border border-slate-300 rounded-lg shadow-xl p-3 w-[270px] text-xs"
          [style.left.px]="p.x"
          [style.top.px]="p.y"
          (click)="$event.stopPropagation()"
        >
          <div class="flex justify-between items-center mb-2 border-b border-slate-100 pb-1.5">
            <div>
              <strong class="text-slate-800">{{ fullDate }}</strong>
            </div>
            <button
              type="button"
              aria-label="Close calendar editor"
              class="text-slate-400 hover:text-slate-600 font-bold px-1"
              (click)="closeDayPopover()"
            >
              ✕
            </button>
          </div>

          <!-- Current status badge -->
          <div class="mb-2">
            <span
              class="px-2 py-0.5 rounded text-[10px] font-semibold"
              [class.bg-red-100]="dt.type === 'holiday'"
              [class.text-red-800]="dt.type === 'holiday'"
              [class.bg-slate-100]="dt.type === 'weekend'"
              [class.text-slate-700]="dt.type === 'weekend'"
              [class.bg-green-100]="dt.type === 'workday'"
              [class.text-green-800]="dt.type === 'workday'"
              [class.bg-emerald-100]="dt.type === 'workingWeekend'"
              [class.text-emerald-800]="dt.type === 'workingWeekend'"
              [class.bg-yellow-100]="dt.type === 'customNonWork'"
              [class.text-yellow-800]="dt.type === 'customNonWork'"
            >
              {{ dt.name }}
            </span>
          </div>

          <!-- Holiday section -->
          @if (dt.type === 'holiday') {
            <div class="p-2 mb-2 bg-red-50 rounded border border-red-100">
              <div class="font-semibold text-red-900 mb-1">🏖️ {{ dt.name }}</div>
              <button
                type="button"
                #dayEditorInitialFocus
                class="w-full text-left px-2 py-1.5 rounded bg-red-100 hover:bg-red-200 text-red-800 font-medium"
                (click)="removeHoliday(p.dateStr)"
              >
                ✕ Remove Holiday
              </button>
            </div>
          } @else {
            <div class="mb-2">
              <label class="block font-semibold text-slate-600 mb-1">Mark as Public Holiday:</label>
              <div class="flex gap-1">
                <input
                  #holNameInput
                  #dayEditorInitialFocus
                  aria-label="Holiday name (optional)"
                  type="text"
                  placeholder="Holiday name (optional)"
                  [value]="p.holidayNameInput"
                  (input)="updateHolidayNameInput(holNameInput.value)"
                  class="flex-1 h-[28px] px-2 text-xs border border-slate-300 rounded outline-none"
                />
                <button
                  type="button"
                  aria-label="Add Holiday"
                  class="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium shrink-0"
                  (click)="addHoliday(p.dateStr)"
                >
                  🏖️ Add
                </button>
              </div>
            </div>
          }

          <div class="border-t border-slate-100 my-2"></div>

          <!-- Weekend & Non-working toggle section -->
          @if (dt.type === 'weekend') {
            <button
              type="button"
              class="w-full text-left px-2.5 py-1.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700"
              (click)="toggleWorkingWeekend(p.dateStr)"
            >
              💼 Mark as Working Weekend
            </button>
          } @else if (dt.type === 'workingWeekend') {
            <button
              type="button"
              class="w-full text-left px-2.5 py-1.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700"
              (click)="toggleWorkingWeekend(p.dateStr)"
            >
              🛑 Revert to Weekend (Non-working)
            </button>
          } @else if (dt.type === 'customNonWork') {
            <button
              type="button"
              class="w-full text-left px-2.5 py-1.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700"
              (click)="toggleCustomNonWork(p.dateStr)"
            >
              💼 Revert to Working Day
            </button>
          } @else if (dt.type !== 'holiday') {
            <button
              type="button"
              class="w-full text-left px-2.5 py-1.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700"
              (click)="toggleCustomNonWork(p.dateStr)"
            >
              🛑 Mark as Non-working Day Off
            </button>
          }
        </div>
      }
    </div>
  `
})
export class GanttComponent {
  readonly store = inject(ProjectStoreService);

  readonly ganttCaptureElement = viewChild<ElementRef<HTMLElement>>('ganttWrap');
  readonly ganttBody = viewChild<ElementRef<HTMLElement>>('ganttBody');
  private readonly dayEditorInitialFocus =
    viewChild<ElementRef<HTMLElement>>('dayEditorInitialFocus');
  private readonly injector = inject(Injector);

  readonly rowH = 28;
  readonly dayW = this.store.zoomLevel;
  readonly visibleTasks = this.store.visibleTasks;
  readonly allScheduledTasks = this.store.scheduledTasks;
  readonly ganttRange = this.store.ganttRange;

  readonly popover = signal<DayPopoverState | null>(null);
  private drag = signal<DragState | null>(null);
  private keyboardDateHeader: HTMLElement | null = null;

  protected readonly Math = Math;
  protected readonly s2d = s2d;

  readonly today = computed(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  readonly totalDays = computed(() => {
    const [r0, r1] = this.ganttRange();
    return calDays(r0, r1) + 1;
  });

  readonly totalWidth = computed(() => {
    return this.totalDays() * this.dayW();
  });

  readonly bodyHeight = computed(() => {
    return this.visibleTasks().length * this.rowH;
  });

  // 1. Month Groups for Header Top Row
  readonly monthGroups = computed<MonthGroup[]>(() => {
    const [r0, r1] = this.ganttRange();
    const dayWidth = this.dayW();
    const groups: MonthGroup[] = [];

    let curMoStart = new Date(r0);
    let curMoDays = 0;

    for (let d = new Date(r0); d <= r1; d = addDays(d, 1)) {
      curMoDays++;
      const nextDay = addDays(d, 1);
      const isMonthEnd =
        nextDay.getMonth() !== d.getMonth() ||
        nextDay.getFullYear() !== d.getFullYear() ||
        d.getTime() === r1.getTime();

      if (isMonthEnd) {
        const width = curMoDays * dayWidth;
        const label = curMoStart.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric'
        });
        groups.push({ label, width });
        curMoStart = nextDay;
        curMoDays = 0;
      }
    }

    if (curMoDays > 0) {
      groups.push({
        label: curMoStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        width: curMoDays * dayWidth
      });
    }

    return groups;
  });

  // 2. Day Column Headers for Header Bottom Row (shows calendar date + day of week)
  readonly dayHeaders = computed<DayColumnHeader[]>(() => {
    const [r0, r1] = this.ganttRange();
    const s = this.store.state();
    const headers: DayColumnHeader[] = [];
    const tday = this.today();
    const curDayW = this.dayW();

    for (let d = new Date(r0); d <= r1; d = addDays(d, 1)) {
      const dt = getDayType(d, s.holidays, s.weekendDays, s.workingDays, s.customNonWork);
      const dateStr = d2s(d);
      const calDate = curDayW >= 32 ? fmt(d) : String(d.getDate());
      const dow = d.toLocaleDateString('en-US', { weekday: curDayW >= 32 ? 'short' : 'narrow' });

      headers.push({
        dateStr,
        calDate,
        dow,
        isToday: d.getTime() === tday.getTime(),
        type: dt.type,
        name: dt.name
      });
    }
    return headers;
  });

  readonly todayX = computed<number | null>(() => {
    const [r0, r1] = this.ganttRange();
    const t = this.today();
    if (t >= r0 && t <= r1) {
      return this.getX(t);
    }
    return null;
  });

  readonly depArrows = computed<DepArrow[]>(() => {
    const tasks = this.visibleTasks();
    const all = this.allScheduledTasks();
    const arrows: DepArrow[] = [];
    const dayWidth = this.dayW();

    const rowOf = new Map<number, number>();
    tasks.forEach((t, r) => rowOf.set(t.uid, r));

    const byUid = new Map<number, Task>();
    all.forEach((t) => byUid.set(t.uid, t));

    for (const t of tasks) {
      for (const pid of t.preds) {
        const p = byUid.get(pid);
        if (!p?.start || !p.finish || !t.start) continue;

        const r1 = rowOf.get(pid);
        const r2 = rowOf.get(t.uid);
        if (r1 === undefined || r2 === undefined) continue;

        const y1 = r1 * this.rowH + this.rowH / 2;
        const y2 = r2 * this.rowH + this.rowH / 2;
        const x1 = this.getX(p.finish) + dayWidth;
        const x2 = this.getX(t.start);

        let path = '';
        if (x2 >= x1 + 10) {
          path = `M${x1},${y1} L${x1 + 6},${y1} L${x1 + 6},${y2} L${x2},${y2}`;
        } else {
          path = `M${x1},${y1} L${x1 + 6},${y1} L${x1 + 6},${y1 + 12} L${x2 - 8},${y1 + 12} L${x2 - 8},${y2} L${x2},${y2}`;
        }
        arrows.push({ d: path });
      }
    }
    return arrows;
  });

  isSummary(uid: number): boolean {
    const tasks = this.allScheduledTasks();
    const idx = tasks.findIndex((t) => t.uid === uid);
    return idx >= 0 && this.store.isSummaryIndex(tasks, idx);
  }

  getDayAccessibleLabel(day: DayColumnHeader): string {
    const date = s2d(day.dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    return `${day.dateStr}, ${date}: ${day.name}. Activate to edit day availability.`;
  }

  onDayHeaderKeydown(event: KeyboardEvent, dateStr: string): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();

    const header = event.currentTarget as HTMLElement;
    const bounds = header.getBoundingClientRect();
    this.keyboardDateHeader = header;
    this.popover.set({
      dateStr,
      x: Math.min(bounds.left, window.innerWidth - 290),
      y: Math.min(bounds.bottom + 10, window.innerHeight - 240),
      holidayNameInput: ''
    });
    afterNextRender(
      () => {
        if (this.keyboardDateHeader === header && this.popover()?.dateStr === dateStr) {
          this.dayEditorInitialFocus()?.nativeElement.focus();
        }
      },
      { injector: this.injector }
    );
  }

  getTaskBarAccessibleLabel(task: Task): string {
    const start = task.start ? d2s(task.start) : 'unscheduled';
    const finish = task.finish ? d2s(task.finish) : start;
    return `Task bar: ${task.name}, starts ${start}, finishes ${finish}`;
  }

  onTaskBarKeydown(event: KeyboardEvent, uid: number): void {
    if (event.target !== event.currentTarget) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (this.store.linkMode()) {
        this.store.handleLinkTask(uid);
        return;
      }
      this.store.selectTask(uid);
      return;
    }

    if (
      (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      this.store.linkMode()
    ) {
      return;
    }

    const task = this.allScheduledTasks().find((item) => item.uid === uid);
    if (!task?.start || task.dur <= 0 || this.isSummary(uid)) return;

    event.preventDefault();
    this.store.selectTask(uid);
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    if (event.shiftKey) {
      this.store.updateTaskField(uid, 'dur', Math.max(1, task.dur + direction));
    } else {
      this.store.updateTaskField(uid, 'startInput', d2s(addDays(task.start, direction)));
    }
  }

  getX(d: Date): number {
    const [r0] = this.ganttRange();
    return calDays(r0, d) * this.dayW();
  }

  getDayInfo(d: Date) {
    const s = this.store.state();
    return getDayType(d, s.holidays, s.weekendDays, s.workingDays, s.customNonWork);
  }

  onTaskBarClick(event: MouseEvent, uid: number): void {
    event.stopPropagation();
    if (this.store.linkMode()) {
      this.store.handleLinkTask(uid);
      return;
    }
    this.store.selectTask(uid);
  }

  openDayPopover(event: MouseEvent, dateStr: string): void {
    event.stopPropagation();
    const curDrag = this.drag();
    if (curDrag && curDrag.moved) return;

    this.keyboardDateHeader = null;
    const x = Math.min(event.clientX, window.innerWidth - 290);
    const y = Math.min(event.clientY + 10, window.innerHeight - 240);

    this.popover.set({
      dateStr,
      x,
      y,
      holidayNameInput: ''
    });
  }

  closeDayPopover(): void {
    const keyboardDateHeader = this.keyboardDateHeader;
    this.keyboardDateHeader = null;
    this.popover.set(null);
    keyboardDateHeader?.focus();
  }

  updateHolidayNameInput(val: string): void {
    this.popover.update((p) => (p ? { ...p, holidayNameInput: val } : null));
  }

  addHoliday(dateStr: string): void {
    const p = this.popover();
    const name = p?.holidayNameInput || 'Public Holiday';
    this.store.addHoliday(dateStr, name);
    this.closeDayPopover();
  }

  removeHoliday(dateStr: string): void {
    this.store.deleteHoliday(dateStr);
    this.closeDayPopover();
  }

  toggleWorkingWeekend(dateStr: string): void {
    this.store.toggleWorkingWeekend(dateStr);
    this.closeDayPopover();
  }

  toggleCustomNonWork(dateStr: string): void {
    this.store.toggleCustomNonWork(dateStr);
    this.closeDayPopover();
  }

  onWrapClick(e: MouseEvent): void {
    if (!(e.target as HTMLElement).closest('.day-popover')) {
      this.closeDayPopover();
    }
  }

  // --- Bar drag & resize ---

  onBarMouseDown(e: MouseEvent, t: Task): void {
    if (this.store.linkMode()) {
      this.store.handleLinkTask(t.uid);
      return;
    }
    this.store.selectTask(t.uid);
    if (!t.start) return;

    this.drag.set({
      uid: t.uid,
      mode: 'move',
      x0: e.clientX,
      start0: new Date(t.start),
      dur0: t.dur,
      moved: false
    });
    e.preventDefault();
  }

  onResizeMouseDown(e: MouseEvent, t: Task, mode: 'l' | 'r'): void {
    e.stopPropagation();
    if (!t.start) return;

    this.drag.set({
      uid: t.uid,
      mode,
      x0: e.clientX,
      start0: new Date(t.start),
      dur0: t.dur,
      moved: false
    });
    e.preventDefault();
  }

  onMouseMove(e: MouseEvent): void {
    const d = this.drag();
    if (!d) return;

    const dx = e.clientX - d.x0;
    const dd = Math.round(dx / this.dayW());
    if (!d.moved && Math.abs(dx) < 3) return;

    d.moved = true;

    if (d.mode === 'move') {
      const newStart = addDays(d.start0, dd);
      this.store.updateTaskField(d.uid, 'startInput', d2s(newStart));
    } else if (d.mode === 'r') {
      const newDur = Math.max(1, d.dur0 + dd);
      this.store.updateTaskField(d.uid, 'dur', newDur);
    } else if (d.mode === 'l') {
      const newStart = addDays(d.start0, dd);
      const newDur = Math.max(1, d.dur0 - dd);
      this.store.updateTaskField(d.uid, 'startInput', d2s(newStart));
      this.store.updateTaskField(d.uid, 'dur', newDur);
    }
  }

  onMouseUp(): void {
    this.drag.set(null);
  }
}
