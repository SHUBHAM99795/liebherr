/**
 * Status chips / TYP badges / department chips (§4).
 */

import { MessageSquare } from 'lucide-react';
import type { Abteilung, Bewertung, Segment, SegmentType } from '../types';
import { bewertungChipStyle, hasComment, typAbbrev } from '../utils/status';

export function BewertungChip({ bewertung, mehrkosten }: { bewertung: Bewertung; mehrkosten?: string }) {
  const s = bewertungChipStyle(bewertung);
  const label = bewertung.startsWith('OK') && mehrkosten ? 'OK + €' : bewertung;
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs"
      style={{ backgroundColor: s.bg, borderColor: s.border, color: s.text }}
    >
      {label}
    </span>
  );
}

/** Chip + optional speech-bubble icon, as used in the segments table. */
export function SegmentStatusCell({ segment }: { segment: Segment }) {
  return (
    <span className="inline-flex items-center gap-1">
      <BewertungChip bewertung={segment.bewertung} mehrkosten={segment.mehrkosten} />
      {hasComment(segment) && <MessageSquare size={14} className="shrink-0 text-gray-400" />}
    </span>
  );
}

export function TypBadge({ typ }: { typ: SegmentType }) {
  return <span className="text-xs font-medium text-gray-500">{typAbbrev(typ)}</span>;
}

export function AbteilungChip({ abteilung }: { abteilung: Abteilung }) {
  const isWichtig = abteilung === 'WICHTIG';
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs ${
        isWichtig ? 'border-red-500 bg-red-50 text-red-700 font-semibold' : 'border-gray-300 bg-gray-50 text-gray-700'
      }`}
    >
      {abteilung}
    </span>
  );
}
