/**
 * Toolbar actions (§7) shared between the documents view and the segments
 * table: AI department assignment, Standardabgleich, Historienabgleich,
 * SegmentTypeExt, Versionsupdate, Excel import.
 */

import { toast } from 'sonner';
import type { Segment, SpecDocument } from '../types';
import { aiService } from '../services/aiService';
import { classifySegment, segmentationService } from '../services/segmentation';
import { findDocument, useStore, type SegmentPatch } from '../store';
import { importComplianceMatrix } from './excel';

function storeState() {
  return useStore.getState();
}

/** Segment one document (used by upload pipeline and the row button). */
export async function segmentDocument(docId: string): Promise<number> {
  const { anfragen, setDocument, replaceSegments } = storeState();
  const doc = findDocument(anfragen, docId);
  if (!doc) return 0;
  setDocument(docId, { segmentierungsStatus: 'In Bearbeitung' });
  try {
    const segments = await segmentationService.segment(doc.pdfUrl);
    replaceSegments(docId, segments);
    setDocument(docId, {
      segmentierungsStatus: 'Segmentiert',
      pageCount: Math.max(doc.pageCount, ...segments.map((s) => s.page), 1),
    });
    return segments.length;
  } catch (e) {
    setDocument(docId, { segmentierungsStatus: 'Nicht segmentiert' });
    toast.error(`Segmentierung von ${doc.fileName} fehlgeschlagen`);
    return 0;
  }
}

/**
 * One-shot matrix generation for a document: segmentation (if needed) +
 * KI department assignment + Standardabgleich + Historienabgleich.
 * Leaves a ready-to-review compliance matrix.
 */
export async function generateMatrix(docId: string): Promise<number> {
  const fresh = () => findDocument(useStore.getState().anfragen, docId);
  let doc = fresh();
  if (!doc) return 0;

  const id = toast.loading(`Matrix wird erstellt: ${doc.fileName} — Segmentierung…`);
  let count = doc.segments.length;
  if (doc.segmentierungsStatus !== 'Segmentiert' || count === 0) {
    count = await segmentDocument(docId);
  }
  if (count === 0) {
    toast.error('Keine Textsegmente gefunden (gescanntes PDF ohne Textebene?)', { id });
    return 0;
  }

  toast.loading(`Matrix wird erstellt: KI-Zuweisung (${count} Segmente)…`, { id });
  doc = fresh()!;
  await runZuweisungAbteilungen(doc);

  toast.loading('Matrix wird erstellt: Standardabgleich…', { id });
  doc = fresh()!;
  await runStandardabgleich(doc);

  toast.loading('Matrix wird erstellt: Historienabgleich…', { id });
  doc = fresh()!;
  await runHistorienabgleich(doc);

  toast.success(`Compliance Matrix erstellt: ${count} Segmente`, { id });
  return count;
}

/**
 * Apply all pending KI suggestions to the matrix in one go:
 * suggested departments are assigned, Historienabgleich hits fill the
 * Bewertung + internal comment, standard conflicts mark segments Unklar.
 * Only segments still "Offen" get a Bewertung — nothing reviewed is touched.
 */
export function applyKiSuggestions(doc: SpecDocument): number {
  const { updateSegment } = storeState();
  let applied = 0;
  for (const seg of doc.segments) {
    if (!seg.ki) continue;
    const patch: SegmentPatch = {};
    if (seg.ki.suggestedAbteilungen?.length) {
      const union = [...new Set([...seg.abteilungen, ...seg.ki.suggestedAbteilungen])];
      if (union.length !== seg.abteilungen.length) patch.abteilungen = union;
    }
    if (seg.bewertung === 'Offen' && seg.typ === 'Anforderung') {
      if (seg.ki.historienTreffer) {
        patch.bewertung = seg.ki.historienTreffer.bewertung;
        if (!seg.kommentarIntern && seg.ki.historienTreffer.kommentar) {
          patch.kommentarIntern = `Aus ${seg.ki.historienTreffer.anfrageName}: ${seg.ki.historienTreffer.kommentar}`;
        }
      } else if (seg.ki.suggestedBewertung) {
        patch.bewertung = seg.ki.suggestedBewertung;
      } else if (seg.ki.standardKonflikt) {
        patch.bewertung = 'Unklar';
      }
    }
    if (Object.keys(patch).length) {
      updateSegment(doc.id, seg.id, patch, 'KI-Vorbewertung');
      applied++;
    }
  }
  return applied;
}

export async function runZuweisungAbteilungen(doc: SpecDocument, segmentIds?: string[]): Promise<void> {
  const { checklisten, updateSegment } = storeState();
  const targets = segmentIds?.length ? doc.segments.filter((s) => segmentIds.includes(s.id)) : doc.segments;
  const id = toast.loading('KI-Zuweisung läuft…');
  const suggestions = await aiService.assignDepartments(targets, checklisten);
  for (const sug of suggestions) {
    const seg = doc.segments.find((s) => s.id === sug.segmentId)!;
    updateSegment(doc.id, sug.segmentId, {
      abteilungen: [...new Set([...seg.abteilungen, ...sug.suggestedAbteilungen])],
      ki: {
        ...seg.ki,
        suggestedAbteilungen: sug.suggestedAbteilungen,
        suggestedBewertung: sug.suggestedBewertung ?? seg.ki?.suggestedBewertung,
        matchedChecklistItem: sug.matchedChecklistItem,
        confidence: sug.confidence,
      },
    });
  }
  toast.success(`${suggestions.length} Segmente zugewiesen`, { id });
}

