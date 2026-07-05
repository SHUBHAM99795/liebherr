/**
 * Live Bewertungsstatus line (§3) — numbers bold + colored, rest gray.
 */

import type { Segment } from '../types';
import { COUNTER_COLORS, computeCounts } from '../utils/status';

export default function StatusLine({ segments }: { segments: Segment[] }) {
  const c = computeCounts(segments);
  const Num = ({ n, color }: { n: number; color: string }) => (
    <b style={{ color }} className="font-semibold">
      {n}
    </b>
  );
  return (
    <p className="text-sm text-gray-500">
      Bewertungsstatus: <Num n={c.erfuellt} color={COUNTER_COLORS.erfuellt} /> erfüllte,{' '}
      <Num n={c.abgelehnt} color={COUNTER_COLORS.abgelehnt} /> abgelehnte,{' '}
      <Num n={c.unklar} color={COUNTER_COLORS.unklar} /> unklare,{' '}
      <Num n={c.ohneDaten} color={COUNTER_COLORS.ohneDaten} /> ohne Daten,{' '}
      <Num n={c.nichtRelevant} color={COUNTER_COLORS.nichtRelevant} /> nicht relevant,{' '}
      <Num n={c.offen} color={COUNTER_COLORS.offen} /> offene von <b className="text-gray-700">{c.anforderungen}</b>{' '}
      Anforderungen / <b className="text-gray-700">{c.segmente}</b> Segmente.
    </p>
  );
}
