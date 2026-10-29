/**
 * Shared pdf.js setup. Imported by every module that touches pdfjs so the
 * worker is configured no matter which code path runs first.
 */

import { pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

export { pdfjs };

/** Read the page count of a PDF (blob URL or path). */
export async function readPageCount(pdfUrl: string): Promise<number> {
  const doc = await pdfjs.getDocument(pdfUrl).promise;
  const n = doc.numPages;
  await doc.destroy();
  return n;
}
