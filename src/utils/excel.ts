/**
 * Excel compliance-matrix export + round-trip import (§6.5), via SheetJS
 * (xlsx-js-style fork so Bewertung cells get their chip background fill).
 */

import XLSX from 'xlsx-js-style';
import type { Bewertung, Segment, SpecDocument } from '../types';
import { bewertungChipStyle } from './status';

export type ExportColumn =
  | 'id'
  | 'segmentTyp'
  | 'kapitel'
  | 'text'
  | 'bewertung'
  | 'zuweisung'
  | 'kommentarOeffentlich'
  | 'kommentarIntern'
  | 'mehrkosten'
  | 'kommentarKunde';

export const EXPORT_COLUMNS: { key: ExportColumn; de: string; en: string; defaultOn: boolean; width: number }[] = [
  { key: 'id', de: 'ID', en: 'ID', defaultOn: true, width: 12 },
  { key: 'segmentTyp', de: 'Segment Typ', en: 'Segment Type', defaultOn: false, width: 14 },
  { key: 'kapitel', de: 'Kapitel', en: 'Chapter', defaultOn: true, width: 30 },
  { key: 'text', de: 'Text', en: 'Text', defaultOn: true, width: 80 },
  { key: 'bewertung', de: 'Bewertung', en: 'Evaluation', defaultOn: true, width: 16 },
  { key: 'zuweisung', de: 'Zuweisung', en: 'Assignment', defaultOn: true, width: 24 },
  { key: 'kommentarOeffentlich', de: 'Kommentar (öffentlich)', en: 'Comment (public)', defaultOn: true, width: 40 },
  { key: 'kommentarIntern', de: 'Kommentar (intern)', en: 'Comment (internal)', defaultOn: true, width: 40 },
  { key: 'mehrkosten', de: 'Mehrkosten', en: 'Extra costs', defaultOn: true, width: 12 },
  { key: 'kommentarKunde', de: 'Kommentar Kunde', en: 'Customer comment', defaultOn: true, width: 40 },
];

function htmlToPlain(text: string): string {
  return text
    .replace(/<\/tr>/g, '\n')
    .replace(/<\/(td|th)>/g, ' | ')
    .replace(/<[^>]+>/g, '')
    .replace(/[ \t]+\|/g, ' |')
    .trim();
}

function cellValue(seg: Segment, col: ExportColumn): string {
  switch (col) {
    case 'id':
      return seg.id;
    case 'segmentTyp':
      return seg.typ;
    case 'kapitel':
      return seg.kapitel;
    case 'text':
      return seg.contentType === 'table' ? htmlToPlain(seg.text) : seg.text;
    case 'bewertung':
      return seg.bewertung;
    case 'zuweisung':
      return seg.abteilungen.join(', ');
    case 'kommentarOeffentlich':
      return seg.kommentarOeffentlich;
    case 'kommentarIntern':
      return seg.kommentarIntern;
    case 'mehrkosten':
      return seg.mehrkosten;
    case 'kommentarKunde':
      return seg.kommentarKunde;
  }
}

export function exportComplianceMatrix(opts: {
  anfrageName: string;
  fileName: string;
  segments: Segment[];
  columns: ExportColumn[];
  language: 'Deutsch' | 'Englisch';
}): number {
  const { anfrageName, fileName, segments, columns, language } = opts;
  const meta = columns.map((c) => EXPORT_COLUMNS.find((m) => m.key === c)!);

  const header = meta.map((m) => ({
    v: language === 'Englisch' ? m.en : m.de,
    t: 's' as const,
    s: { font: { bold: true }, fill: { fgColor: { rgb: 'E5E7EB' } } },
  }));

  const rows = segments.map((seg) =>
    meta.map((m) => {
      const cell: any = { v: cellValue(seg, m.key), t: 's', s: { alignment: { wrapText: true, vertical: 'top' } } };
      if (m.key === 'bewertung') {
        const style = bewertungChipStyle(seg.bewertung);
        cell.s = {
          ...cell.s,
          fill: { fgColor: { rgb: style.bg.replace('#', '').toUpperCase() } },
          font: { color: { rgb: style.text.replace('#', '').toUpperCase() } },
        };
      }
      return cell;
    }),
  );

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!cols'] = meta.map((m) => ({ wch: m.width }));
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Compliance Matrix');

  const base = fileName.replace(/\.pdf$/i, '');
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${anfrageName}_${base}_Export_${date}.xlsx`);
  return rows.length;
}

/* ---------------- round-trip import ---------------------------------- */

export interface ImportResult {
  updated: number;
  unmatched: number;
  patches: { segmentId: string; patch: Partial<Segment> }[];
}

const IMPORT_FIELDS: { keys: string[]; field: keyof Segment }[] = [
  { keys: ['Bewertung', 'Evaluation'], field: 'bewertung' },
  { keys: ['Kommentar (öffentlich)', 'Comment (public)'], field: 'kommentarOeffentlich' },
  { keys: ['Kommentar (intern)', 'Comment (internal)'], field: 'kommentarIntern' },
  { keys: ['Mehrkosten', 'Extra costs'], field: 'mehrkosten' },
  { keys: ['Kommentar Kunde', 'Customer comment'], field: 'kommentarKunde' },
];

export async function importComplianceMatrix(file: File, doc: SpecDocument): Promise<ImportResult> {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws);

  const byId = new Map(doc.segments.map((s) => [s.id, s]));
  const result: ImportResult = { updated: 0, unmatched: 0, patches: [] };

  for (const row of rows) {
    const id = String(row['ID'] ?? row['id'] ?? '').trim();
    const seg = byId.get(id);
    if (!seg) {
      result.unmatched++;
      continue;
    }
    const patch: Partial<Segment> = {};
    for (const { keys, field } of IMPORT_FIELDS) {
      const key = keys.find((k) => k in row);
      if (key === undefined) continue;
      const value = String(row[key] ?? '');
      if (value !== String((seg as any)[field] ?? '')) (patch as any)[field] = value as Bewertung;
    }
    if (Object.keys(patch).length) {
      result.patches.push({ segmentId: seg.id, patch });
      result.updated++;
    }
  }
  return result;
}
