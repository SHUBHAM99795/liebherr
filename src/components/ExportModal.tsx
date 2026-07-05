/**
 * §6.5 Excel Export modal — Spaltenauswahl + Filtereinstellungen + Sprache.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import type { Abteilung, Bewertung, Segment, SegmentType } from '../types';
import { useStore } from '../store';
import { ALL_ABTEILUNGEN, ALL_BEWERTUNGEN, ALL_TYPEN } from '../utils/status';
import { EXPORT_COLUMNS, exportComplianceMatrix, type ExportColumn } from '../utils/excel';
import { BewertungChip } from './chips';
import { Modal, PrimaryButton } from './ui';

const DEFAULT_BEWERTUNGEN: Bewertung[] = ['OK', 'Abgelehnt', 'Keine Daten', 'Unklar', 'Offen'];

export default function ExportModal({
  anfrageName,
  fileName,
  segments,
  onClose,
}: {
  anfrageName: string;
  fileName: string;
  segments: Segment[];
  onClose: () => void;
}) {
  const defaultLanguage = useStore((s) => s.settings.exportLanguage);
  const [columns, setColumns] = useState<ExportColumn[]>(
    EXPORT_COLUMNS.filter((c) => c.defaultOn).map((c) => c.key),
  );
  const [typen, setTypen] = useState<SegmentType[]>([...ALL_TYPEN]);
  const [bewertungen, setBewertungen] = useState<Bewertung[]>(DEFAULT_BEWERTUNGEN);
  const [abteilungen, setAbteilungen] = useState<string[]>(['ohne']);
  const [language, setLanguage] = useState<'Deutsch' | 'Englisch'>(defaultLanguage);

  const toggle = <T,>(list: T[], v: T, set: (n: T[]) => void) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const doExport = () => {
    const deptFilter = abteilungen.filter((a) => a !== 'ohne') as Abteilung[];
    const includeOhne = abteilungen.includes('ohne');
    const rows = segments.filter((s) => {
      if (!typen.includes(s.typ)) return false;
      if (!bewertungen.includes(s.bewertung)) return false;
      // no department checked at all -> no department filter
      if (deptFilter.length === 0 && !includeOhne) return true;
      const matchesDept = deptFilter.length > 0 && s.abteilungen.some((a) => deptFilter.includes(a));
      const matchesOhne = includeOhne && s.abteilungen.length === 0;
      // "Ohne Zugewiesene Abteilungen" ADDITIONALLY includes unassigned rows
      if (deptFilter.length === 0) return matchesOhne || s.abteilungen.length > 0;
      return matchesDept || matchesOhne;
    });
    const n = exportComplianceMatrix({ anfrageName, fileName, segments: rows, columns, language });
    toast.success(`Export erstellt (${n} Zeilen)`);
    onClose();
  };

  return (
    <Modal title="Excel Export" onClose={onClose} width="max-w-[680px]">
      <div className="grid grid-cols-[1fr_1.4fr] gap-6">
        {/* Spaltenauswahl */}
        <div>
          <h3 className="mb-2 font-semibold">Spaltenauswahl</h3>
          <div className="flex flex-col gap-1.5">
            {EXPORT_COLUMNS.map((c) => (
              <label key={c.key} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-blue-600"
                  checked={columns.includes(c.key)}
                  onChange={() => toggle(columns, c.key, setColumns)}
                />
                {c.de}
              </label>
            ))}
          </div>
        </div>

        {/* Filtereinstellungen */}
        <div>
          <h3 className="font-semibold">Filtereinstellungen</h3>
          <p className="mb-2 text-xs text-gray-500">Auswahl der sichtbaren Segmente in der exportierten Datei.</p>

          <div className="mb-3 rounded-md border border-gray-200 p-3">
            <h4 className="mb-2 text-xs font-semibold text-gray-600">Segment-Typen</h4>
            <div className="flex gap-4">
              {ALL_TYPEN.map((t) => (
                <label key={t} className="flex cursor-pointer items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-blue-600"
                    checked={typen.includes(t)}
                    onChange={() => toggle(typen, t, setTypen)}
                  />
                  {t}
                </label>
              ))}
            </div>
          </div>

          <div className="mb-3 rounded-md border border-gray-200 p-3">
            <h4 className="mb-2 text-xs font-semibold text-gray-600">Bewertungsstatus</h4>
            <div className="grid grid-cols-4 gap-x-2 gap-y-2">
              {(['OK', 'OK (Mehrkosten)', 'OK (Ausnahme)', 'Abgelehnt', 'Keine Daten', 'Unklar', 'Nicht Relevant', 'Offen'] as Bewertung[]).map(
                (b) => (
                  <label key={b} className="flex cursor-pointer items-center gap-1.5">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 shrink-0 accent-blue-600"
                      checked={bewertungen.includes(b)}
                      onChange={() => toggle(bewertungen, b, setBewertungen)}
                    />
                    <BewertungChip bewertung={b} />
                  </label>
                ),
              )}
            </div>
          </div>

          <div className="rounded-md border border-gray-200 p-3">
            <h4 className="mb-2 text-xs font-semibold text-gray-600">Zuweisung (Abteilungen)</h4>
            <div className="flex flex-col gap-1.5">
              <label className="flex cursor-pointer items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-blue-600"
                  checked={abteilungen.includes('ohne')}
                  onChange={() => toggle(abteilungen, 'ohne', setAbteilungen)}
                />
                Ohne Zugewiesene Abteilungen
              </label>
              {ALL_ABTEILUNGEN.map((a) => (
                <label key={a} className="flex cursor-pointer items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-blue-600"
                    checked={abteilungen.includes(a)}
                    onChange={() => toggle(abteilungen, a, setAbteilungen)}
                  />
                  {a}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-4">
        <label className="text-sm text-gray-600">Sprache für Beschriftungen</label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as 'Deutsch' | 'Englisch')}
          className="rounded-md border border-gray-300 px-2 py-1 text-sm"
        >
          <option>Deutsch</option>
          <option>Englisch</option>
        </select>
      </div>

      <div className="mt-4 flex justify-center">
        <PrimaryButton className="px-8" onClick={doExport}>
          Exportieren
        </PrimaryButton>
      </div>
    </Modal>
  );
}
