/**
 * src/data/fixtures.ts
 * Fixture data for the Compliance Matrix Tool ("SpecMatrix").
 * Companion to compliance-matrix-tool-build-prompt.md (§8).
 *
 * Exports:
 *   fixtureAnfragen         – [0] main demo Anfrage "Neue Anfrage 9.06.26" (~118 segments),
 *                             [1] older "Anfrage 03.24" with completed Bewertungen
 *                             (this is what Historienabgleich finds — texts are shared constants)
 *   fixtureChecklisten      – 3 AI Checklisten incl. items (drive the mock AiService)
 *   fixtureInterneStandards – 2 internal standards with keyword lists (mock Standardabgleich)
 *
 * Segments are generated from compact seeds via buildSegments(), which fills
 * ids, running numbers (#), highlight boxes, defaults, and Bearbeitungshistorie.
 *
 * NOTE: put any placeholder PDFs at public/fixtures/<fileName> so the viewer
 * in the Anforderungsdetails split view has something to render.
 */

import type {
  Abteilung,
  Anfrage,
  Bewertung,
  Checkliste,
  HistoryEntry,
  InternerStandard,
  Segment,
  SegmentType,
  SpecDocument,
} from '../types';

/* ------------------------------------------------------------------ */
/* Seed format + builder                                               */
/* ------------------------------------------------------------------ */

interface Seed {
  k: string;                 // kapitel
  t: string;                 // text (plain text, or HTML <table> when table: true)
  typ?: SegmentType;         // default 'Anforderung'
  b?: Bewertung;             // default 'Offen'
  abt?: Abteilung[];         // assigned departments
  komO?: string;             // Kommentar (öffentlich)
  komI?: string;             // Kommentar (intern)
  komK?: string;             // Kommentar Kunde
  rueck?: string;            // Rückmeldung vom Kunden
  mk?: string;               // Mehrkosten
  art?: string;              // Artikelnummer(n)
  table?: boolean;           // contentType 'table'
  page?: number;             // jump to a new source page; otherwise keep current
  ki?: Segment['ki'];        // pre-filled KI-Ergebnisse
  vd?: Segment['versionDiff'];
}

const USER = 'Max Mustermann';
const BASE_TIME = new Date('2026-06-10T08:30:00Z').getTime();

function ts(minutesAfterBase: number): string {
  return new Date(BASE_TIME + minutesAfterBase * 60_000).toISOString();
}

/** Rough highlight height in % of page height, based on text length. */
function estHeightPct(text: string, isTable: boolean): number {
  if (isTable) return 18;
  const lines = Math.max(1, Math.ceil(text.length / 95));
  return Math.min(28, 2 + lines * 2.4);
}

