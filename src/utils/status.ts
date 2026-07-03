/**
 * Derived counters, chip styles and shared filtering helpers.
 * Counter definitions follow §3 of the build prompt, chip colors §4.
 */

import type { Abteilung, Bewertung, Segment, SegmentType } from '../types';

/* ---------------- counters (over typ === 'Anforderung' only) -------- */

export interface BewertungCounts {
  erfuellt: number;
  abgelehnt: number;
  unklar: number;
  ohneDaten: number;
  nichtRelevant: number;
  offen: number;
  anforderungen: number;
  segmente: number;
}

export function computeCounts(segments: Segment[]): BewertungCounts {
  const c: BewertungCounts = {
    erfuellt: 0,
    abgelehnt: 0,
    unklar: 0,
    ohneDaten: 0,
    nichtRelevant: 0,
    offen: 0,
    anforderungen: 0,
    segmente: segments.length,
  };
  for (const s of segments) {
    if (s.typ !== 'Anforderung') continue;
    c.anforderungen++;
    switch (s.bewertung) {
      case 'OK':
      case 'OK (Mehrkosten)':
      case 'OK (Ausnahme)':
        c.erfuellt++;
        break;
      case 'Abgelehnt':
        c.abgelehnt++;
        break;
      case 'Unklar':
        c.unklar++;
        break;
      case 'Keine Daten':
        c.ohneDaten++;
        break;
      case 'Nicht Relevant':
        c.nichtRelevant++;
        break;
      case 'Offen':
        c.offen++;
        break;
    }
  }
  return c;
}

/** Status-line number colors (§3). */
export const COUNTER_COLORS = {
  erfuellt: '#16a34a',
  abgelehnt: '#dc2626',
  unklar: '#ea580c',
  ohneDaten: '#d97706',
  nichtRelevant: '#6b7280',
  offen: '#ca8a04',
} as const;

/* ---------------- chip styles (§4) ----------------------------------- */

export interface ChipStyle {
  bg: string;
  border: string;
  text: string;
}

export function bewertungChipStyle(b: Bewertung): ChipStyle {
  if (b.startsWith('OK')) return { bg: '#e7f6ec', border: '#34a853', text: '#1e7e34' };
  switch (b) {
    case 'Abgelehnt':
      return { bg: '#fdecea', border: '#ea4335', text: '#c5221f' };
    case 'Keine Daten':
      return { bg: '#fef7e0', border: '#f9ab00', text: '#b06000' };
    case 'Unklar':
      return { bg: '#fff4e0', border: '#fb8c00', text: '#b45309' };
    case 'Offen':
      return { bg: '#fef9c3', border: '#eab308', text: '#854d0e' };
    default: // Nicht Relevant
      return { bg: '#ffffff', border: '#9ca3af', text: '#4b5563' };
  }
}

export const ALL_BEWERTUNGEN: Bewertung[] = [
  'Offen',
  'OK',
  'OK (Mehrkosten)',
  'OK (Ausnahme)',
  'Abgelehnt',
  'Keine Daten',
  'Unklar',
  'Nicht Relevant',
];

export const ALL_ABTEILUNGEN: Abteilung[] = [
  'Elektrik',
  'Mechanik',
  'Software & Steuerung',
  'Technologie',
  'Vertrieb & Projektierung',
  'WICHTIG',
];

export const ALL_TYPEN: SegmentType[] = ['Information', 'Anforderung', 'Störtext'];

export function typAbbrev(t: SegmentType): string {
  switch (t) {
    case 'Anforderung':
      return 'ANF';
    case 'Information':
      return 'INF';
    default:
      return 'STÖ';
  }
}

export function hasComment(s: Segment): boolean {
  return !!(s.kommentarOeffentlich || s.kommentarIntern || s.kommentarKunde || s.rueckmeldungKunde);
}

/* ---------------- table filters (§6.3) -------------------------------- */

export interface SegmentFilters {
  typ: SegmentType[];
  versionsabgleich: string[]; // 'neu' | 'geändert' | 'entfernt' | 'unverändert'
  bewertung: Bewertung[];
  ki: string[]; // 'mit' | 'ohne'
  kommentar: string[]; // 'mit' | 'ohne'
  abteilung: string[]; // 'ohne' + Abteilung values
}

export const EMPTY_FILTERS: SegmentFilters = {
  typ: [],
  versionsabgleich: [],
  bewertung: [],
  ki: [],
  kommentar: [],
  abteilung: [],
};

export function activeFilterCount(f: SegmentFilters): number {
  return (
    f.typ.length + f.versionsabgleich.length + f.bewertung.length + f.ki.length + f.kommentar.length + f.abteilung.length
  );
}

/** AND across dropdowns, OR within a dropdown. */
export function filterSegments(segments: Segment[], filters: SegmentFilters, search: string): Segment[] {
  const q = search.trim().toLowerCase();
  return segments.filter((s) => {
    if (q && !(`${s.kapitel} ${s.text}`.toLowerCase().includes(q))) return false;
    if (filters.typ.length && !filters.typ.includes(s.typ)) return false;
    if (filters.versionsabgleich.length) {
      if (!s.versionDiff || !filters.versionsabgleich.includes(s.versionDiff.status)) return false;
    }
    if (filters.bewertung.length && !filters.bewertung.includes(s.bewertung)) return false;
    if (filters.ki.length) {
      const mitKi = !!s.ki;
      const ok = (filters.ki.includes('mit') && mitKi) || (filters.ki.includes('ohne') && !mitKi);
      if (!ok) return false;
    }
    if (filters.kommentar.length) {
      const mit = hasComment(s);
      const ok = (filters.kommentar.includes('mit') && mit) || (filters.kommentar.includes('ohne') && !mit);
      if (!ok) return false;
    }
    if (filters.abteilung.length) {
      const matchesOhne = filters.abteilung.includes('ohne') && s.abteilungen.length === 0;
      const matchesDept = s.abteilungen.some((a) => filters.abteilung.includes(a));
      if (!matchesOhne && !matchesDept) return false;
    }
    return true;
  });
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return (
    d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  );
}
