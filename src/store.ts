/**
 * Central app state (zustand). Implements the Repository semantics from §2
 * in-memory: every mutation goes through an action here, so a REST backend
 * can later be swapped in behind the same action signatures.
 */

import { create } from 'zustand';
import type {
  Abteilung,
  Anfrage,
  Bewertung,
  Checkliste,
  ChecklistItem,
  HistoryEntry,
  InternerStandard,
  Segment,
  SegmentType,
  SpecDocument,
} from './types';
import { fixtureAnfragen, fixtureChecklisten, fixtureInterneStandards } from './data/fixtures';
import { EMPTY_FILTERS, type SegmentFilters } from './utils/status';

export const CURRENT_USER = 'Max Mustermann';

let idCounter = 1000;
export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function now(): string {
  return new Date().toISOString();
}

function historyEntry(field: string, oldValue: string, newValue: string, user = CURRENT_USER): HistoryEntry {
  return { timestamp: now(), user, field, oldValue, newValue };
}

/** Editable segment fields tracked in the Bearbeitungshistorie. */
export interface SegmentPatch {
  bewertung?: Bewertung;
  abteilungen?: Abteilung[];
  kommentarOeffentlich?: string;
  kommentarIntern?: string;
  kommentarKunde?: string;
  rueckmeldungKunde?: string;
  mehrkosten?: string;
  artikelnummern?: string;
  typ?: SegmentType;
  ki?: Segment['ki'];
  versionDiff?: Segment['versionDiff'];
}

const FIELD_LABELS: Record<string, string> = {
  bewertung: 'Bewertung',
  abteilungen: 'Abteilungen',
  kommentarOeffentlich: 'Kommentar (öffentlich)',
  kommentarIntern: 'Kommentar (intern)',
  kommentarKunde: 'Kommentar Kunde',
  rueckmeldungKunde: 'Rückmeldung vom Kunden',
  mehrkosten: 'Mehrkosten',
  artikelnummern: 'Artikelnummer(n)',
  typ: 'Segment-Typ',
};

function applyPatch(segment: Segment, patch: SegmentPatch, user: string): Segment {
  const next = { ...segment };
  const historie = [...segment.historie];
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const label = FIELD_LABELS[key];
    if (label) {
      const oldRaw = (segment as any)[key];
      const oldStr = Array.isArray(oldRaw) ? oldRaw.join(', ') : String(oldRaw ?? '');
      const newStr = Array.isArray(value) ? value.join(', ') : String(value);
      if (oldStr !== newStr) historie.push(historyEntry(label, oldStr, newStr, user));
    }
    (next as any)[key] = value;
  }
  next.historie = historie;
  return next;
}

/* ---------------- UI state kept across the detail overlay -------------- */

export interface TableUiState {
  search: string;
  filters: SegmentFilters;
  page: number;
  pageSize: number;
  lastSegmentId?: string;
  scrollY?: number;
}

export interface AppSettings {
  exportLanguage: 'Deutsch' | 'Englisch';
  itemsPerPage: number;
  abteilungen: { name: string; color: string }[];
}

interface AppState {
  anfragen: Anfrage[];
  checklisten: Checkliste[];
  standards: InternerStandard[];
  settings: AppSettings;
  /** per-document table UI state, keyed by document id */
  tableUi: Record<string, TableUiState>;

  /* --- anfragen --- */
  addAnfrage(name: string): Anfrage;
  renameAnfrage(id: string, name: string): void;
  deleteAnfrage(id: string): void;
  restoreAnfrage(id: string): void;
  purgeAnfrage(id: string): void;

  /* --- documents --- */
  addDocuments(anfrageId: string, files: { fileName: string; pdfUrl: string; pageCount: number }[]): SpecDocument[];
  removeDocuments(anfrageId: string, docIds: string[]): void;
  renameDocument(docId: string, fileName: string): void;
  setDocument(docId: string, patch: Partial<SpecDocument>): void;

  /* --- segments --- */
  updateSegment(docId: string, segmentId: string, patch: SegmentPatch, user?: string): void;
  replaceSegments(docId: string, segments: Segment[]): void;
  mergeWithNext(docId: string, segmentId: string): boolean;
  splitSegment(docId: string, segmentId: string, splitPos: number): boolean;

  /* --- checklisten --- */
  addCheckliste(name: string): Checkliste;
  renameCheckliste(id: string, name: string): void;
  deleteCheckliste(id: string): void;
  addChecklistItem(listId: string, item: Omit<ChecklistItem, 'id'>): void;
  updateChecklistItem(listId: string, itemId: string, patch: Partial<ChecklistItem>): void;
  deleteChecklistItem(listId: string, itemId: string): void;

