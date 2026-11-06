import { Component, computed, inject, signal } from '@angular/core';
import { ProjectStoreService } from '../../services/project-store.service';
import { fmtY, s2d } from '../../utils/date-utils';

@Component({
  selector: 'app-holidays-modal',
  template: `
    <div
      class="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4"
      (click)="close()"
    >
      <div
        class="bg-white rounded-xl shadow-2xl p-6 w-[520px] max-h-[85vh] overflow-y-auto"
        (click)="$event.stopPropagation()"
      >
        <!-- Modal Header -->
        <div class="flex justify-between items-start mb-4">
          <div>
            <h2 class="text-lg font-bold text-slate-800">📅 Holidays & Weekends Manager</h2>
            <p class="text-xs text-slate-500">
              Configure weekly non-working days and public holidays. Tasks auto-schedule around them.
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

        <!-- 1. Weekly Weekend Days Section -->
        <div class="border border-slate-200 rounded-lg p-3.5 mb-4 bg-slate-50/50">
          <h4 class="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">
            Weekly Weekend Days (Non-working)
          </h4>
          <div class="flex flex-wrap gap-2 mb-2">
            @for (day of daysOfWeek; track day.index) {
              @let isChecked = isWeekend(day.index);
              <label
                class="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 border rounded cursor-pointer transition-colors"
                [class.border-blue-600]="isChecked"
                [class.bg-blue-50]="isChecked"
                [class.text-blue-800]="isChecked"
                [class.border-slate-300]="!isChecked"
                [class.bg-white]="!isChecked"
                [class.text-slate-700]="!isChecked"
              >
                <input
                  type="checkbox"
                  [checked]="isChecked"
                  (change)="toggleWeekendDay(day.index)"
                  class="cursor-pointer"
                />
                {{ day.name }}
              </label>
            }
          </div>
          <div class="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
            <span>Presets:</span>
            <button
              type="button"
              class="px-2 py-0.5 border border-slate-300 rounded hover:bg-white bg-slate-100 text-slate-700 font-medium"
              (click)="setPreset([0, 6])"
            >
              Sat & Sun
            </button>
            <button
              type="button"
              class="px-2 py-0.5 border border-slate-300 rounded hover:bg-white bg-slate-100 text-slate-700 font-medium"
              (click)="setPreset([5, 6])"
            >
              Fri & Sat
            </button>
            <button
              type="button"
              class="px-2 py-0.5 border border-slate-300 rounded hover:bg-white bg-slate-100 text-slate-700 font-medium"
              (click)="setPreset([0])"
            >
              Sun only
            </button>
          </div>
        </div>

        <!-- 2. Public Holidays Section -->
        <div class="border border-slate-200 rounded-lg p-3.5 mb-4">
          <h4 class="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">
            Public Holidays
          </h4>
          <div class="max-h-[200px] overflow-y-auto mb-3 divide-y divide-slate-100">
            @for (h of sortedHolidays(); track h.date) {
              <div class="flex items-center gap-2 py-1.5 text-xs">
                <span class="w-[110px] font-semibold text-slate-700">{{ formatDate(h.date) }}</span>
                <span class="flex-1 text-slate-800 truncate">{{ h.name }}</span>
                <span class="px-2 py-0.5 bg-red-100 text-red-800 rounded text-[10px] font-semibold">
                  Non-working
                </span>
                <button
                  type="button"
                  class="px-2 py-0.5 border border-red-300 text-red-700 hover:bg-red-50 rounded text-xs"
                  (click)="deleteHoliday(h.date)"
                >
                  ✕
                </button>
              </div>
            } @empty {
              <div class="py-3 text-center text-xs text-slate-400">
                No public holidays added yet. Click any day on the timeline or add below.
              </div>
            }
          </div>

          <!-- Add Holiday Form -->
          <div class="flex gap-2 pt-2 border-t border-slate-100">
            <input
              #addDate
              type="date"
              class="h-[30px] px-2 text-xs border border-slate-300 rounded w-[130px] outline-none"
            />
            <input
              #addName
              type="text"
              placeholder="Holiday name (e.g. Labor Day)"
              class="h-[30px] px-2 text-xs border border-slate-300 rounded flex-1 outline-none"
            />
            <button
              type="button"
              class="h-[30px] px-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold whitespace-nowrap"
              (click)="addHoliday(addDate.value, addName.value); addDate.value = ''; addName.value = ''"
            >
              + Add Holiday
            </button>
          </div>
        </div>

        <!-- 3. Timeline Overrides Section -->
        @if (hasOverrides()) {
          <div class="border border-slate-200 rounded-lg p-3.5 bg-slate-50/50">
            <h4 class="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">
              Timeline Overrides (From Timeline Clicks)
            </h4>
            <div class="space-y-1.5 text-xs">
              @for (w of store.state().workingDays; track w) {
                <div class="flex items-center gap-2 py-1">
                  <span class="w-[110px] font-semibold text-slate-700">{{ formatDate(w) }}</span>
                  <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-semibold">
                    Working Weekend Override
                  </span>
                  <span class="flex-1"></span>
                  <button
                    type="button"
                    class="px-2 py-0.5 border border-red-300 text-red-700 hover:bg-red-50 rounded text-xs"
                    (click)="store.toggleWorkingWeekend(w)"
                  >
                    ✕
                  </button>
                </div>
              }
              @for (nw of store.state().customNonWork; track nw) {
                <div class="flex items-center gap-2 py-1">
                  <span class="w-[110px] font-semibold text-slate-700">{{ formatDate(nw) }}</span>
                  <span class="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-[10px] font-semibold">
                    Non-working Day Override
                  </span>
                  <span class="flex-1"></span>
                  <button
                    type="button"
                    class="px-2 py-0.5 border border-red-300 text-red-700 hover:bg-red-50 rounded text-xs"
                    (click)="store.toggleCustomNonWork(nw)"
                  >
                    ✕
                  </button>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class HolidaysModalComponent {
  readonly store = inject(ProjectStoreService);

  readonly daysOfWeek = [
    { index: 0, name: 'Sun' },
    { index: 1, name: 'Mon' },
    { index: 2, name: 'Tue' },
    { index: 3, name: 'Wed' },
    { index: 4, name: 'Thu' },
    { index: 5, name: 'Fri' },
    { index: 6, name: 'Sat' }
  ];

  readonly sortedHolidays = computed(() => {
    return [...this.store.state().holidays].sort((a, b) => a.date.localeCompare(b.date));
  });

  readonly hasOverrides = computed(() => {
    const s = this.store.state();
    return s.workingDays.length > 0 || s.customNonWork.length > 0;
  });

  close(): void {
    this.store.showHolidaysModal.set(false);
  }

  isWeekend(idx: number): boolean {
    return this.store.state().weekendDays.includes(idx);
  }

  toggleWeekendDay(idx: number): void {
    const current = this.store.state().weekendDays;
    const updated = current.includes(idx)
      ? current.filter((d) => d !== idx)
      : [...current, idx];
    this.store.setWeekendDays(updated);
  }

  setPreset(days: number[]): void {
    this.store.setWeekendDays(days);
  }

  formatDate(ds: string): string {
    return fmtY(s2d(ds));
  }

  addHoliday(date: string, name: string): void {
    if (!date) return;
    this.store.addHoliday(date, name);
  }

  deleteHoliday(date: string): void {
    this.store.deleteHoliday(date);
  }
}