function buildSegments(docPrefix: string, seeds: Seed[]): Segment[] {
  let page = 1;
  let yCursor = 12;

  return seeds.map((s, i) => {
    const nr = i + 1;
    if (s.page && s.page !== page) {
      page = s.page;
      yCursor = 12;
    }
    const h = estHeightPct(s.t, !!s.table);
    if (yCursor + h > 92) yCursor = 12; // wrap within the page (mock geometry)
    const highlight = { page, x: 8, y: yCursor, w: 84, h };
    yCursor += h + 2;

    const bewertung: Bewertung = s.b ?? 'Offen';

    const historie: HistoryEntry[] = [];
    if (bewertung !== 'Offen') {
      historie.push({
        timestamp: ts(nr * 7),
        user: USER,
        field: 'Bewertung',
        oldValue: 'Offen',
        newValue: bewertung,
      });
    }
    if (s.komI) {
      historie.push({
        timestamp: ts(nr * 7 + 2),
        user: USER,
        field: 'Kommentar (intern)',
        oldValue: '',
        newValue: s.komI,
      });
    }
    if (s.mk) {
      historie.push({
        timestamp: ts(nr * 7 + 3),
        user: USER,
        field: 'Mehrkosten',
        oldValue: '',
        newValue: s.mk,
      });
    }

    return {
      id: `${docPrefix}-${String(nr).padStart(3, '0')}`,
      nr,
      kapitel: s.k,
      text: s.t,
      contentType: s.table ? 'table' : 'text',
      page,
      highlights: [highlight],
      typ: s.typ ?? 'Anforderung',
      bewertung,
      abteilungen: s.abt ?? [],
      kommentarOeffentlich: s.komO ?? '',
      kommentarIntern: s.komI ?? '',
      kommentarKunde: s.komK ?? '',
      rueckmeldungKunde: s.rueck ?? '',
      mehrkosten: s.mk ?? '',
      artikelnummern: s.art ?? '',
      ki: s.ki,
      versionDiff: s.vd,
      historie,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Table segments (stored as simple HTML, rendered as mini-tables)     */
/* ------------------------------------------------------------------ */

const T_TITELBLATT = `<table><tbody>
<tr><td>B/S/H/</td><td>Liefervorschrift für Maschinen/Anlagen/Einrichtungen</td><td>5750 0000007063 Rev, Seq: C,1</td></tr>
<tr><td>Delivery Directive</td><td>(MAE)</td><td>Date: 30.01.2015</td></tr>
</tbody></table>`;

const T_AENDERUNGSVERLAUF = `<table><thead>
<tr><th>Änderungsverlauf Liefervorschrift</th><th>Version</th><th>Datum</th><th>Kapitel</th></tr>
</thead><tbody>
<tr><td>Erstellung</td><td>A.2</td><td>26.03.2012</td><td>-</td></tr>
<tr><td>Tabelle 1 „Gesetzliche Vorschriften und Normen" ergänzt und in Anhang A1 umgewandelt – Nummerierung der restlichen Anhänge angepasst</td><td>A.3</td><td>03.04.2012</td><td>1.1.3</td></tr>
<tr><td>Tabelle „Komponentenfreigabe Elektro" Stand: 26.03.2012 ersetzt durch neue Version Stand: 18.12.2014</td><td>B.1</td><td>14.01.2015</td><td>Anhang A.7</td></tr>
<tr><td>Änderungen der Firmen- und Gruppenbezeichnungen wegen Umfirmierung der BSH zum 09.02.2015</td><td>C.1</td><td>30.01.2015</td><td>Einleitung</td></tr>
</tbody></table>`;

const T_VERZEICHNIS = `<table><tbody>
<tr><td>A.</td><td>Anhang</td><td>93</td></tr>
<tr><td colspan="3">Abbildungsverzeichnis</td></tr>
<tr><td>Abbildung</td><td>1: Manometer mit einstellbarem Skalenbereich</td><td>75</td></tr>
<tr><td>Abbildung</td><td>2: Kennzeichnung von Hydraulikschläuchen</td><td>89</td></tr>
<tr><td>Abbildung</td><td>3: Weg-Schritt-Diagramm</td><td>104</td></tr>
<tr><td colspan="3">Tabellenverzeichnis</td></tr>
<tr><td>Tabelle</td><td>1: Farbkonzept Anlage (Stand: Febr. 2012)</td><td>12</td></tr>
<tr><td>Tabelle</td><td>2: Farbkonzept Rohrleitungen (Stand: Febr. 2012)</td><td>13</td></tr>
<tr><td>Tabelle</td><td>3: Farbkonzept Signalleuchten (Stand: Febr. 2012)</td><td>13</td></tr>
</tbody></table>`;

const T_FARBKONZEPT = `<table><thead>
<tr><th>Medium</th><th>Farbe</th><th>RAL</th></tr>
</thead><tbody>
<tr><td>Wasser</td><td>Grün</td><td>RAL 6018</td></tr>
<tr><td>Druckluft</td><td>Blau</td><td>RAL 5015</td></tr>
<tr><td>Hydrauliköl</td><td>Braun</td><td>RAL 8001</td></tr>
<tr><td>Vakuum</td><td>Grau</td><td>RAL 7040</td></tr>
</tbody></table>`;

const T_KOMPONENTEN_ELEKTRO = `<table><thead>
<tr><th>Kategorie</th><th>Freigegebene Hersteller</th></tr>
</thead><tbody>
<tr><td>Sensorik</td><td>Sick, ifm</td></tr>
<tr><td>Antriebstechnik</td><td>SEW, Lenze</td></tr>
<tr><td>Steuerungstechnik</td><td>Siemens</td></tr>
<tr><td>Sicherheitstechnik</td><td>Pilz, Siemens</td></tr>
</tbody></table>`;

/* ------------------------------------------------------------------ */
/* Shared requirement texts (identical in the older Anfrage, so that   */
/* Historienabgleich finds exact matches)                              */
/* ------------------------------------------------------------------ */

const TXT_BETRIEBSSTOFFE =
  'Es sind Hilfs- und Betriebsstoffe zu verwenden, die in der Freigabeliste des Auftraggebers (Anhang A.4) enthalten sind. Abweichungen sind vor Verwendung schriftlich freigeben zu lassen.';
const TXT_UNDICHTIGKEITEN =
  'Auftretende Undichtigkeiten müssen schnell und sicher erkannt und beseitigt werden können. Kontroll- und Wartungsstellen sind gut zugänglich anzuordnen.';
const TXT_TROPFWANNEN =
  'Behälter von wassergefährdenden Stoffen müssen doppelwandig ausgeführt sein. Für Filter, Pumpen, Führungen usw. sind geeignete Tropf- und Auffangwannen für Tropf- u. Spritzmengen unter allen kritischen Bereichen wie Ventilblöcken vorzusehen.';
const TXT_LAERM =
  'Ein max. Lärmpegel von 80 dB (A) darf am Arbeitsplatz nicht überschritten werden. Angaben zum geforderten, auftragsspezifischen Lärmpegel werden im Lastenheft getroffen.';
const TXT_ASBEST =
  'Asbesthaltige Materialien sind grundsätzlich nicht zulässig.';
const TXT_VERBRAUCHSWERTE =
  'Die für die Erfassung der Verbrauchswerte erforderlichen Messeinrichtungen (Strom, Druckluft, Wasser) sind vorzusehen und an zentraler Stelle auflegbar auszuführen.';
const TXT_ENERGIE_BEDARF =
  'Aus Energiespargründen müssen die Maschine/masch. Anlage so beschaffen sein, dass nur dann Energien genutzt werden, wenn man sie auch benötigt.';
const TXT_THERMOSTATE =
  'Lüfter und Kühlungen für Schaltschränke werden über Thermostate betrieben.';
const TXT_S7 =
  'Als Steuerung ist eine Siemens SIMATIC S7-1500 einzusetzen. Die Projektierung erfolgt in der jeweils vom Auftraggeber freigegebenen Version des TIA Portals.';
const TXT_PROGRAMMIERRICHTLINIE =
  'Die SPS-Programmierung hat nach der Programmierrichtlinie des Auftraggebers zu erfolgen. Die Bausteinbibliothek des Auftraggebers ist zu verwenden.';
const TXT_ERSATZTEILE_10J =
  'Die Ersatzteilversorgung ist für einen Zeitraum von mindestens 10 Jahren ab Endabnahme sicherzustellen.';

/* ------------------------------------------------------------------ */
/* Document 1 — bsh_liefervorschriften_Auszug250414_50_A19.pdf         */
/* ~118 segments across chapters 1.1.x – 1.6 + Anhang                  */
/* ------------------------------------------------------------------ */

const bshSeeds: Seed[] = [
  // ---------- Titelblock / Einleitung (pages 1–4) ----------
  { page: 1, k: 'B/S/H Titelblatt', t: T_TITELBLATT, typ: 'Information', table: true },
  {
    page: 2, k: 'Einleitung', typ: 'Information',
    t: 'Allgemeine Liefervorschrift für Maschinen, Anlagen und Fertigungseinrichtungen (MAE)\n\nEinleitung:\n\nDer Produktbereich Kochen (PCG) der BSH Hausgeräte Gruppe hat im Rahmen ihrer Standardisierungsaktivitäten diese gemeinsame Liefervorschrift bezüglich der Anforderungen aus Instandhaltungssicht bei der Beschaffung und Änderung von MAE erstellt.',
  },
  { page: 3, k: 'Änderungsverlauf', t: T_AENDERUNGSVERLAUF, typ: 'Information', table: true },
  { page: 4, k: 'Verzeichnisse', t: T_VERZEICHNIS, typ: 'Information', table: true },

  // ---------- 1.1.1 Allgemeines (page 7) ----------
  {
    page: 7, k: '1.1.1 Allgemeines', b: 'Unklar',
    t: 'Der Auftragnehmer verpflichtet sich, diese Liefervorschrift einzuhalten. Abweichungen von der Liefervorschrift, die nicht schriftlich genehmigt wurden, müssen in kürzester Frist vom Auftragnehmer kostenlos geändert werden oder werden gegebenenfalls vom Auftraggeber zu seinen Lasten geändert. Dieses gilt auch für Abweichungen, die erst nach der Abnahme festgestellt werden.',
  },
  {
    k: '1.1.1 Allgemeines', b: 'Unklar',
    t: 'Geräte und Betriebsmittel, die nicht in den Lieferantenfreigabelisten bzw. Komponentenlisten im Anhang dieser Liefervorschrift aufgeführt sind, dürfen nur mit Zustimmung des Auftraggebers verwendet werden. Geräte und Betriebsmittel sind im Originalzustand zu verwenden.',
  },
  {
    // Segment #7 on page 7 — the anchor example from the reference screenshots.
    k: '1.1.1 Allgemeines', typ: 'Information',
    t: 'Die Projektleitung steht als Ansprechpartner bezüglich Rückfragen zu dieser Liefervorschrift zur Verfügung und stellt ggf. den Kontakt zum zuständigen Instandhaltungsmitarbeiter her.',
  },
  {
    k: '1.1.1 Allgemeines', b: 'OK',
    t: 'Der Auftragnehmer hat den Stand der Technik zum Zeitpunkt der Bestellung zu berücksichtigen und sich zu vergewissern, dass er alle Gesetze, Normen und Richtlinien in der neuesten Fassung beachtet.',
  },
  {
    k: '1.1.1 Allgemeines', b: 'OK', abt: ['Technologie'],
    t: 'Insbesondere müssen die EG-Richtlinien eingehalten werden. Der Auftragnehmer muss die CE-Konformitätsbewertung nach Maschinenrichtlinie durchführen, eine vollständige technische Dokumentation liefern, die Konformitätserklärung erstellen und die CE-Kennzeichnung an der Maschine anbringen.',
  },
  {
    k: '1.1.1 Allgemeines', b: 'OK',
    t: 'Die Risikobeurteilung gehört zum Lieferumfang und ist dem Auftraggeber spätestens zur Endabnahme auszuhändigen.',
  },
  {
    k: 'Seitenfuß', typ: 'Störtext',
    t: 'Urheberrechtlich geschützt. Jede Vervielfältigung oder sonstige Nutzung bedarf der vorherigen schriftlichen Zustimmung. Status: Released',
  },

  // ---------- 1.1.2 Geltungsbereich (page 8) ----------
  {
    page: 8, k: '1.1.2 Geltungsbereich', typ: 'Information',
    t: 'Diese Liefervorschrift gilt grundsätzlich bei Neubeschaffungen, Umbauten bzw. Erweiterungen alter Anlagen und Maschinen.',
  },
  {
    k: '1.1.2 Geltungsbereich', typ: 'Information',
    t: 'Für Serienmaschinen kann die Liefervorschrift in Abstimmung mit dem Auftraggeber in Teilen angepasst werden. Abweichungen sind im Angebot auszuweisen.',
  },
  {
    k: '1.1.2 Geltungsbereich',
    t: 'Bei Widersprüchen zwischen Lastenheft und dieser Liefervorschrift ist der Auftraggeber unverzüglich schriftlich zu informieren.',
  },

  // ---------- 1.1.3 Gesetzliche Vorschriften und Normen (page 9) ----------
  {
    page: 9, k: '1.1.3 Gesetzliche Vorschriften und Normen', b: 'OK', abt: ['Technologie'],
    t: 'Die Maschine/maschinelle Anlage muss der EG-Maschinenrichtlinie 2006/42/EG in der jeweils gültigen Fassung entsprechen.',
  },
  {
    k: '1.1.3 Gesetzliche Vorschriften und Normen', b: 'OK', abt: ['Elektrik'],
    t: 'Die Niederspannungsrichtlinie 2014/35/EU sowie die EMV-Richtlinie 2014/30/EU sind einzuhalten.',
  },
  {
    k: '1.1.3 Gesetzliche Vorschriften und Normen', b: 'Unklar', abt: ['Technologie'],
    t: 'Die Risikobeurteilung ist nach DIN EN ISO 12100 durchzuführen und zu dokumentieren.',
    ki: { suggestedAbteilungen: ['Technologie'], suggestedBewertung: 'Unklar', matchedChecklistItem: 'Verweist auf externe Norm (DIN/ISO/EN)', confidence: 0.86 },
  },
  {
    k: '1.1.3 Gesetzliche Vorschriften und Normen', b: 'OK', abt: ['Elektrik'],
    t: 'Die elektrische Ausrüstung ist nach DIN EN 60204-1 auszuführen.',
  },
  {
    k: '1.1.3 Gesetzliche Vorschriften und Normen', b: 'Unklar',
    t: 'Die Anforderungen der Betriebssicherheitsverordnung (BetrSichV) und der Arbeitsstättenverordnung (ArbStättV) sind zu berücksichtigen.',
  },
  {
    k: '1.1.3 Gesetzliche Vorschriften und Normen', typ: 'Information',
    t: 'Eine vollständige Übersicht der anzuwendenden gesetzlichen Vorschriften und Normen ist in Anhang A1 enthalten.',
  },

  // ---------- 1.1.4 Dokumentation (pages 10–11) ----------
  {
    page: 10, k: '1.1.4 Dokumentation', b: 'OK',
    t: 'Die Betriebsanleitung ist in deutscher Sprache zweifach in Papierform sowie digital als PDF zu liefern.',
  },
  {
    k: '1.1.4 Dokumentation', b: 'Keine Daten',
    t: 'Ersatzteillisten sind mit Herstellerangaben, Typbezeichnungen und Artikelnummern zu liefern. Eigenfertigungsteile sind mit Zeichnung auszuweisen.',
  },
  {
    k: '1.1.4 Dokumentation', b: 'OK', abt: ['Elektrik'],
    t: 'Schaltpläne sind nach DIN EN 81346 zu erstellen und im EPLAN-P8-Format sowie als PDF zu übergeben.',
  },
  {
    k: '1.1.4 Dokumentation', b: 'Keine Daten',
    t: 'Wartungspläne mit Intervallen, Tätigkeiten und Schmierstoffangaben sind Bestandteil der Dokumentation.',
  },
  {
    k: '1.1.4 Dokumentation', b: 'Unklar', abt: ['Software & Steuerung'],
    t: 'SPS- und HMI-Programme sind dokumentiert und als offener Quellcode zu übergeben. Know-how-Schutzbausteine sind nur nach schriftlicher Freigabe zulässig.',
    ki: { suggestedAbteilungen: ['Software & Steuerung'], suggestedBewertung: 'Unklar', matchedChecklistItem: 'Dokumentation / Unterlagen gefordert', confidence: 0.74 },
  },
  {
    k: '1.1.4 Dokumentation',
    t: 'Die vollständige Dokumentation ist spätestens zur Vorabnahme bereitzustellen.',
  },
  {
    k: '1.1.4 Dokumentation', b: 'Abgelehnt',
    komO: 'Dokumentation wird im Standardumfang in Deutsch und Englisch geliefert; weitere Landessprachen nur gegen gesonderte Beauftragung.',
    t: 'Die Dokumentation ist zusätzlich in den Landessprachen aller Exportwerke des Auftraggebers zu liefern.',
  },
  {
    k: '1.1.4 Dokumentation', vd: { status: 'entfernt' },
    komI: 'Anforderung in Version C,1 entfernt (Datenträgerübergabe entfällt).',
    t: 'Die Dokumentation ist zusätzlich auf einem Datenträger (CD-ROM) zu übergeben.',
  },
  {
    page: 11, k: 'Seitenkopf', typ: 'Störtext',
    t: 'Liefervorschrift MAE · 5750 0000007063 · Rev. C,1 · Seite 11 von 50',
  },

  // ---------- 1.1.5 Abnahme (page 12) ----------
  {
    page: 12, k: '1.1.5 Abnahme', typ: 'Information',
    t: 'Die Abnahme erfolgt in zwei Stufen: Vorabnahme beim Auftragnehmer und Endabnahme beim Auftraggeber.',
  },
  {
    k: '1.1.5 Abnahme', b: 'OK',
    t: 'Die Vorabnahme ist dem Auftraggeber mindestens zwei Wochen im Voraus schriftlich anzukündigen.',
  },
  {
    k: '1.1.5 Abnahme', b: 'Unklar',
    vd: { status: 'geändert', oldText: 'Im Rahmen der Endabnahme ist ein Leistungsnachweis über 8 Stunden bei Nennleistung zu erbringen.' },
    t: 'Im Rahmen der Endabnahme ist ein Leistungsnachweis über 24 Stunden bei Nennleistung zu erbringen.',
  },
  {
    k: '1.1.5 Abnahme',
    t: 'Bei der Vorabnahme festgestellte Mängel sind zu protokollieren und vor der Endabnahme zu beseitigen.',
  },

  // ---------- 1.1.6 Ersatzteile (page 13) ----------
  {
    page: 13, k: '1.1.6 Ersatzteile', b: 'Keine Daten', abt: ['Vertrieb & Projektierung'],
    t: 'Mit dem Angebot ist eine Verschleiß- und Ersatzteilliste mit Preisen für einen Betrieb von zwei Jahren einzureichen.',
  },
  {
    k: '1.1.6 Ersatzteile', b: 'Unklar',
    t: TXT_ERSATZTEILE_10J,
    ki: { historienTreffer: { anfrageName: 'Anfrage 03.24', bewertung: 'Abgelehnt', kommentar: 'Zusage nur über 7 Jahre möglich.' } },
  },
  {
    k: '1.1.6 Ersatzteile',
    t: 'Sonder- und Eigenfertigungsteile sind in den Ersatzteillisten gesondert zu kennzeichnen.',
  },

  // ---------- 1.1.7 Schulung (page 14) ----------
  {
    page: 14, k: '1.1.7 Schulung', b: 'OK (Mehrkosten)', mk: '950',
    komI: 'Zusätzlicher Schulungstag für Instandhaltung angeboten (Angebot Pos. 3.1).',
    t: 'Eine Schulung des Bedien- und Instandhaltungspersonals im Werk des Auftraggebers gehört zum Lieferumfang.',
  },
  {
    k: '1.1.7 Schulung', b: 'OK',
    t: 'Schulungsunterlagen sind in deutscher Sprache bereitzustellen und dem Auftraggeber digital zu übergeben.',
  },

  // ---------- 1.1.8 Arbeitssicherheit (pages 15–16) ----------
  {
    page: 15, k: '1.1.8 Arbeitssicherheit', b: 'OK', abt: ['Elektrik'],
    t: 'Not-Halt-Einrichtungen sind nach DIN EN ISO 13850 auszuführen und an allen Bedienstellen vorzusehen.',
  },
  {
    k: '1.1.8 Arbeitssicherheit', b: 'OK', abt: ['Mechanik'],
    t: 'Trennende Schutzeinrichtungen sind nach DIN EN ISO 14120 auszuführen; Sicherheitsabstände nach DIN EN ISO 13857 sind einzuhalten.',
  },
  {
    k: '1.1.8 Arbeitssicherheit', b: 'Unklar', abt: ['Software & Steuerung', 'WICHTIG'],
    t: 'Sicherheitsrelevante Steuerungsfunktionen sind mindestens in Performance Level d nach DIN EN ISO 13849-1 auszuführen. Der Nachweis ist mit SISTEMA zu erbringen.',
    ki: { suggestedAbteilungen: ['Technologie'], suggestedBewertung: 'Unklar', matchedChecklistItem: 'Verweist auf externe Norm (DIN/ISO/EN)', confidence: 0.8 },
  },
  {
    k: '1.1.8 Arbeitssicherheit', b: 'Keine Daten',
    t: 'Wartungs- und Instandhaltungsarbeiten müssen gefahrlos möglich sein. Energien müssen freischaltbar und gegen Wiedereinschalten sicherbar sein (LOTO).',
  },
  {
    k: '1.1.8 Arbeitssicherheit',
    t: 'Arbeitsbühnen und Podeste sind mit Absturzsicherungen nach DIN EN ISO 14122 auszuführen.',
  },
  {
    page: 16, k: '1.1.8 Arbeitssicherheit', typ: 'Information',
    t: 'Bei Arbeiten im Werk des Auftraggebers gilt die jeweils gültige Werksordnung einschließlich der Sicherheitsunterweisung.',
  },
  {
    k: 'Seitenfuß', typ: 'Störtext',
    t: 'Urheberrechtlich geschützt. Jede Vervielfältigung oder sonstige Nutzung bedarf der vorherigen schriftlichen Zustimmung. Status: Released',
  },

  // ---------- 1.1.9 Umweltschutz (pages 17–18) ----------
  { page: 17, k: '1.1.9 Umweltschutz', b: 'Keine Daten', t: TXT_BETRIEBSSTOFFE },
  {
    k: '1.1.9 Umweltschutz', b: 'Unklar',
    komK: 'Sicherheitsdatenblätter werden nachgereicht.',
    t: 'Bei Verwendung von wassergefährdenden Stoffen müssen die Anforderungen des Wasserhaushaltsgesetzes (WHG) und die „Verordnung über Anlagen zum Umgang mit wassergefährdenden Stoffen und über Fachbetriebe" (Anlagenverordnung AwSV) eingehalten werden.',
  },
  {
    k: '1.1.9 Umweltschutz', b: 'Unklar',
    t: 'Die Maschine/maschinelle Anlage muss so beschaffen sein, dass sie gegen die zu erwartenden mechanischen, thermischen und chemischen Einflüsse hinreichend widerstandsfähig ist.',
  },
  { k: '1.1.9 Umweltschutz', b: 'Unklar', t: TXT_UNDICHTIGKEITEN },
  { k: '1.1.9 Umweltschutz', b: 'Keine Daten', t: TXT_TROPFWANNEN },
  {
    page: 18, k: '1.1.9 Umweltschutz', typ: 'Information',
    t: 'Zu beachten: Das Werk FBH-Bretten befindet sich in der Wasserschutzzone III.',
  },
  { k: '1.1.9 Umweltschutz', typ: 'Information', t: 'Lärm' },
  {
    k: '1.1.9 Umweltschutz', b: 'OK (Mehrkosten)', mk: '1.850', abt: ['Mechanik'],
    komO: 'Einhaltung nur mit zusätzlicher Schallschutzhaube möglich – siehe Mehrkosten.',
    komI: 'Schallschutzhaube erforderlich, Angebot Pos. 4.2.',
    t: TXT_LAERM,
  },
  { k: '1.1.9 Umweltschutz', typ: 'Information', t: 'Gefahrstoffe' },
  { k: '1.1.9 Umweltschutz', b: 'OK', t: TXT_ASBEST },

  // ---------- 1.1.10 Energieeinsparung (page 19) ----------
  { page: 19, k: '1.1.10 Energieeinsparung', b: 'Keine Daten', t: TXT_VERBRAUCHSWERTE },
  { k: '1.1.10 Energieeinsparung', b: 'Unklar', t: TXT_ENERGIE_BEDARF },
  { k: 'Beispiele:', b: 'OK', t: TXT_THERMOSTATE },
  { k: 'Beispiele:', b: 'Unklar', t: 'Reinigungsdüsen blasen nur dann, wenn auch ein Werkstückträger dort steht.' },
  { k: 'Beispiele:', b: 'Unklar', t: 'Bänder oder Kettenförderer laufen nur dann, wenn auch Teile angefordert werden.' },

  // ---------- 1.1.11 Verpackung und Entsorgung (page 20) ----------
  {
    page: 20, k: '1.1.11 Verpackung und Entsorgung',
    t: 'Für den Transport sind bevorzugt Mehrwegverpackungen einzusetzen. Ein Entsorgungskonzept für Einwegverpackungen ist vorzulegen.',
  },
  {
    k: '1.1.11 Verpackung und Entsorgung', b: 'Abgelehnt',
    komO: 'Die Erstbefüllung mit Betriebsstoffen erfolgt bauseits durch den Auftraggeber.',
    t: 'Die Erstbefüllung aller Aggregate mit Betriebsstoffen gehört zum Lieferumfang des Auftragnehmers.',
  },

  // ---------- 1.2 Mechanik (pages 21–28) ----------
  { page: 21, k: 'Seitenkopf', typ: 'Störtext', t: 'Liefervorschrift MAE · 5750 0000007063 · Rev. C,1 · Seite 21 von 50' },
  {
    k: '1.2.1 Konstruktion', b: 'OK',
    t: 'Die Konstruktion ist in 3D-CAD zu erstellen. Die Daten sind im STEP-Format sowie im nativen Format des abgestimmten CAD-Systems zu übergeben.',
  },
  {
    k: '1.2.1 Konstruktion', b: 'Unklar',
    t: 'Schweißkonstruktionen sind spannungsarm zu glühen, sofern nachfolgende Bearbeitungen dies erfordern.',
  },
  {
    k: '1.2.1 Konstruktion', b: 'Unklar', abt: ['Mechanik'],
    t: 'Verschleißteile müssen ohne Sonderwerkzeug in weniger als 30 Minuten tauschbar sein. Die Zugänglichkeit für Instandhaltungsarbeiten ist konstruktiv sicherzustellen.',
  },
  {
    k: '1.2.1 Konstruktion',
    t: 'Es sind bevorzugt Normteile nach DIN/ISO einzusetzen. Sonderteile sind auf ein Minimum zu beschränken.',
  },
  {
    k: '1.2.1 Konstruktion', b: 'Abgelehnt',
    komO: 'Herstellerbindung wird abgelehnt; es wird ein gleichwertiges Standard-Profilsystem eingesetzt.',
    rueck: 'Abweichung wird vom Auftraggeber geprüft.',
    t: 'Für Schutzumhausungen und Gestelle sind ausschließlich Systemprofile des Herstellers item zu verwenden.',
  },
  {
    k: '1.2.1 Konstruktion', b: 'OK (Ausnahme)',
    komO: 'Ausnahme: Grundrahmen in lackiertem Stahl gemäß Abstimmung vom 12.05. freigegeben.',
    t: 'Alle produktberührten Teile sind in Edelstahl 1.4301 oder höherwertig auszuführen.',
  },
  {
    page: 24, k: '1.2.2 Farbkonzept', b: 'OK', abt: ['Mechanik'],
    t: 'Die Anlagenfarbe ist RAL 7035 (lichtgrau). Bewegte Teile und Gefahrenstellen sind in RAL 1003 (signalgelb) auszuführen (siehe Tabelle 1).',
  },
  { k: '1.2.2 Farbkonzept', t: T_FARBKONZEPT, typ: 'Information', table: true },
  {
    k: '1.2.2 Farbkonzept', b: 'Keine Daten',
    t: 'Rohrleitungen sind nach DIN 2403 entsprechend dem Durchflussmedium zu kennzeichnen (siehe Tabelle 2).',
  },
  {
    page: 25, k: '1.2.3 Pneumatik',
    t: 'Pneumatikkomponenten sind gemäß Komponentenfreigabe (Festo, SMC) einzusetzen.',
  },
  {
    k: '1.2.3 Pneumatik', b: 'Unklar',
    t: 'Jede Anlage erhält eine absperr- und abschließbare Wartungseinheit mit Druckminderer und Manometer mit einstellbarem Skalenbereich (siehe Abbildung 1).',
  },
  {
    k: '1.2.3 Pneumatik', b: 'OK (Ausnahme)',
    komO: 'Ausnahme für Ölgehaltsklasse gemäß Abstimmung vom 03.06. freigegeben.',
    t: 'Der maximale Betriebsdruck beträgt 6 bar. Die Druckluftqualität ist nach ISO 8573-1 Klasse 1:4:1 auszulegen.',
  },
  {
    k: '1.2.3 Pneumatik', b: 'Keine Daten',
    t: 'Die Verschlauchung ist farblich zu codieren und an beiden Enden dauerhaft zu beschriften.',
  },
  {
    page: 27, k: '1.2.4 Hydraulik', b: 'Unklar',
    t: 'Hydraulikschläuche sind mit Herstelldatum zu kennzeichnen und nach Herstellervorgabe auszutauschen (siehe Abbildung 2).',
  },
  {
    k: '1.2.4 Hydraulik',
    t: 'Hydraulikaggregate sind mit einer Auffangwanne von mindestens 110 % des Tankvolumens auszurüsten.',
  },
  {
    k: '1.2.4 Hydraulik', b: 'Nicht Relevant',
    komI: 'Anlage wird ohne Hydraulik ausgeführt.',
    t: 'Es sind bevorzugt biologisch schnell abbaubare Druckflüssigkeiten einzusetzen.',
  },
  { page: 28, k: 'Seitenfuß', typ: 'Störtext', t: 'Urheberrechtlich geschützt. Jede Vervielfältigung oder sonstige Nutzung bedarf der vorherigen schriftlichen Zustimmung. Status: Released' },

  // ---------- 1.3 Elektrik (pages 30–35) ----------
  {
    page: 30, k: '1.3.1 Schaltschrank', b: 'OK', abt: ['Elektrik'], art: 'Rittal AX 1180.000',
    t: 'Schaltschränke sind in Rittal-Ausführung mit einer Schutzart von mindestens IP54 zu liefern.',
  },
  {
    k: '1.3.1 Schaltschrank', b: 'OK (Mehrkosten)', mk: '620', abt: ['Elektrik'],
    komI: 'Kühlgerät statt Filterlüfter erforderlich, Angebot Pos. 5.4.',
    t: 'Bei einer Verlustleistung über 300 W ist eine aktive Schaltschrank-Klimatisierung vorzusehen.',
  },
  {
    k: '1.3.1 Schaltschrank', b: 'Unklar',
    t: 'Im Schaltschrank sind mindestens 20 % Reserveplatz auf Montageplatte und Klemmenleisten vorzuhalten.',
  },
  {
    k: '1.3.1 Schaltschrank',
    t: 'Jeder Schaltschrank erhält eine Innenbeleuchtung sowie eine Servicesteckdose 230 V.',
  },
  {
    k: '1.3.1 Schaltschrank', b: 'OK', abt: ['Elektrik'],
    t: 'Der Hauptschalter ist abschließbar auszuführen und mit den Schaltstellungen 0/I zu kennzeichnen.',
  },
  {
    page: 33, k: '1.3.2 Verkabelung', b: 'Unklar', abt: ['Elektrik'],
    t: 'Aderfarben sind nach DIN EN 60204-1 auszuführen (u. a. schwarz für Hauptstromkreise, dunkelblau für DC-Steuerstromkreise, orange für Fremdspannung).',
  },
  {
    k: '1.3.2 Verkabelung', b: 'Keine Daten',
    t: 'Adern und Kabel sind beidseitig entsprechend dem Schaltplan zu kennzeichnen.',
  },
  {
    k: '1.3.2 Verkabelung', b: 'Unklar',
    t: 'Bewegte Leitungen sind in Energieketten zu führen; eine Platzreserve von 20 % ist vorzusehen.',
  },
  {
    k: '1.3.2 Verkabelung',
    t: 'Leistungs- und Signalleitungen sind getrennt zu verlegen; die EMV-gerechte Installation ist sicherzustellen.',
  },
  {
    page: 35, k: '1.3.3 Komponentenfreigabe Elektro', typ: 'Information',
    t: 'Die Komponentenfreigabe Elektro ist in Anhang A.7 (Stand 18.12.2014) enthalten.',
  },
  {
    k: '1.3.3 Komponentenfreigabe Elektro', b: 'Unklar',
    t: 'Sensorik ist gemäß Freigabeliste der Hersteller Sick oder ifm einzusetzen. Abweichungen bedürfen der Freigabe (siehe Anhang A.7).',
    ki: { suggestedAbteilungen: ['Elektrik'], suggestedBewertung: 'Unklar', matchedChecklistItem: 'Enthält Verweis auf Anhang oder Abbildung', confidence: 0.71 },
  },
  {
    k: '1.3.3 Komponentenfreigabe Elektro', b: 'OK', abt: ['Elektrik'],
    t: 'Frequenzumrichter sind mit PROFINET-Schnittstelle auszuführen.',
    ki: { suggestedAbteilungen: ['Software & Steuerung'], matchedChecklistItem: 'Schnittstelle / OPC UA / PROFINET erwähnt', confidence: 0.77 },
  },

  // ---------- 1.4 Steuerungstechnik (pages 38–44) ----------
  { page: 36, k: 'Seitenkopf', typ: 'Störtext', t: 'Liefervorschrift MAE · 5750 0000007063 · Rev. C,1 · Seite 36 von 50' },
  {
    page: 38, k: '1.4.1 Steuerung (SPS)', b: 'OK', abt: ['Software & Steuerung'], art: '6ES7 515-2AN03-0AB0',
    t: TXT_S7,
  },
  {
    k: '1.4.1 Steuerung (SPS)', b: 'Unklar', abt: ['Software & Steuerung'],
    t: TXT_PROGRAMMIERRICHTLINIE,
    ki: { historienTreffer: { anfrageName: 'Anfrage 03.24', bewertung: 'OK', kommentar: 'Programmierrichtlinie V2.3 wurde umgesetzt.' } },
  },
  {
    k: '1.4.1 Steuerung (SPS)',
    t: 'Symbolik und Kommentare im SPS-Programm sind in deutscher Sprache zu erstellen.',
  },
  {
    k: '1.4.1 Steuerung (SPS)', b: 'Unklar',
    vd: { status: 'geändert', oldText: 'Der Fernwartungszugang erfolgt über einen VPN-Router des Auftragnehmers.' },
    t: 'Der Fernwartungszugang erfolgt ausschließlich über die Standardlösung des Auftraggebers (mGuard). Eigene Fernwartungszugänge des Auftragnehmers sind unzulässig.',
  },
  {
    k: '1.4.1 Steuerung (SPS)', b: 'OK', abt: ['Software & Steuerung', 'WICHTIG'],
    t: 'Sicherheitsfunktionen sind über eine fehlersichere Steuerung (F-SPS) zu realisieren.',
  },
  {
    page: 41, k: '1.4.2 Bedienoberfläche (HMI)',
    t: 'Als Bediengerät ist ein Siemens Comfort Panel mit mindestens 12 Zoll Bildschirmdiagonale einzusetzen.',
  },
  {
    k: '1.4.2 Bedienoberfläche (HMI)', b: 'Keine Daten',
    t: 'Die Bediensprachen Deutsch und Englisch müssen zur Laufzeit umschaltbar sein.',
  },
  {
    k: '1.4.2 Bedienoberfläche (HMI)', b: 'Keine Daten',
    t: 'Störmeldungen sind im Klartext mit Zeitstempel anzuzeigen und müssen quittierbar sein. Eine Meldehistorie ist vorzusehen.',
  },
  {
    k: '1.4.2 Bedienoberfläche (HMI)', b: 'Unklar',
    t: 'Die Benutzerverwaltung ist mit mindestens drei Berechtigungsebenen (Bediener, Einrichter, Instandhaltung) auszuführen.',
  },
  {
    page: 43, k: '1.4.3 Schnittstellen und Datenerfassung', b: 'Unklar', abt: ['Software & Steuerung', 'WICHTIG'],
    vd: { status: 'neu' },
    t: 'Die Anlage ist über OPC UA an das MES des Auftraggebers anzubinden. Das Informationsmodell wird vom Auftraggeber bereitgestellt.',
    ki: {
      suggestedAbteilungen: ['Software & Steuerung'],
      suggestedBewertung: 'Unklar',
      matchedChecklistItem: 'Schnittstelle / OPC UA / PROFINET erwähnt',
      confidence: 0.9,
      standardKonflikt: 'Werksnorm WN-S-04: OPC-UA-Server gemäß Informationsmodell V1.2 gefordert.',
    },
  },
  {
    k: '1.4.3 Schnittstellen und Datenerfassung', b: 'OK (Mehrkosten)', mk: '2.400',
    komI: 'Zusätzliche Messtechnik für Strom und Druckluft erforderlich, Angebot Pos. 6.2.',
    t: 'Energiedaten (Strom, Druckluft) sind messtechnisch zu erfassen und über OPC UA bereitzustellen.',
  },
  {
    k: '1.4.3 Schnittstellen und Datenerfassung',
    t: 'Für die Ablaufsteuerung ist ein Weg-Schritt-Diagramm zu liefern (siehe Abbildung 3).',
  },
  { page: 44, k: 'Seitenfuß', typ: 'Störtext', t: 'Urheberrechtlich geschützt. Jede Vervielfältigung oder sonstige Nutzung bedarf der vorherigen schriftlichen Zustimmung. Status: Released' },

  // ---------- 1.5 / 1.6 / Anhang (pages 45–50) ----------
  {
    page: 45, k: '1.5 Kennzeichnung', b: 'Unklar',
    t: 'An der Maschine ist ein Typenschild mit CE-Kennzeichnung, Baujahr, Seriennummer und Herstellerangaben anzubringen.',
  },
  {
    k: '1.5 Kennzeichnung', b: 'Keine Daten',
    t: 'Die vom Auftraggeber vergebene Anlagen-Nummer ist gut sichtbar an der Anlage anzubringen.',
  },
  {
    k: '1.5 Kennzeichnung',
    t: 'Warn- und Sicherheitskennzeichnungen sind nach ISO 3864 auszuführen.',
  },
  {
    page: 46, k: '1.6 Gewährleistung', typ: 'Information',
    t: 'Die Gewährleistung beträgt 24 Monate ab erfolgreicher Endabnahme.',
  },
  {
    k: '1.6 Gewährleistung', b: 'Unklar', abt: ['Vertrieb & Projektierung'],
    komK: 'Bitte Berechnungsgrundlage der technischen Verfügbarkeit angeben.',
    t: 'Für die Anlage ist eine technische Verfügbarkeit von mindestens 98 % zuzusichern und im Leistungsnachweis zu belegen.',
  },
  {
    k: '1.6 Gewährleistung', b: 'Abgelehnt',
    komO: 'Reaktionszeit 48 h gemäß Standard-Servicevertrag; 24 h nur mit gesondertem Servicepaket möglich.',
    t: 'Im Gewährleistungszeitraum ist eine Service-Reaktionszeit von 24 Stunden sicherzustellen.',
  },
  { page: 47, k: 'Seitenfuß', typ: 'Störtext', t: 'Urheberrechtlich geschützt. Jede Vervielfältigung oder sonstige Nutzung bedarf der vorherigen schriftlichen Zustimmung. Status: Released' },
  {
    page: 48, k: 'Anhang A.1', typ: 'Information',
    t: 'Anhang A.1 enthält die Übersicht der gesetzlichen Vorschriften und Normen.',
  },
  {
    k: 'Anhang A.1',
    t: 'Die Konformität mit den in Anhang A1 gelisteten Normen ist nachzuweisen.',
  },
  { page: 49, k: 'Anhang A.7 Komponentenfreigabe Elektro', t: T_KOMPONENTEN_ELEKTRO, typ: 'Information', table: true },
  {
    k: 'Anhang A.7 Komponentenfreigabe Elektro',
    t: 'Abweichungen von der Komponentenfreigabeliste sind vor Bestellung schriftlich beim Auftraggeber zu beantragen.',
  },
  { page: 50, k: 'Seitenfuß', typ: 'Störtext', t: 'Ende des Auszugs · Seite 50 von 50 · Status: Released' },
];

/* ------------------------------------------------------------------ */
/* Document 2 — older Anfrage (source for Historienabgleich)           */
/* Same texts as above (shared constants), but with completed reviews. */
/* ------------------------------------------------------------------ */

const altSeeds: Seed[] = [
  { page: 5, k: '1.1.9 Umweltschutz', b: 'OK', komI: 'Freigabeliste vollständig abgedeckt.', t: TXT_BETRIEBSSTOFFE },
  { k: '1.1.9 Umweltschutz', b: 'OK', t: TXT_UNDICHTIGKEITEN },
  { k: '1.1.9 Umweltschutz', b: 'OK (Mehrkosten)', mk: '780', komI: 'Zusätzliche Auffangwannen angeboten.', t: TXT_TROPFWANNEN },
  { page: 6, k: '1.1.9 Umweltschutz', b: 'OK', komO: 'Nachweis durch Messprotokoll erbracht.', abt: ['Mechanik'], t: TXT_LAERM },
  { k: '1.1.9 Umweltschutz', b: 'OK', t: TXT_ASBEST },
  { page: 7, k: '1.1.10 Energieeinsparung', b: 'OK', t: TXT_VERBRAUCHSWERTE },
  { k: '1.1.10 Energieeinsparung', b: 'OK', t: TXT_ENERGIE_BEDARF },
  { k: 'Beispiele:', b: 'OK', t: TXT_THERMOSTATE },
  { page: 8, k: '1.1.6 Ersatzteile', b: 'Abgelehnt', komO: 'Zusage nur über 7 Jahre möglich.', abt: ['Vertrieb & Projektierung'], t: TXT_ERSATZTEILE_10J },
  { page: 9, k: '1.4.1 Steuerung (SPS)', b: 'OK', abt: ['Software & Steuerung'], t: TXT_S7 },
  { k: '1.4.1 Steuerung (SPS)', b: 'OK', komI: 'Programmierrichtlinie V2.3 wurde umgesetzt.', abt: ['Software & Steuerung'], t: TXT_PROGRAMMIERRICHTLINIE },
  { page: 10, k: '1.1.8 Arbeitssicherheit', typ: 'Information', t: 'Bei Arbeiten im Werk des Auftraggebers gilt die jeweils gültige Werksordnung einschließlich der Sicherheitsunterweisung.' },
];

/* ------------------------------------------------------------------ */
/* Assembly & exports                                                  */
/* ------------------------------------------------------------------ */

const bshDocument: SpecDocument = {
  id: 'doc-1609',
  anfrageId: 'anf-338',
  fileName: 'bsh_liefervorschriften_Auszug250414_50_A19.pdf',
  pdfUrl: '/fixtures/bsh_liefervorschriften_Auszug250414_50_A19.pdf',
  pageCount: 50,
  version: 'C,1',
  segmentierungsStatus: 'Segmentiert',
  segments: buildSegments('a19', bshSeeds),
  uploadedAt: '2026-06-09T10:12:00.000Z',
};

const altDocument: SpecDocument = {
  id: 'doc-0812',
  anfrageId: 'anf-112',
  fileName: 'mae_liefervorschrift_Auszug240312_A17.pdf',
  pdfUrl: '/fixtures/mae_liefervorschrift_Auszug240312_A17.pdf',
  pageCount: 20,
  version: 'B.2',
  segmentierungsStatus: 'Segmentiert',
  segments: buildSegments('a17', altSeeds),
  uploadedAt: '2024-03-12T09:20:00.000Z',
};

export const fixtureAnfragen: Anfrage[] = [
  { id: 'anf-338', name: 'Neue Anfrage 9.06.26', createdAt: '2026-06-09T10:05:00.000Z', documents: [bshDocument] },
  { id: 'anf-112', name: 'Anfrage 03.24', createdAt: '2024-03-12T09:00:00.000Z', documents: [altDocument] },
];

export const fixtureChecklisten: Checkliste[] = [
  {
    id: 'cl-verweise',
    name: 'Verweise',
    items: [
      { id: 'cli-v1', regel: 'Verweist auf externe Norm (DIN/ISO/EN)', zielAbteilung: 'Technologie', aktiv: true },
      { id: 'cli-v2', regel: 'Enthält Verweis auf Anhang oder Abbildung', aktiv: true },
    ],
  },
  {
    id: 'cl-pm',
    name: 'Projekt-Management',
    items: [
      { id: 'cli-p1', regel: 'Dokumentation / Unterlagen gefordert', aktiv: true },
      { id: 'cli-p2', regel: 'Termin / Frist / Abnahme genannt', zielAbteilung: 'Vertrieb & Projektierung', aktiv: true },
      { id: 'cli-p3', regel: 'Schnittstelle / OPC UA / PROFINET erwähnt', zielAbteilung: 'Software & Steuerung', aktiv: true },
    ],
  },
  {
    id: 'cl-vertrieb',
    name: 'Vertrieb',
    items: [
      { id: 'cli-s1', regel: 'Mehrkosten / Kosten / Preis erwähnt', zielAbteilung: 'Vertrieb & Projektierung', aktiv: true },
      { id: 'cli-s2', regel: 'Gewährleistung / Verfügbarkeit / Liefertermin genannt', zielAbteilung: 'Vertrieb & Projektierung', aktiv: false },
    ],
  },
];

export const fixtureInterneStandards: InternerStandard[] = [
  { id: 'std-1', name: 'Werksnorm Schaltschrankbau WN-E-01', version: '3.2', uploadedAt: '2026-04-14', keywords: ['Schaltschrank', 'IP54', 'Reserveplatz', 'Hauptschalter'] },
  { id: 'std-2', name: 'Werksnorm Steuerungstechnik WN-S-04', version: '2.1', uploadedAt: '2026-05-02', keywords: ['S7-1500', 'TIA Portal', 'PROFINET', 'OPC UA'] },
];
