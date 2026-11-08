import html2canvas from 'html2canvas';
import { CaptureService } from './capture.service';

vi.mock('html2canvas', () => ({
  default: vi.fn(),
}));

describe('CaptureService', () => {
  beforeEach(() => {
    vi.mocked(html2canvas).mockClear();
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'toDataURL').mockReturnValue('data:image/png;base64,test');
    vi.mocked(html2canvas).mockResolvedValue(canvas);
  });

  it('uses browser CSS rendering for modern CSS colors', async () => {
    const element = document.createElement('div');

    await new CaptureService().captureElement(element);

    expect(html2canvas).toHaveBeenCalledWith(
      element,
      expect.objectContaining({ foreignObjectRendering: true }),
    );
  });

  it('uses a transparent background for the cloned document', async () => {
    const element = document.createElement('div');

    await new CaptureService().captureElement(element);

    const options = vi.mocked(html2canvas).mock.calls[0]?.[1];
    expect(options?.onclone).toBeTypeOf('function');
    const clonedDocument = document.implementation.createHTMLDocument();
    clonedDocument.documentElement.style.backgroundColor = 'red';
    clonedDocument.body.style.backgroundColor = 'red';

    options?.onclone?.(clonedDocument, clonedDocument.body);

    expect(clonedDocument.documentElement.style.backgroundColor).toBe('transparent');
    expect(clonedDocument.body.style.backgroundColor).toBe('transparent');
  });

  it('offsets the capture to the selected element within the page', async () => {
    const element = document.createElement('div');
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(200, 400, 800, 300),
    );

    await new CaptureService().captureElement(element);

    expect(html2canvas).toHaveBeenCalledWith(
      element,
      expect.objectContaining({
        x: -200 - window.scrollX,
        y: -400 - window.scrollY,
      }),
    );
  });
});
