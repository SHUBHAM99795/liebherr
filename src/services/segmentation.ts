/**
 * SegmentationService (§9.1): pdf.js text extraction → heading/paragraph
 * splitting + type heuristic. Used for user-uploaded PDFs; fixture documents
 * ship pre-segmented.
 */

import { pdfjs } from 'react-pdf';
import type { HighlightBox, Segment, SegmentType } from '../types';
import { nextId } from '../store';

const REQUIREMENT_RE =
  /(muss|müssen|darf nicht|dürfen nicht|ist zu|sind zu|hat .{0,30} zu|sicherzustellen|einzuhalten)/i;
const HEADING_RE = /^\d+(\.\d+)*\s+\S/;
const TOC_RE = /\.{4,}\s*\d+\s*$/;
const PAGE_NO_RE = /^(Seite\s+)?\d+(\s+von\s+\d+)?$/i;

export function classifySegment(text: string, repeatedLines?: Set<string>): SegmentType {
  const t = text.trim();
  if (TOC_RE.test(t) || PAGE_NO_RE.test(t) || (repeatedLines && repeatedLines.has(t))) return 'Störtext';
  if (REQUIREMENT_RE.test(t)) return 'Anforderung';
  return 'Information';
}

export interface SegmentationService {
  segment(pdfUrl: string): Promise<Segment[]>;
}

export const segmentationService: SegmentationService = {
  async segment(pdfUrl: string): Promise<Segment[]> {
    const doc = await pdfjs.getDocument(pdfUrl).promise;
    const pages: string[][] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      // group text items into lines by their y position
      const lines = new Map<number, string[]>();
      for (const item of content.items as any[]) {
        if (!('str' in item) || !item.str.trim()) continue;
        const y = Math.round(item.transform[5]);
        if (!lines.has(y)) lines.set(y, []);
        lines.get(y)!.push(item.str);
      }
      const ordered = [...lines.entries()].sort((a, b) => b[0] - a[0]).map(([, parts]) => parts.join(' ').trim());
      pages.push(ordered);
    }

    // lines repeated on 3+ pages are headers/footers → Störtext
    const lineCounts = new Map<string, number>();
    for (const page of pages) {
      for (const line of new Set(page)) lineCounts.set(line, (lineCounts.get(line) ?? 0) + 1);
    }
    const repeated = new Set([...lineCounts.entries()].filter(([, n]) => n >= 3).map(([l]) => l));

    const segments: Segment[] = [];
    let kapitel = 'Allgemein';
    pages.forEach((lines, pageIdx) => {
      const page = pageIdx + 1;
      let paragraph: string[] = [];
      let yCursor = 8;

      const flush = () => {
        if (!paragraph.length) return;
        const text = paragraph.join(' ').trim();
        paragraph = [];
        if (!text) return;
        const h = Math.min(24, 3 + Math.ceil(text.length / 95) * 2.4);
        if (yCursor + h > 94) yCursor = 8;
        const highlight: HighlightBox = { page, x: 8, y: yCursor, w: 84, h };
        yCursor += h + 2;
        segments.push({
          id: nextId('seg'),
          nr: segments.length + 1,
          kapitel,
          text,
          contentType: 'text',
          page,
          highlights: [highlight],
          typ: classifySegment(text, repeated),
          bewertung: 'Offen',
          abteilungen: [],
          kommentarOeffentlich: '',
          kommentarIntern: '',
          kommentarKunde: '',
          rueckmeldungKunde: '',
          mehrkosten: '',
          artikelnummern: '',
          historie: [],
        });
      };

      for (const line of lines) {
        if (HEADING_RE.test(line) && line.length < 90) {
          flush();
          kapitel = line;
          continue;
        }
        if (!line.trim()) {
          flush();
          continue;
        }
        paragraph.push(line);
        // paragraph break on sentence end to keep segments small
        if (/[.:;]$/.test(line.trim()) && paragraph.join(' ').length > 120) flush();
      }
      flush();
    });

    return segments;
  },
};
