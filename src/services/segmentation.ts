/**
 * SegmentationService (§9.1): pdf.js text extraction → heading/paragraph
 * splitting + type heuristic. Highlight boxes are computed from the real
 * text geometry of the page, so user-uploaded PDFs get accurate highlights.
 */

import { pdfjs } from '../pdf';
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

/** One rendered text line with its geometry (PDF coords, origin bottom-left). */
interface Line {
  text: string;
  minX: number;
  maxX: number;
  yBottom: number;
  height: number;
}

interface PageContent {
  lines: Line[];
  width: number;
  height: number;
}

async function extractPages(pdfUrl: string): Promise<PageContent[]> {
  const doc = await pdfjs.getDocument(pdfUrl).promise;
  const pages: PageContent[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();

    // group text items into lines by their y position
    const byY = new Map<number, Line>();
    for (const item of content.items as any[]) {
      if (!('str' in item) || !item.str.trim()) continue;
      const x = item.transform[4];
      const y = Math.round(item.transform[5]);
      const w = item.width ?? 0;
      const h = item.height || Math.abs(item.transform[3]) || 10;
      const line = byY.get(y);
      if (line) {
        line.text += (x > line.maxX + 1 ? ' ' : '') + item.str;
        line.minX = Math.min(line.minX, x);
        line.maxX = Math.max(line.maxX, x + w);
        line.height = Math.max(line.height, h);
      } else {
        byY.set(y, { text: item.str, minX: x, maxX: x + w, yBottom: item.transform[5], height: h });
      }
    }
    const lines = [...byY.values()].sort((a, b) => b.yBottom - a.yBottom).map((l) => ({ ...l, text: l.text.trim() }));
    pages.push({ lines, width: viewport.width, height: viewport.height });
  }
  await doc.destroy();
  return pages;
}

/** Bounding box of a group of lines as HighlightBox (% of page). */
function boxFromLines(lines: Line[], page: number, pw: number, ph: number): HighlightBox {
  const top = Math.max(...lines.map((l) => l.yBottom + l.height));
  const bottom = Math.min(...lines.map((l) => l.yBottom));
  const minX = Math.min(...lines.map((l) => l.minX));
  const maxX = Math.max(...lines.map((l) => l.maxX));
  const pad = 2;
  return {
    page,
    x: Math.max(0, ((minX - pad) / pw) * 100),
    y: Math.max(0, ((ph - top - pad) / ph) * 100),
    w: Math.min(100, ((maxX - minX + 2 * pad) / pw) * 100),
    h: Math.min(100, ((top - bottom + 2 * pad) / ph) * 100),
  };
}

export interface SegmentationService {
  segment(pdfUrl: string): Promise<Segment[]>;
}

export const segmentationService: SegmentationService = {
  async segment(pdfUrl: string): Promise<Segment[]> {
    const pages = await extractPages(pdfUrl);

    // lines repeated on 3+ pages are headers/footers → Störtext
    const lineCounts = new Map<string, number>();
    for (const page of pages) {
      for (const t of new Set(page.lines.map((l) => l.text))) lineCounts.set(t, (lineCounts.get(t) ?? 0) + 1);
    }
    const repeated = new Set([...lineCounts.entries()].filter(([, n]) => n >= 3).map(([t]) => t));

    const segments: Segment[] = [];
    let kapitel = 'Allgemein';

    pages.forEach((pageContent, pageIdx) => {
      const page = pageIdx + 1;
      const { lines, width: pw, height: ph } = pageContent;
      let paragraph: Line[] = [];
      let prevLine: Line | null = null;

      const flush = () => {
        if (!paragraph.length) return;
        const text = paragraph.map((l) => l.text).join(' ').trim();
        const box = boxFromLines(paragraph, page, pw, ph);
        paragraph = [];
        if (!text) return;
        segments.push({
          id: nextId('seg'),
          nr: segments.length + 1,
          kapitel,
          text,
          contentType: 'text',
          page,
          highlights: [box],
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
        // large vertical gap = paragraph break
        if (prevLine && prevLine.yBottom - (line.yBottom + line.height) > Math.max(prevLine.height, line.height) * 1.2) {
          flush();
        }
        prevLine = line;

        if (HEADING_RE.test(line.text) && line.text.length < 90) {
          flush();
          kapitel = line.text;
          continue;
        }
        paragraph.push(line);
        // keep segments sentence-sized
        const joined = paragraph.map((l) => l.text).join(' ');
        if (/[.:;]\s*$/.test(line.text) && joined.length > 120) flush();
      }
      flush();
    });

    return segments;
  },
};

const STOPWORDS = new Set(
  'aber alle allem allen aller alles auch auf aus bei bin bis bist das dass dem den der des die dies diese diesem diesen dieser dieses durch eine einem einen einer eines für gegen haben hat ihre ihrem ihren ihrer ihres im in ist kann können mit muss müssen nach nicht noch nur oder sein seine sich sie sind über um und unter vom von vor werden wird wurde zu zum zur das etwa sowie bzw ggf sollte sollten dürfen darf jeweils gemäß mindestens maximal'.split(
    /\s+/,
  ),
);

/** Extract characteristic keywords from a PDF (for Interne Standards). */
export async function extractKeywordsFromPdf(pdfUrl: string, max = 10): Promise<string[]> {
  const pages = await extractPages(pdfUrl);
  const counts = new Map<string, number>();
  for (const page of pages) {
    for (const line of page.lines) {
      for (const raw of line.text.split(/[^A-Za-zÄÖÜäöüß0-9-]+/)) {
        const w = raw.trim();
        if (w.length < 5 || STOPWORDS.has(w.toLowerCase())) continue;
        // prefer technical terms: capitalized words, codes with digits/hyphens
        if (!/^[A-ZÄÖÜ]/.test(w) && !/[0-9-]/.test(w)) continue;
        counts.set(w, (counts.get(w) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w);
}
