import { TestBed } from '@angular/core/testing';
import { CaptureService } from './capture.service';
import { ExcelService } from './excel.service';

const onePixelPng =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0uUAAAAASUVORK5CYII=';

describe('ExcelService workbook export', () => {
  let service: ExcelService;

  const state = {
    projectStart: '2026-11-02',
    holidays: [],
    weekendDays: [0, 6],
    workingDays: [],
    customNonWork: [],
    tasks: [],
  };
  const scheduledTasks = [
    {
      uid: 1,
      name: '◆ Project Alpha',
      dur: 5,
      level: 0,
      preds: [],
      prog: 50,
      startInput: null,
      actualStart: null,
      actualEnd: null,
      collapsed: false,
      start: new Date('2026-11-02T00:00:00'),
      finish: new Date('2026-11-06T00:00:00'),
    },
    {
      uid: 2,
      name: 'Design',
      dur: 5,
      level: 1,
      preds: [],
      prog: 50,
      startInput: null,
      actualStart: null,
      actualEnd: null,
      collapsed: false,
      start: new Date('2026-11-02T00:00:00'),
      finish: new Date('2026-11-06T00:00:00'),
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ExcelService,
        {
          provide: CaptureService,
          useValue: { captureElement: vi.fn().mockResolvedValue(onePixelPng) },
        },
      ],
    });
    service = TestBed.inject(ExcelService);
  });

  it('creates the approved sheets and readable task and executive summary content', async () => {
    const workbook = await service.createWorkbook(state, scheduledTasks);

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      'Tasks',
      'Executive Summary',
      'Timeline',
    ]);

    const tasks = workbook.getWorksheet('Tasks');
    expect(tasks?.getRow(1).values).toEqual([
      undefined,
      'ID',
      'Task Name',
      'Duration (days)',
      'Plan Start',
      'Plan Finish',
      'Actual Start',
      'Actual End',
      'Predecessors',
      '% Complete',
      'Status',
    ]);
    expect(tasks?.getCell('B3').value).toBe('  Design');
    expect(tasks?.getCell('C3').value).toBe(5);
    expect(tasks?.autoFilter).toBeDefined();
    expect(tasks?.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });
    expect(tasks?.getCell('I3').numFmt).toContain('%');

    const summary = workbook.getWorksheet('Executive Summary');
    expect(summary?.getCell('A1').value).toBe('Project Alpha — Executive Status Report');
    expect(summary?.getCell('B4').value).toBe(0.5);
    expect(summary?.getColumn(1).values).toContain('Overall completion');
    expect(summary?.getColumn(1).values).toContain('Phase');
    expect(summary?.getCell('A1').font?.bold).toBe(true);
    expect(summary?.getCell('A10').fill?.type).toBe('pattern');
  });

  it('embeds a captured PNG image in the Timeline worksheet', async () => {
    const element = document.createElement('div');
    const workbook = await service.createWorkbook(state, scheduledTasks, element);
    const timeline = workbook.getWorksheet('Timeline');

    expect(timeline?.getCell('A4').value).toBeNull();
    expect(workbook.model.media).toEqual(
      expect.arrayContaining([expect.objectContaining({ extension: 'png' })]),
    );
    expect(timeline?.getImages()).toHaveLength(1);
    expect(TestBed.inject(CaptureService).captureElement).toHaveBeenCalledWith(element);
  });

  it('labels the missing timeline capture while creating all worksheets', async () => {
    const workbook = await service.createWorkbook(state, scheduledTasks);
    const timeline = workbook.getWorksheet('Timeline');

    expect(workbook.worksheets).toHaveLength(3);
    expect(timeline?.getCell('A4').value).toMatch(/capture unavailable/i);
    expect(timeline?.getImages()).toHaveLength(0);
  });
});
