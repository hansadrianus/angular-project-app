import { Component, computed, inject } from '@angular/core';
import { Task } from '../../models/project.model';
import { ProjectStoreService } from '../../services/project-store.service';
import { calDays, fmtY, s2d, taskStatus } from '../../utils/date-utils';

interface DonutSlice {
  label: string;
  count: number;
  color: string;
  dashArray: string;
  dashOffset: number;
}

@Component({
  selector: 'app-dashboard-modal',
  template: `
    <div
      class="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4"
      (click)="close()"
    >
      <div
        class="bg-white rounded-xl shadow-2xl p-6 w-[780px] max-h-[85vh] overflow-y-auto"
        (click)="$event.stopPropagation()"
      >
        <!-- Modal Header -->
        <div class="flex justify-between items-start mb-4">
          <div>
            <h2 class="text-xl font-bold text-slate-800">📊 Project Executive Dashboard</h2>
            <p class="text-xs text-slate-500">
              High-level overview of schedule health, task completion, and milestones.
            </p>
          </div>
          <button
            type="button"
            class="px-2.5 py-1 border border-slate-300 rounded-md text-xs font-semibold hover:bg-slate-50 text-slate-600"
            (click)="close()"
          >
            ✕ Close
          </button>
        </div>

        <!-- Metric Cards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <!-- Card 1: Overall Completion -->
          <div class="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <h4 class="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">
              Overall Completion
            </h4>
            <div class="text-3xl font-extrabold text-slate-800">
              {{ stats().overallProgress }}%
            </div>
            <div class="h-2 bg-slate-200 rounded-full overflow-hidden mt-3">
              <div
                class="h-full bg-green-600 rounded-full transition-all"
                [style.width.%]="stats().overallProgress"
              ></div>
            </div>
            <p class="text-[11px] text-slate-500 mt-2">
              {{ stats().doneCount }} of {{ stats().leavesCount }} leaf tasks completed
            </p>
          </div>

          <!-- Card 2: Status Donut Chart -->
          <div class="border border-slate-200 rounded-xl p-4 flex flex-col items-center">
            <h4 class="text-xs uppercase tracking-wider font-semibold text-slate-500 self-start mb-2">
              Task Breakdown
            </h4>
            <div class="relative w-[130px] h-[130px] my-auto">
              <svg viewBox="0 0 140 140" class="w-full h-full -rotate-90">
                @for (slice of donutSlices(); track slice.label) {
                  <circle
                    r="52"
                    cx="70"
                    cy="70"
                    fill="none"
                    [attr.stroke]="slice.color"
                    stroke-width="22"
                    [attr.stroke-dasharray]="slice.dashArray"
                    [attr.stroke-dashoffset]="slice.dashOffset"
                  />
                }
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span class="text-lg font-bold text-slate-800">{{ stats().leavesCount }}</span>
                <span class="text-[10px] text-slate-400 uppercase">Tasks</span>
              </div>
            </div>
            <div class="flex flex-wrap gap-2 text-[11px] mt-2 justify-center">
              @for (seg of store.dashboardSegments(); track seg.label) {
                <div class="flex items-center gap-1">
                  <span class="w-2.5 h-2.5 rounded-sm" [style.background]="seg.color"></span>
                  <span class="text-slate-600">{{ seg.label }}: {{ seg.count }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Card 3: Key Schedule Metrics -->
          <div class="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <h4 class="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">
              Schedule Overview
            </h4>
            <div class="space-y-2 text-xs">
              <div class="flex justify-between py-1 border-b border-slate-200">
                <span class="text-slate-500">Total Tasks:</span>
                <span class="font-bold text-slate-800">{{ stats().totalTasks }}</span>
              </div>
              <div class="flex justify-between py-1 border-b border-slate-200">
                <span class="text-slate-500">Summaries:</span>
                <span class="font-bold text-slate-800">{{ stats().summariesCount }}</span>
              </div>
              <div class="flex justify-between py-1 border-b border-slate-200">
                <span class="text-slate-500">Milestones:</span>
                <span class="font-bold text-slate-800">{{ stats().milestonesCount }}</span>
              </div>
              <div class="flex justify-between py-1">
                <span class="text-slate-500">Overdue:</span>
                <span class="font-bold text-red-600">{{ stats().overdueCount }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Progress by Phase Table -->
        <div class="border border-slate-200 rounded-xl p-4 mb-6">
          <h4 class="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-3">
            Progress by Phase
          </h4>
          <div class="space-y-3">
            @for (p of phases(); track p.uid) {
              <div class="flex items-center gap-3 text-xs">
                <span class="w-[140px] font-semibold text-slate-800 truncate">{{ p.name }}</span>
                <div class="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div class="h-full bg-blue-600 rounded-full" [style.width.%]="p.prog"></div>
                </div>
                <span class="w-[36px] text-right font-medium text-slate-600">{{ p.prog }}%</span>
                <span class="w-[160px] text-right text-[11px] text-slate-400">
                  {{ formatShortDate(p.start) }} – {{ formatShortDate(p.finish) }}
                </span>
              </div>
            } @empty {
              <div class="text-center text-xs text-slate-400 py-2">
                No phase summaries detected in this project.
              </div>
            }
          </div>
        </div>

        <!-- Needs Attention / Risks Section -->
        <div class="border border-red-200 rounded-xl p-4 bg-red-50/30">
          <h4 class="text-xs uppercase tracking-wider font-semibold text-red-700 mb-2">
            ⚠ Needs Attention
          </h4>
          @if (needsAttention().length > 0) {
            <ul class="space-y-1.5 text-xs text-red-900 list-disc list-inside">
              @for (item of needsAttention(); track item.name) {
                <li>
                  <span class="font-semibold">{{ item.name }}</span>: {{ item.reason }}
                </li>
              }
            </ul>
          } @else {
            <p class="text-xs text-green-700 font-medium">
              ✓ All tasks on track. Nothing overdue or delayed.
            </p>
          }
        </div>
      </div>
    </div>
  `
})
export class DashboardModalComponent {
  readonly store = inject(ProjectStoreService);
  readonly stats = this.store.stats;

