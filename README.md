# SpecMatrix — Compliance Matrix Tool

A single-page React application for requirements engineering / compliance
matrix generation: upload customer specification PDFs, segment them, review
every requirement in a PDF split view, assign departments (manually or via
mock AI), and export a filtered, column-configurable Excel compliance matrix.

Built from `compliance-matrix-tool-build-prompt.md` — UI labels are German,
code is English.

## Stack

- React 18 + Vite + TypeScript, `react-router-dom` v6
- Tailwind CSS, lucide-react icons, sonner toasts
- zustand for app state (in-memory Repository — swappable for a REST backend)
- react-pdf (pdf.js) for the PDF viewer incl. highlight overlay
- xlsx-js-style (SheetJS fork) for the Excel export **and** re-import
- All AI features behind the `AiService` interface with mock implementations
  (`src/services/aiService.ts`) — replaceable with a real endpoint

## Getting started

```bash
npm install
npm run generate:fixtures   # creates the placeholder PDFs in public/fixtures/
npm run dev
```

The app ships with fixture data: Anfrage **„Neue Anfrage 9.06.26"** with a
~120-segment BSH Liefervorschrift document, an older **„Anfrage 03.24"** with
completed Bewertungen (found by the Historienabgleich), three AI Checklisten
and two Interne Standards.

## Features

- **Anfragen** list with progress bars, rename, trash (Papierkorb + restore)
- **Documents view** with upload modal, bulk actions, mock segmentation of
  uploaded PDFs (heading/paragraph splitting + requirement heuristic)
- **Segments table** (core screen): live full-text search, 6 combinable
  multi-select filters, live Bewertungsstatus line, chapter separators,
  mini-tables for table segments, pagination
- **Anforderungsdetails split view**: PDF with highlighted segment left,
  editing form right — Schnellbearbeitung / Detailbearbeitung / KI-Ergebnisse /
  Versionsabgleich tabs, Bearbeitungshistorie, unsaved-changes guard,
  merge/split segments, `←`/`→` navigation over the filtered list, `Ctrl+S`
- **Excel export** modal with column selection, segment-type / status /
  department filters, DE/EN labels and color-filled status cells; round-trip
  **Excel import** matching rows by ID
- **AI toolbar actions** (mock, latency-simulated): Zuweisung Abteilungen,
  Standardabgleich, Historienabgleich, SegmentTypeExt, Versionsupdate diff
- **AI Checklisten** CRUD — active items drive the mock department assignment
- **Abteilungen Benachrichtigen** with open counts + mailto links
- Einstellungen: departments, default export language, page size
