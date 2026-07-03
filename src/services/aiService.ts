/**
 * AiService (§9.2) — mock implementation with simulated latency.
 * Interface first: a real backend (Azure OpenAI / Copilot Studio /
 * Anthropic API) can be plugged in by swapping this provider file.
 */

import type { Abteilung, Anfrage, Checkliste, InternerStandard, Segment } from '../types';

export interface AiSuggestion {
  segmentId: string;
  suggestedAbteilungen: Abteilung[];
  matchedChecklistItem?: string;
  confidence: number;
}

export interface HistoryHit {
  segmentId: string;
  anfrageName: string;
  bewertung: Segment['bewertung'];
  kommentar: string;
}

export interface StandardConflict {
  segmentId: string;
  konflikt: string;
}

export interface AiService {
  assignDepartments(segments: Segment[], checklisten: Checkliste[]): Promise<AiSuggestion[]>;
  compareToStandards(segments: Segment[], standards: InternerStandard[]): Promise<StandardConflict[]>;
  compareToHistory(segments: Segment[], otherAnfragen: Anfrage[]): Promise<HistoryHit[]>;
}

const KEYWORD_MAP: { dept: Abteilung; words: string[] }[] = [
  { dept: 'Elektrik', words: ['schaltschrank', 'verkabelung', 'spannung', 'elektro', 'ader', 'kabel', 'frequenzumrichter', 'hauptschalter'] },
  { dept: 'Mechanik', words: ['lärmpegel', 'pumpen', 'behälter', 'förderer', 'mechanisch', 'schutzeinrichtung', 'hydraulik', 'pneumatik', 'konstruktion'] },
  { dept: 'Software & Steuerung', words: ['steuerung', 'sps', 'software', 'schnittstelle', 'hmi', 'opc ua', 'profinet', 'programm'] },
  { dept: 'Technologie', words: ['norm', 'din', 'iso', 'verfahren', 'richtlinie', 'ce-'] },
  { dept: 'Vertrieb & Projektierung', words: ['kosten', 'termin', 'liefer', 'preis', 'gewährleistung', 'angebot', 'ersatzteil'] },
];

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function randomLatency(): number {
  return 300 + Math.random() * 500;
}

/** Extract meaningful keywords from a checklist rule text. */
function ruleKeywords(regel: string): string[] {
  return regel
    .toLowerCase()
    .split(/[^a-zäöüß0-9-]+/i)
    .filter((w) => w.length > 3 && !['verweist', 'enthält', 'erwähnt', 'genannt', 'gefordert', 'oder', 'auf', 'externe'].includes(w));
}

export const aiService: AiService = {
  async assignDepartments(segments, checklisten) {
    await delay(randomLatency());
    const activeItems = checklisten.flatMap((c) => c.items.filter((i) => i.aktiv));
    const results: AiSuggestion[] = [];
    for (const seg of segments) {
      if (seg.typ !== 'Anforderung') continue;
      const text = seg.text.toLowerCase();
      const depts = new Set<Abteilung>();
      let matchedRule: string | undefined;
      let score = 0;

      for (const item of activeItems) {
        const hit = ruleKeywords(item.regel).some((kw) => text.includes(kw));
        if (hit) {
          matchedRule = item.regel;
          score += 1;
          if (item.zielAbteilung) depts.add(item.zielAbteilung);
        }
      }
      for (const { dept, words } of KEYWORD_MAP) {
        if (words.some((w) => text.includes(w))) {
          depts.add(dept);
          score += 1;
        }
      }
      if (depts.size === 0) continue;
      results.push({
        segmentId: seg.id,
        suggestedAbteilungen: [...depts].slice(0, 2),
        matchedChecklistItem: matchedRule,
        confidence: Math.min(0.95, 0.55 + score * 0.1),
      });
    }
    return results;
  },

  async compareToStandards(segments, standards) {
    await delay(randomLatency());
    const conflicts: StandardConflict[] = [];
    for (const seg of segments) {
      if (seg.typ !== 'Anforderung') continue;
      const text = seg.text.toLowerCase();
      for (const std of standards) {
        const hits = std.keywords.filter((kw) => text.includes(kw.toLowerCase()));
        if (hits.length) {
          conflicts.push({
            segmentId: seg.id,
            konflikt: `${std.name} (V${std.version}): Übereinstimmung bei „${hits.join('", „')}" — Anforderung gegen Werksnorm prüfen.`,
          });
          break;
        }
      }
    }
    return conflicts;
  },

  async compareToHistory(segments, otherAnfragen) {
    await delay(randomLatency());
    const hits: HistoryHit[] = [];
    for (const seg of segments) {
      if (seg.typ !== 'Anforderung') continue;
      for (const anfrage of otherAnfragen) {
        for (const doc of anfrage.documents) {
          const match = doc.segments.find(
            (s) => s.bewertung !== 'Offen' && normalize(s.text) === normalize(seg.text),
          );
          if (match) {
            hits.push({
              segmentId: seg.id,
              anfrageName: anfrage.name,
              bewertung: match.bewertung,
              kommentar: match.kommentarOeffentlich || match.kommentarIntern || '',
            });
          }
        }
      }
    }
    return hits;
  },
};

function normalize(t: string): string {
  return t.replace(/\s+/g, ' ').trim().toLowerCase();
}
