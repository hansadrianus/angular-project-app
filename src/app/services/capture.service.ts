import { Injectable } from '@angular/core';
import html2canvas from 'html2canvas';

@Injectable({ providedIn: 'root' })
export class CaptureService {
  async captureElement(element: HTMLElement): Promise<string> {
    const width = Math.max(element.scrollWidth, element.clientWidth);
    const height = Math.max(element.scrollHeight, element.clientHeight);
    const bounds = element.getBoundingClientRect();
    const originalStyles = {
      overflow: element.style.overflow,
      width: element.style.width,
      height: element.style.height,
      maxWidth: element.style.maxWidth,
      maxHeight: element.style.maxHeight,
    };

    element.style.overflow = 'visible';
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
    element.style.maxWidth = 'none';
    element.style.maxHeight = 'none';

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        foreignObjectRendering: true,
        onclone: (clonedDocument) => {
          clonedDocument.documentElement.style.backgroundColor = 'transparent';
          clonedDocument.body.style.backgroundColor = 'transparent';
        },
        backgroundColor: '#ffffff',
        width,
        height,
        x: -bounds.left - window.scrollX,
        y: -bounds.top - window.scrollY,
        windowWidth: Math.max(document.documentElement.clientWidth, width),
        windowHeight: Math.max(document.documentElement.clientHeight, height),
      });
      return canvas.toDataURL('image/png');
    } finally {
      element.style.overflow = originalStyles.overflow;
      element.style.width = originalStyles.width;
      element.style.height = originalStyles.height;
      element.style.maxWidth = originalStyles.maxWidth;
      element.style.maxHeight = originalStyles.maxHeight;
    }
  }
}