  private readonly today = computed(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  readonly phases = computed(() => {
    const tasks = this.store.scheduledTasks();
    return tasks.filter((t, i) => this.store.isSummaryIndex(tasks, i) && t.level <= 1);
  });

  readonly donutSlices = computed<DonutSlice[]>(() => {
    const segs = this.store.dashboardSegments();
    const total = Math.max(1, this.stats().leavesCount);
    const R = 52;
    const C = 2 * Math.PI * R;

    let offset = 0;
    return segs.map((s) => {
      const frac = s.count / total;
      const length = frac * C;
      const slice: DonutSlice = {
        label: s.label,
        count: s.count,
        color: s.color,
        dashArray: `${length} ${C}`,
        dashOffset: -offset
      };
      offset += length;
      return slice;
    });
  });

  readonly needsAttention = computed(() => {
    const tasks = this.store.scheduledTasks();
    const tday = this.today();
    const items: { name: string; reason: string }[] = [];

    const leaves = tasks.filter((t, i) => !this.store.isSummaryIndex(tasks, i));

    // Overdue tasks
    leaves
      .filter((t) => !t.actualEnd && t.prog < 100 && t.finish && t.finish < tday)
      .forEach((t) => {
        items.push({
          name: t.name,
          reason: `Was due on ${fmtY(t.finish)} (${t.prog}% complete)`
        });
      });

    // Started late tasks
    leaves
      .filter((t) => t.actualStart && t.start && s2d(t.actualStart) > t.start)
      .forEach((t) => {
        items.push({
          name: t.name,
          reason: `Started ${calDays(t.start!, s2d(t.actualStart!))} working days late`
        });
      });

    return items;
  });

  close(): void {
    this.store.showDashboardModal.set(false);
  }

  formatShortDate(d: Date | null): string {
    return fmtY(d);
  }
}
