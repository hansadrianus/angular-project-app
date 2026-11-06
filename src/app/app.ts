import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { DashboardModalComponent } from './components/dashboard-modal/dashboard-modal.component';
import { GanttComponent } from './components/gantt/gantt.component';
import { HolidaysModalComponent } from './components/holidays-modal/holidays-modal.component';
import { TaskGridComponent } from './components/task-grid/task-grid.component';
import { ExcelService } from './services/excel.service';
import { ProjectStoreService } from './services/project-store.service';

@Component({
  selector: 'app-root',
  host: { '(window:keydown)': 'onWindowKeydown($event)' },
  imports: [
    TaskGridComponent,
    GanttComponent,
    HolidaysModalComponent,
    DashboardModalComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  readonly store = inject(ProjectStoreService);
  private excelService = inject(ExcelService);

  readonly ganttRef = viewChild<GanttComponent>('ganttComp');
  readonly importFileInput = viewChild<ElementRef<HTMLInputElement>>('importFileInput');

  isExporting = false;

  onAddTask(): void {
    this.store.addTask();
  }

  onDeleteTask(): void {
    this.store.deleteTask();
  }

  onToggleLink(): void {
    this.store.toggleLinkMode();
  }

  onIndent(): void {
    this.store.indent();
  }

  onOutdent(): void {
    this.store.outdent();
  }

  onUndo(): void {
    this.store.undo();
  }

  onRedo(): void {
    this.store.redo();
  }

  onWindowKeydown(event: KeyboardEvent): void {
    if (!event.ctrlKey || event.altKey) return;

    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable || target.matches('input, textarea, select'))
    ) {
      return;
    }

    const key = event.key.toLowerCase();
    if (key === 'z' && event.shiftKey) {
      event.preventDefault();
      this.onRedo();
    } else if (key === 'y') {
      event.preventDefault();
      this.onRedo();
    } else if (key === 'z') {
      event.preventDefault();
      this.onUndo();
    }
  }

  onOpenHolidays(): void {
    this.store.showHolidaysModal.set(true);
  }

  onOpenDashboard(): void {
    this.store.showDashboardModal.set(true);
  }

  onResetDemo(): void {
    if (confirm('Reset to demo data? Your current changes will be overwritten.')) {
      this.store.resetDemoData();
    }
  }

  onClearProject(): void {
    if (confirm('Clear the whole project? All tasks and settings will be removed.')) {
      this.store.clearProject();
    }
  }

  onZoomIn(): void {
    this.store.zoomIn();
  }

  onZoomOut(): void {
    this.store.zoomOut();
  }

  triggerImport(): void {
    const input = this.importFileInput()?.nativeElement;
    if (input) {
      input.click();
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    if (!confirm('Import will replace your current project. Continue?')) {
      target.value = '';
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const newState = this.excelService.parseExcelFile(buffer, this.store.state());
      this.store.loadImportedState(newState);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`Import error: ${message}`);
    } finally {
      target.value = '';
    }
  }

  async onExport(): Promise<void> {
    if (this.isExporting) return;
    this.isExporting = true;
    try {
      const ganttElem = this.ganttRef()?.ganttCaptureElement()?.nativeElement;
      await this.excelService.exportProject(
        this.store.state(),
        this.store.scheduledTasks(),
        ganttElem
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`Export error: ${message}`);
    } finally {
      this.isExporting = false;
    }
  }
}
