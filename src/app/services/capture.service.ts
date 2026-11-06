import { Injectable } from '@angular/core';
import html2canvas from 'html2canvas';

@Injectable({ providedIn: 'root' })
export class CaptureService {
  async captureElement(element: HTMLElement): Promise<string> {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    return canvas.toDataURL('image/png');
  }
}