export async function runStandardabgleich(doc: SpecDocument, segmentIds?: string[]): Promise<void> {
  const { standards, updateSegment } = storeState();
  const targets = segmentIds?.length ? doc.segments.filter((s) => segmentIds.includes(s.id)) : doc.segments;
  const id = toast.loading('Standardabgleich läuft…');
  const conflicts = await aiService.compareToStandards(targets, standards);
  for (const c of conflicts) {
    const seg = doc.segments.find((s) => s.id === c.segmentId)!;
    updateSegment(doc.id, c.segmentId, { ki: { ...seg.ki, standardKonflikt: c.konflikt } });
  }
  toast.success(`${conflicts.length} mögliche Konflikte gefunden`, { id });
}

export async function runHistorienabgleich(doc: SpecDocument, segmentIds?: string[]): Promise<void> {
  const { anfragen, updateSegment } = storeState();
  const others = anfragen.filter((a) => a.id !== doc.anfrageId && !a.deleted);
  const targets = segmentIds?.length ? doc.segments.filter((s) => segmentIds.includes(s.id)) : doc.segments;
  const id = toast.loading('Historienabgleich läuft…');
  const hits = await aiService.compareToHistory(targets, others);
  for (const h of hits) {
    const seg = doc.segments.find((s) => s.id === h.segmentId)!;
    updateSegment(doc.id, h.segmentId, {
      ki: { ...seg.ki, historienTreffer: { anfrageName: h.anfrageName, bewertung: h.bewertung, kommentar: h.kommentar } },
    });
  }
  toast.success(`${hits.length} Treffer aus früheren Anfragen`, { id });
}

export function runSegmentTypeExt(doc: SpecDocument): void {
  const { updateSegment } = storeState();
  const counts = { Anforderung: 0, Information: 0, 'Störtext': 0 };
  for (const seg of doc.segments) {
    const typ = seg.contentType === 'table' ? seg.typ : classifySegment(seg.text);
    counts[typ]++;
    if (typ !== seg.typ) updateSegment(doc.id, seg.id, { typ }, 'SegmentTypeExt');
  }
  toast.success(`Segment-Typen berechnet: ${counts.Anforderung} ANF, ${counts.Information} INF, ${counts['Störtext']} STÖ`);
}

/** Bump A.2 → A.3 → … → B.1 style version strings. */
export function bumpVersion(v: string): string {
  const m = v.match(/^([A-Z])[.,](\d+)$/);
  if (!m) return v + '.1';
  const [, letter, num] = m;
  const n = Number(num) + 1;
  if (n > 3) return `${String.fromCharCode(letter.charCodeAt(0) + 1)}.1`;
  return `${letter}.${n}`;
}

/** Mock version diff: mark segments neu/geändert/entfernt/unverändert. */
export function runVersionsupdate(doc: SpecDocument): void {
  const { updateSegment, setDocument } = storeState();
  let neu = 0;
  let geaendert = 0;
  let entfernt = 0;
  doc.segments.forEach((seg, i) => {
    if (seg.versionDiff) {
      // keep fixture diff marks
      if (seg.versionDiff.status === 'neu') neu++;
      if (seg.versionDiff.status === 'geändert') geaendert++;
      if (seg.versionDiff.status === 'entfernt') entfernt++;
      return;
    }
    // deterministic pseudo-random distribution over the remaining segments
    const roll = (i * 2654435761) % 100;
    if (seg.typ === 'Anforderung' && roll < 4) {
      neu++;
      updateSegment(doc.id, seg.id, { versionDiff: { status: 'neu' } }, 'Versionsupdate');
    } else if (seg.typ === 'Anforderung' && roll < 12) {
      geaendert++;
      updateSegment(
        doc.id,
        seg.id,
        { versionDiff: { status: 'geändert', oldText: mutateText(seg.text) } },
        'Versionsupdate',
      );
    } else if (roll < 14) {
      entfernt++;
      updateSegment(doc.id, seg.id, { versionDiff: { status: 'entfernt' } }, 'Versionsupdate');
    } else {
      updateSegment(doc.id, seg.id, { versionDiff: { status: 'unverändert' } }, 'Versionsupdate');
    }
  });
  setDocument(doc.id, { version: bumpVersion(doc.version) });
  toast.success(`Versionsabgleich abgeschlossen: ${neu} neu, ${geaendert} geändert, ${entfernt} entfernt`);
}

/** Produce a plausible "previous version" of a sentence for the mock diff. */
function mutateText(text: string): string {
  return text
    .replace(/\b(mindestens|max\.|maximal)\s+(\d+)/i, (_, w, n) => `${w} ${Math.max(1, Math.round(Number(n) / 2))}`)
    .replace(/24 Monate/, '12 Monate')
    .replace(/zwei Wochen/, 'eine Woche');
}

export async function runExcelImport(file: File, doc: SpecDocument): Promise<{ updated: number; unmatched: number }> {
  const { updateSegment } = storeState();
  const result = await importComplianceMatrix(file, doc);
  for (const { segmentId, patch } of result.patches) {
    updateSegment(doc.id, segmentId, patch as any, 'Excel-Import');
  }
  return { updated: result.updated, unmatched: result.unmatched };
}

/** Open counts per department for „Abteilungen Benachrichtigen". */
export function openCountsByAbteilung(segments: Segment[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const seg of segments) {
    if (seg.typ !== 'Anforderung') continue;
    if (!['Offen', 'Unklar', 'Keine Daten'].includes(seg.bewertung)) continue;
    for (const a of seg.abteilungen) map.set(a, (map.get(a) ?? 0) + 1);
  }
  return map;
}