  /* --- standards --- */
  addStandard(std: Omit<InternerStandard, 'id'>): void;
  deleteStandard(id: string): void;

  /* --- settings / ui --- */
  setSettings(patch: Partial<AppSettings>): void;
  setTableUi(docId: string, patch: Partial<TableUiState>): void;
}

function mapDocument(anfragen: Anfrage[], docId: string, fn: (d: SpecDocument) => SpecDocument): Anfrage[] {
  return anfragen.map((a) => ({
    ...a,
    documents: a.documents.map((d) => (d.id === docId ? fn(d) : d)),
  }));
}

export const useStore = create<AppState>((set, get) => ({
  anfragen: fixtureAnfragen,
  checklisten: fixtureChecklisten,
  standards: fixtureInterneStandards,
  settings: {
    exportLanguage: 'Deutsch',
    itemsPerPage: 25,
    abteilungen: [
      { name: 'Elektrik', color: '#2563eb' },
      { name: 'Mechanik', color: '#16a34a' },
      { name: 'Software & Steuerung', color: '#9333ea' },
      { name: 'Technologie', color: '#0891b2' },
      { name: 'Vertrieb & Projektierung', color: '#d97706' },
      { name: 'WICHTIG', color: '#dc2626' },
    ],
  },
  tableUi: {},

  /* --- anfragen --- */
  addAnfrage(name) {
    const anfrage: Anfrage = { id: nextId('anf'), name, createdAt: now(), documents: [] };
    set((s) => ({ anfragen: [anfrage, ...s.anfragen] }));
    return anfrage;
  },
  renameAnfrage(id, name) {
    set((s) => ({ anfragen: s.anfragen.map((a) => (a.id === id ? { ...a, name } : a)) }));
  },
  deleteAnfrage(id) {
    set((s) => ({ anfragen: s.anfragen.map((a) => (a.id === id ? { ...a, deleted: true } : a)) }));
  },
  restoreAnfrage(id) {
    set((s) => ({ anfragen: s.anfragen.map((a) => (a.id === id ? { ...a, deleted: false } : a)) }));
  },
  purgeAnfrage(id) {
    set((s) => ({ anfragen: s.anfragen.filter((a) => a.id !== id) }));
  },

  /* --- documents --- */
  addDocuments(anfrageId, files) {
    const docs: SpecDocument[] = files.map((f) => ({
      id: nextId('doc'),
      anfrageId,
      fileName: f.fileName,
      pdfUrl: f.pdfUrl,
      pageCount: f.pageCount,
      version: 'A.1',
      segmentierungsStatus: 'Nicht segmentiert',
      segments: [],
      uploadedAt: now(),
    }));
    set((s) => ({
      anfragen: s.anfragen.map((a) => (a.id === anfrageId ? { ...a, documents: [...a.documents, ...docs] } : a)),
    }));
    return docs;
  },
  removeDocuments(anfrageId, docIds) {
    set((s) => ({
      anfragen: s.anfragen.map((a) =>
        a.id === anfrageId ? { ...a, documents: a.documents.filter((d) => !docIds.includes(d.id)) } : a,
      ),
    }));
  },
  renameDocument(docId, fileName) {
    set((s) => ({ anfragen: mapDocument(s.anfragen, docId, (d) => ({ ...d, fileName })) }));
  },
  setDocument(docId, patch) {
    set((s) => ({ anfragen: mapDocument(s.anfragen, docId, (d) => ({ ...d, ...patch })) }));
  },

  /* --- segments --- */
  updateSegment(docId, segmentId, patch, user = CURRENT_USER) {
    set((s) => ({
      anfragen: mapDocument(s.anfragen, docId, (d) => ({
        ...d,
        segments: d.segments.map((seg) => (seg.id === segmentId ? applyPatch(seg, patch, user) : seg)),
      })),
    }));
  },
  replaceSegments(docId, segments) {
    set((s) => ({ anfragen: mapDocument(s.anfragen, docId, (d) => ({ ...d, segments })) }));
  },
  mergeWithNext(docId, segmentId) {
    let merged = false;
    set((s) => ({
      anfragen: mapDocument(s.anfragen, docId, (d) => {
        const idx = d.segments.findIndex((seg) => seg.id === segmentId);
        if (idx < 0 || idx >= d.segments.length - 1) return d;
        const cur = d.segments[idx];
        const nxt = d.segments[idx + 1];
        const combined: Segment = {
          ...cur,
          text: `${cur.text}\n${nxt.text}`,
          highlights: [...cur.highlights, ...nxt.highlights],
          historie: [
            ...cur.historie,
            historyEntry('Zusammenführen', `#${cur.nr} + #${nxt.nr}`, `#${cur.nr}`),
          ],
        };
        const segments = [...d.segments.slice(0, idx), combined, ...d.segments.slice(idx + 2)].map((seg, i) => ({
          ...seg,
          nr: i + 1,
        }));
        merged = true;
        return { ...d, segments };
      }),
    }));
    return merged;
  },
  splitSegment(docId, segmentId, splitPos) {
    let ok = false;
    set((s) => ({
      anfragen: mapDocument(s.anfragen, docId, (d) => {
        const idx = d.segments.findIndex((seg) => seg.id === segmentId);
        if (idx < 0) return d;
        const cur = d.segments[idx];
        const a = cur.text.slice(0, splitPos).trim();
        const b = cur.text.slice(splitPos).trim();
        if (!a || !b) return d;
        const first: Segment = {
          ...cur,
          text: a,
          historie: [...cur.historie, historyEntry('Aufteilen', cur.text, a)],
        };
        const second: Segment = {
          ...cur,
          id: nextId('seg'),
          text: b,
          bewertung: 'Offen',
          kommentarOeffentlich: '',
          kommentarIntern: '',
          kommentarKunde: '',
          rueckmeldungKunde: '',
          mehrkosten: '',
          artikelnummern: '',
          ki: undefined,
          versionDiff: undefined,
          historie: [historyEntry('Aufteilen', '', b)],
        };
        const segments = [...d.segments.slice(0, idx), first, second, ...d.segments.slice(idx + 1)].map((seg, i) => ({
          ...seg,
          nr: i + 1,
        }));
        ok = true;
        return { ...d, segments };
      }),
    }));
    return ok;
  },

  /* --- checklisten --- */
  addCheckliste(name) {
    const cl: Checkliste = { id: nextId('cl'), name, items: [] };
    set((s) => ({ checklisten: [...s.checklisten, cl] }));
    return cl;
  },
  renameCheckliste(id, name) {
    set((s) => ({ checklisten: s.checklisten.map((c) => (c.id === id ? { ...c, name } : c)) }));
  },
  deleteCheckliste(id) {
    set((s) => ({ checklisten: s.checklisten.filter((c) => c.id !== id) }));
  },
  addChecklistItem(listId, item) {
    set((s) => ({
      checklisten: s.checklisten.map((c) =>
        c.id === listId ? { ...c, items: [...c.items, { ...item, id: nextId('cli') }] } : c,
      ),
    }));
  },
  updateChecklistItem(listId, itemId, patch) {
    set((s) => ({
      checklisten: s.checklisten.map((c) =>
        c.id === listId ? { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) } : c,
      ),
    }));
  },
  deleteChecklistItem(listId, itemId) {
    set((s) => ({
      checklisten: s.checklisten.map((c) =>
        c.id === listId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c,
      ),
    }));
  },

  /* --- standards --- */
  addStandard(std) {
    set((s) => ({ standards: [...s.standards, { ...std, id: nextId('std') }] }));
  },
  deleteStandard(id) {
    set((s) => ({ standards: s.standards.filter((st) => st.id !== id) }));
  },

  /* --- settings / ui --- */
  setSettings(patch) {
    set((s) => ({ settings: { ...s.settings, ...patch } }));
  },
  setTableUi(docId, patch) {
    set((s) => {
      const cur: TableUiState =
        s.tableUi[docId] ?? {
          search: '',
          filters: EMPTY_FILTERS,
          page: 1,
          pageSize: s.settings.itemsPerPage,
        };
      return { tableUi: { ...s.tableUi, [docId]: { ...cur, ...patch } } };
    });
  },
}));

/* ---------------- selectors ------------------------------------------- */

export function findDocument(anfragen: Anfrage[], docId: string): SpecDocument | undefined {
  for (const a of anfragen) {
    const d = a.documents.find((d) => d.id === docId);
    if (d) return d;
  }
  return undefined;
}

export function findDocumentBySegment(anfragen: Anfrage[], segmentId: string): SpecDocument | undefined {
  for (const a of anfragen) {
    for (const d of a.documents) {
      if (d.segments.some((s) => s.id === segmentId)) return d;
    }
  }
  return undefined;
}

export function defaultTableUi(itemsPerPage: number): TableUiState {
  return { search: '', filters: EMPTY_FILTERS, page: 1, pageSize: itemsPerPage };
}
