/**
 * src/types.ts
 * Data model for the Compliance Matrix Tool ("SpecMatrix").
 * Exactly matches §3 of compliance-matrix-tool-build-prompt.md
 * (+ InternerStandard for the Interne Standards page / Standardabgleich).
 */

export type SegmentType = 'Information' | 'Anforderung' | 'Störtext';

export type Bewertung =
  | 'Offen'            // default after segmentation
  | 'OK'
  | 'OK (Mehrkosten)'
  | 'OK (Ausnahme)'
  | 'Abgelehnt'
  | 'Keine Daten'
  | 'Unklar'
  | 'Nicht Relevant';

export type Abteilung =
  | 'Elektrik'
  | 'Mechanik'
  | 'Software & Steuerung'
  | 'Technologie'
  | 'Vertrieb & Projektierung'
  | 'WICHTIG';

export type SegmentierungsStatus = 'Nicht segmentiert' | 'In Bearbeitung' | 'Segmentiert';

export interface Anfrage {
  id: string;
  name: string;                    // e.g. "Neue Anfrage 9.06.26"
  createdAt: string;
  documents: SpecDocument[];
  deleted?: boolean;               // -> Papierkorb
}

export interface SpecDocument {
  id: string;
  anfrageId: string;
  fileName: string;
  pdfUrl: string;                  // served from /public for the viewer
  pageCount: number;
  version: string;                 // e.g. "C,1"
  segmentierungsStatus: SegmentierungsStatus;
  segments: Segment[];
  uploadedAt: string;
}

/** Highlight rectangle in % of page width/height. */
export interface HighlightBox { page: number; x: number; y: number; w: number; h: number; }

export interface Segment {
  id: string;
  nr: number;                      // running # within the document (column "#")
  kapitel: string;                 // e.g. "1.1.9 Umweltschutz"
  text: string;                    // extracted text; tables stored as simple HTML <table>
  contentType: 'text' | 'table';
  page: number;                    // source page in the PDF
  highlights: HighlightBox[];
  typ: SegmentType;
  bewertung: Bewertung;
  abteilungen: Abteilung[];
  kommentarOeffentlich: string;
  kommentarIntern: string;
  kommentarKunde: string;
  rueckmeldungKunde: string;
  mehrkosten: string;
  artikelnummern: string;
  ki?: {
    suggestedTyp?: SegmentType;
    suggestedAbteilungen?: Abteilung[];
    suggestedBewertung?: Bewertung;
    matchedChecklistItem?: string;
    confidence?: number;           // 0..1
    historienTreffer?: { anfrageName: string; bewertung: Bewertung; kommentar: string };
    standardKonflikt?: string;
  };
  versionDiff?: { status: 'neu' | 'geändert' | 'entfernt' | 'unverändert'; oldText?: string };
  historie: HistoryEntry[];
}

export interface HistoryEntry {
  timestamp: string;
  user: string;
  field: string;                   // "Bewertung", "Kommentar (intern)", ...
  oldValue: string;
  newValue: string;
}

export interface Checkliste {
  id: string;
  name: string;
  items: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  regel: string;                   // rule / check criterion (keywords)
  zielAbteilung?: Abteilung;
  aktiv: boolean;
}

export interface InternerStandard {
  id: string;
  name: string;
  version: string;
  uploadedAt: string;
  keywords: string[];              // used by the mock Standardabgleich
}
