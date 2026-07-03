/**
 * §6.4 Anforderungsdetails — full-screen split view overlay.
 * Left: PDF viewer with highlight. Right: info card + 4 tabs + sticky footer.
 */

import {
  Ban,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Info,
  Pencil,
  RefreshCw,
  Save,
  Scissors,
  UnfoldVertical,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import type { Abteilung, Bewertung, Segment, SegmentType } from '../types';
import { defaultTableUi, findDocumentBySegment, useStore, type SegmentPatch } from '../store';
import { aiService } from '../services/aiService';
import {
  ALL_ABTEILUNGEN,
  ALL_BEWERTUNGEN,
  ALL_TYPEN,
  bewertungChipStyle,
  filterSegments,
  formatDateTime,
} from '../utils/status';
import { wordDiff } from '../utils/diff';
import { AbteilungChip, BewertungChip } from '../components/chips';
import PdfViewer from '../components/PdfViewer';
import { ConfirmDialog, Dropdown, GhostButton, Modal, PrimaryButton, Toggle, ToolbarButton } from '../components/ui';

type Tab = 'schnell' | 'detail' | 'ki' | 'version';

interface FormState {
  kommentarOeffentlich: string;
  kommentarIntern: string;
  mehrkosten: string;
  artikelnummern: string;
  bewertung: Bewertung;
  rueckmeldungKunde: string;
  abteilungen: Abteilung[];
}

function formFromSegment(s: Segment): FormState {
  return {
    kommentarOeffentlich: s.kommentarOeffentlich,
    kommentarIntern: s.kommentarIntern,
    mehrkosten: s.mehrkosten,
    artikelnummern: s.artikelnummern,
    bewertung: s.bewertung,
    rueckmeldungKunde: s.rueckmeldungKunde,
    abteilungen: s.abteilungen,
  };
}

function isDirty(form: FormState, s: Segment): boolean {
  return (
    form.kommentarOeffentlich !== s.kommentarOeffentlich ||
    form.kommentarIntern !== s.kommentarIntern ||
    form.mehrkosten !== s.mehrkosten ||
    form.artikelnummern !== s.artikelnummern ||
    form.bewertung !== s.bewertung ||
    form.rueckmeldungKunde !== s.rueckmeldungKunde ||
    form.abteilungen.join('|') !== s.abteilungen.join('|')
  );
}

export default function SegmentDetail() {
  const { id, segmentId } = useParams();
  const navigate = useNavigate();

  const anfragen = useStore((s) => s.anfragen);
  const checklisten = useStore((s) => s.checklisten);
  const itemsPerPage = useStore((s) => s.settings.itemsPerPage);
  const tableUiMap = useStore((s) => s.tableUi);
  const { updateSegment, mergeWithNext, splitSegment, setTableUi } = useStore();

  const anfrage = anfragen.find((a) => a.id === id);
  const doc = segmentId ? findDocumentBySegment(anfragen, segmentId) : undefined;
  const segment = doc?.segments.find((s) => s.id === segmentId);

  const ui = doc ? (tableUiMap[doc.id] ?? defaultTableUi(itemsPerPage)) : defaultTableUi(itemsPerPage);
  const filteredIds = useMemo(
    () => (doc ? filterSegments(doc.segments, ui.filters, ui.search).map((s) => s.id) : []),
    [doc, ui.filters, ui.search],
  );

  const [tab, setTab] = useState<Tab>('detail');
  const [form, setForm] = useState<FormState | null>(segment ? formFromSegment(segment) : null);
  const [typ, setTyp] = useState<SegmentType>(segment?.typ ?? 'Information');
  const [tint, setTint] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [mergeConfirm, setMergeConfirm] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const [leaveGuard, setLeaveGuard] = useState<null | (() => void)>(null);

  // reset local form when the segment changes
  useEffect(() => {
    if (segment) {
      setForm(formFromSegment(segment));
      setTyp(segment.typ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentId]);

  const dirty = !!(segment && form && isDirty(form, segment));

  const save = () => {
    if (!doc || !segment || !form) return;
    const patch: SegmentPatch = { ...form };
    updateSegment(doc.id, segment.id, patch);
    toast.success('Gespeichert');
  };

  const guarded = (action: () => void) => {
    if (dirty) setLeaveGuard(() => action);
    else action();
  };

  const close = () =>
    guarded(() => navigate(`/anfrage/${id}/details?view=doc-details&specDocId=${doc?.id}&page=${ui.page}`));

  const gotoSegment = (targetId: string) => {
    if (!doc) return;
    setTableUi(doc.id, { lastSegmentId: targetId });
    navigate(`/anfrage/${id}/details/segment/${targetId}`, { replace: true });
  };

  const idx = segmentId ? filteredIds.indexOf(segmentId) : -1;
  const prevId = idx > 0 ? filteredIds[idx - 1] : undefined;
  const nextId = idx >= 0 && idx < filteredIds.length - 1 ? filteredIds[idx + 1] : undefined;

  const saveAndNext = (bewertung?: Bewertung) => {
    if (!doc || !segment || !form) return;
    const patch: SegmentPatch = { ...form, ...(bewertung ? { bewertung } : {}) };
    updateSegment(doc.id, segment.id, patch);
    if (nextId) gotoSegment(nextId);
    else toast('Letztes Segment der Liste erreicht');
  };

  // keyboard: ←/→ navigate, Ctrl+S saves
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        save();
      } else if (!typing && e.key === 'ArrowLeft' && prevId) {
        guarded(() => gotoSegment(prevId));
      } else if (!typing && e.key === 'ArrowRight' && nextId) {
        guarded(() => gotoSegment(nextId));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!anfrage || !doc || !segment || !form) {
    return <div className="p-6 text-gray-500">Segment nicht gefunden.</div>;
  }

  const chipStyle = bewertungChipStyle(form.bewertung);

  const runKiZuweisung = async () => {
    const tid = toast.loading('KI-Zuweisung läuft…');
    const suggestions = await aiService.assignDepartments([segment], checklisten);
    if (suggestions.length === 0) {
      toast.error('Kein KI-Vorschlag gefunden', { id: tid });
      return;
    }
    const sug = suggestions[0];
    setForm((f) => f && { ...f, abteilungen: [...new Set([...f.abteilungen, ...sug.suggestedAbteilungen])] });
    updateSegment(doc.id, segment.id, {
      ki: {
        ...segment.ki,
        suggestedAbteilungen: sug.suggestedAbteilungen,
        matchedChecklistItem: sug.matchedChecklistItem,
        confidence: sug.confidence,
      },
    });
    toast.success(`Vorschlag übernommen: ${sug.suggestedAbteilungen.join(', ')}`, { id: tid });
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white">
      {/* header */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-2">
        <div className="flex items-center gap-6">
          <h1 className="text-base font-semibold">Anforderungsdetails</h1>
          <Toggle checked={tint} onChange={setTint} label="Status farblich hervorheben" />
        </div>
        <button className="rounded p-1.5 text-gray-500 hover:bg-gray-100" onClick={close} aria-label="Schließen">
          <X size={18} />
        </button>
      </div>

      {/* split panes */}
      <div className="flex min-h-0 flex-1">
        {/* left: PDF */}
        <div className="w-[45%] shrink-0 border-r border-gray-200">
          <PdfViewer pdfUrl={doc.pdfUrl} page={segment.page} pageCount={doc.pageCount} highlights={segment.highlights} />
        </div>

        {/* right: form */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <div className="p-4">
            {/* info card */}
            <div
              className="rounded-lg border border-gray-200 p-3"
              style={tint ? { backgroundColor: chipStyle.bg, borderColor: chipStyle.border } : undefined}
            >
              <p className="font-bold">
                #{segment.nr} {typ}
              </p>
              <p className="text-xs text-gray-500">
                Quelle: {doc.fileName} . Seite: {segment.page}
              </p>
              <p className="mt-1 text-sm text-gray-600">{segment.kapitel}</p>
              {segment.contentType === 'table' ? (
                <div className="segment-table mt-1 overflow-x-auto font-semibold" dangerouslySetInnerHTML={{ __html: segment.text }} />
              ) : (
                <p className="mt-1 whitespace-pre-line font-bold">{segment.text}</p>
              )}
            </div>

            {/* tab bar */}
            <div className="mt-4 flex border-b border-gray-200">
              {(
                [
                  { key: 'schnell', label: 'Schnellbearbeitung', icon: <Clock size={14} /> },
                  { key: 'detail', label: 'Detailbearbeitung', icon: <Pencil size={14} /> },
                  { key: 'ki', label: 'KI-Ergebnisse', icon: <Info size={14} /> },
                  { key: 'version', label: 'Versionsabgleich', icon: <RefreshCw size={14} /> },
                ] as { key: Tab; label: string; icon: React.ReactNode }[]
              ).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm ${
                    tab === t.key
                      ? 'border-blue-600 font-semibold text-blue-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            {/* ---- Tab: Schnellbearbeitung ---- */}
            {tab === 'schnell' && (
              <div className="mt-4 max-w-lg space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Bewertung</label>
                  <select
                    value={form.bewertung}
                    onChange={(e) => setForm({ ...form, bewertung: e.target.value as Bewertung })}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  >
                    {ALL_BEWERTUNGEN.map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                  <div className="mt-1">
                    <BewertungChip bewertung={form.bewertung} mehrkosten={form.mehrkosten} />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Kommentar (intern)</label>
                  <textarea
                    rows={4}
                    value={form.kommentarIntern}
                    onChange={(e) => setForm({ ...form, kommentarIntern: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <PrimaryButton icon={<Save size={14} />} onClick={save}>
                  Speichern
                </PrimaryButton>
              </div>
            )}

            {/* ---- Tab: Detailbearbeitung ---- */}
            {tab === 'detail' && (
              <div className="mt-4 space-y-5">
                <div>
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold">Zugewiesene Abteilungen</h3>
                    <div className="flex gap-2">
                      <ToolbarButton icon={<Info size={13} />} onClick={runKiZuweisung}>
                        Zuweisung mit KI
                      </ToolbarButton>
                      <Dropdown
                        align="right"
                        trigger={() => (
                          <ToolbarButton icon={<ChevronDown size={13} />}>Manuelle Zuweisung</ToolbarButton>
                        )}
                      >
                        {ALL_ABTEILUNGEN.map((a) => (
                          <label key={a} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 accent-blue-600"
                              checked={form.abteilungen.includes(a)}
                              onChange={() =>
                                setForm({
                                  ...form,
                                  abteilungen: form.abteilungen.includes(a)
                                    ? form.abteilungen.filter((x) => x !== a)
                                    : [...form.abteilungen, a],
                                })
                              }
                            />
                            {a}
                          </label>
                        ))}
                      </Dropdown>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {form.abteilungen.length ? form.abteilungen.map((a) => <AbteilungChip key={a} abteilung={a} />) : <span className="text-gray-400">-</span>}
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold">Bewertung</h3>
                  <div className="grid max-w-2xl gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Kommentar (öffentlich)</label>
                      <textarea
                        rows={3}
                        value={form.kommentarOeffentlich}
                        onChange={(e) => setForm({ ...form, kommentarOeffentlich: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Kommentar (intern)</label>
                      <textarea
                        rows={4}
                        value={form.kommentarIntern}
                        onChange={(e) => setForm({ ...form, kommentarIntern: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">Mehrkosten</label>
                        <input
                          value={form.mehrkosten}
                          onChange={(e) => setForm({ ...form, mehrkosten: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">Artikelnummer(n)</label>
                        <input
                          value={form.artikelnummern}
                          onChange={(e) => setForm({ ...form, artikelnummern: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Bewertung</label>
                      <select
                        value={form.bewertung}
                        onChange={(e) => setForm({ ...form, bewertung: e.target.value as Bewertung })}
                        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      >
                        {ALL_BEWERTUNGEN.map((b) => (
                          <option key={b}>{b}</option>
                        ))}
                      </select>
                      <div className="mt-1">
                        <BewertungChip bewertung={form.bewertung} mehrkosten={form.mehrkosten} />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Rückmeldung vom Kunden</label>
                      <textarea
                        rows={3}
                        value={form.rueckmeldungKunde}
                        onChange={(e) => setForm({ ...form, rueckmeldungKunde: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <PrimaryButton icon={<Save size={14} />} onClick={save}>
                      Speichern
                    </PrimaryButton>
                    <GhostButton onClick={() => setForm(formFromSegment(segment))}>Änderungen Zurücksetzen</GhostButton>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold">Segment-Typ</h3>
                  <label className="mr-2 text-xs font-medium text-gray-600">Segment-Typ:</label>
                  <select
                    value={typ}
                    onChange={(e) => {
                      const t = e.target.value as SegmentType;
                      setTyp(t);
                      updateSegment(doc.id, segment.id, { typ: t });
                    }}
                    className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  >
                    {ALL_TYPEN.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="rounded-md border border-gray-200">
                  <button
                    className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold"
                    onClick={() => setHistoryOpen((v) => !v)}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={14} /> Bearbeitungshistorie
                    </span>
                    {historyOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {historyOpen && (
                    <ul className="border-t border-gray-100 px-3 py-2 text-xs text-gray-600">
                      {[...segment.historie].reverse().map((h, i) => (
                        <li key={i} className="py-0.5">
                          {formatDateTime(h.timestamp)} · {h.user} · {h.field}: „{h.oldValue}" → „{h.newValue}"
                        </li>
                      ))}
                      {segment.historie.length === 0 && <li className="py-1 text-gray-400">Keine Einträge.</li>}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* ---- Tab: KI-Ergebnisse ---- */}
            {tab === 'ki' && (
              <div className="mt-4 space-y-3">
                {!segment.ki && (
                  <p className="text-sm text-gray-400">
                    Keine KI-Ergebnisse vorhanden. Führen Sie „Zuweisung mit KI" oder einen Abgleich aus.
                  </p>
                )}
                {segment.ki?.matchedChecklistItem !== undefined || segment.ki?.suggestedAbteilungen ? (
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xs font-semibold uppercase text-gray-400">KI-Zuweisung</p>
                    {segment.ki?.matchedChecklistItem && (
                      <p className="mt-1 text-sm">
                        Prüfkriterium: <b>{segment.ki.matchedChecklistItem}</b>
                      </p>
                    )}
                    {segment.ki?.suggestedAbteilungen && (
                      <p className="mt-1 text-sm">
                        Vorgeschlagene Abteilung:{' '}
                        {segment.ki.suggestedAbteilungen.map((a) => (
                          <AbteilungChip key={a} abteilung={a} />
                        ))}
                      </p>
                    )}
                    {segment.ki?.suggestedBewertung && (
                      <p className="mt-1 text-sm">
                        Vorgeschlagene Bewertung: <BewertungChip bewertung={segment.ki.suggestedBewertung} />
                      </p>
                    )}
                    {segment.ki?.confidence !== undefined && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-2 w-40 overflow-hidden rounded-full bg-gray-200">
                          <div className="h-full bg-blue-600" style={{ width: `${Math.round(segment.ki.confidence * 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{Math.round(segment.ki.confidence * 100)}%</span>
                      </div>
                    )}
                    <div className="mt-2">
                      <ToolbarButton
                        onClick={() => {
                          setForm({
                            ...form,
                            abteilungen: [...new Set([...form.abteilungen, ...(segment.ki?.suggestedAbteilungen ?? [])])],
                            bewertung: segment.ki?.suggestedBewertung ?? form.bewertung,
                          });
                          toast.success('Vorschlag übernommen');
                        }}
                      >
                        Übernehmen
                      </ToolbarButton>
                    </div>
                  </div>
                ) : null}
                {segment.ki?.historienTreffer && (
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xs font-semibold uppercase text-gray-400">Historienabgleich</p>
                    <p className="mt-1 text-sm">
                      Treffer in <b>{segment.ki.historienTreffer.anfrageName}</b> — damalige Bewertung:{' '}
                      <BewertungChip bewertung={segment.ki.historienTreffer.bewertung} />
                    </p>
                    {segment.ki.historienTreffer.kommentar && (
                      <p className="mt-1 text-sm text-gray-600">„{segment.ki.historienTreffer.kommentar}"</p>
                    )}
                    <div className="mt-2">
                      <ToolbarButton
                        onClick={() => {
                          setForm({
                            ...form,
                            bewertung: segment.ki!.historienTreffer!.bewertung,
                            kommentarIntern: form.kommentarIntern || segment.ki!.historienTreffer!.kommentar,
                          });
                          toast.success('Historien-Vorschlag übernommen');
                        }}
                      >
                        Übernehmen
                      </ToolbarButton>
                    </div>
                  </div>
                )}
                {segment.ki?.standardKonflikt && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                    <p className="text-xs font-semibold uppercase text-amber-600">Standardabgleich — möglicher Konflikt</p>
                    <p className="mt-1 text-sm text-amber-800">{segment.ki.standardKonflikt}</p>
                  </div>
                )}
              </div>
            )}

            {/* ---- Tab: Versionsabgleich ---- */}
            {tab === 'version' && (
              <div className="mt-4">
                {!segment.versionDiff || segment.versionDiff.status === 'unverändert' ? (
                  segment.versionDiff?.status === 'unverändert' ? (
                    <p className="text-sm text-gray-500">Segment unverändert gegenüber der Vorversion.</p>
                  ) : (
                    <p className="text-sm text-gray-400">Keine Vorversion vorhanden.</p>
                  )
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-gray-200 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Vorherige Version</p>
                      <p className="text-sm">
                        {segment.versionDiff.status === 'neu' ? (
                          <span className="text-gray-400">— (Segment ist neu)</span>
                        ) : (
                          wordDiff(segment.versionDiff.oldText ?? segment.text, segment.versionDiff.status === 'entfernt' ? '' : segment.text).map(
                            (p, i) =>
                              p.type === 'added' ? null : (
                                <span key={i} className={p.type === 'removed' ? 'bg-red-100 text-red-700 line-through' : ''}>
                                  {p.text}{' '}
                                </span>
                              ),
                          )
                        )}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Aktuelle Version</p>
                      <p className="text-sm">
                        {segment.versionDiff.status === 'entfernt' ? (
                          <span className="text-gray-400">— (Segment wurde entfernt)</span>
                        ) : (
                          wordDiff(segment.versionDiff.oldText ?? '', segment.text).map((p, i) =>
                            p.type === 'removed' ? null : (
                              <span key={i} className={p.type === 'added' ? 'bg-green-100 text-green-700' : ''}>
                                {p.text}{' '}
                              </span>
                            ),
                          )
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* sticky footer */}
      <div className="flex shrink-0 items-center justify-between border-t border-gray-200 bg-white px-4 py-2">
        <div className="flex flex-wrap gap-2">
          <ToolbarButton icon={<Check size={14} />} onClick={() => saveAndNext('OK')}>
            Erfüllt + Nächste
          </ToolbarButton>
          <ToolbarButton icon={<Ban size={14} />} onClick={() => saveAndNext('Nicht Relevant')}>
            Nicht Relevant + Nächste
          </ToolbarButton>
          <ToolbarButton icon={<UnfoldVertical size={14} />} onClick={() => setMergeConfirm(true)}>
            Zusammenführen (unten)
          </ToolbarButton>
          <ToolbarButton icon={<Scissors size={14} />} onClick={() => setSplitting(true)}>
            Aufteilen
          </ToolbarButton>
        </div>
        <div className="flex gap-2">
          <ToolbarButton icon={<ChevronLeft size={14} />} disabled={!prevId} onClick={() => guarded(() => gotoSegment(prevId!))}>
            Vorherige
          </ToolbarButton>
          <ToolbarButton disabled={!nextId} onClick={() => guarded(() => gotoSegment(nextId!))}>
            Nächste <ChevronRight size={14} />
          </ToolbarButton>
        </div>
      </div>

      {/* dialogs */}
      {mergeConfirm && (
        <ConfirmDialog
          title="Zusammenführen"
          message={`Segment #${segment.nr} mit dem nächsten Segment zusammenführen? Der Text wird verbunden, das nächste Segment entfernt und alle folgenden Nummern angepasst.`}
          confirmLabel="Zusammenführen"
          onCancel={() => setMergeConfirm(false)}
          onConfirm={() => {
            setMergeConfirm(false);
            if (mergeWithNext(doc.id, segment.id)) toast.success('Segmente zusammengeführt');
            else toast.error('Kein nachfolgendes Segment vorhanden');
          }}
        />
      )}
      {splitting && (
        <SplitDialog
          text={segment.text}
          onCancel={() => setSplitting(false)}
          onSplit={(pos) => {
            setSplitting(false);
            if (splitSegment(doc.id, segment.id, pos)) toast.success('Segment aufgeteilt');
          }}
        />
      )}
      {leaveGuard && (
        <ConfirmDialog
          title="Ungespeicherte Änderungen"
          message="Es gibt ungespeicherte Änderungen. Ohne Speichern fortfahren?"
          confirmLabel="Fortfahren ohne Speichern"
          onCancel={() => setLeaveGuard(null)}
          onConfirm={() => {
            const action = leaveGuard;
            setLeaveGuard(null);
            action();
          }}
        />
      )}
    </div>
  );
}

/** §6.4 Aufteilen — click a word to place the split marker. */
function SplitDialog({ text, onCancel, onSplit }: { text: string; onCancel: () => void; onSplit: (pos: number) => void }) {
  const [pos, setPos] = useState<number | null>(null);
  const words: { start: number; word: string }[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) words.push({ start: m.index, word: m[0] });

  return (
    <Modal title="Segment aufteilen" onClose={onCancel} width="max-w-2xl">
      <p className="mb-2 text-xs text-gray-500">
        Klicken Sie auf das Wort, an dem das zweite Segment beginnen soll.
      </p>
      <div className="max-h-72 overflow-y-auto rounded-md border border-gray-200 p-3 leading-7">
        {words.map((w, i) => (
          <span key={i}>
            {pos === w.start && <span className="mx-0.5 inline-block h-4 w-0.5 translate-y-0.5 bg-blue-600" />}
            <span
              className={`cursor-pointer rounded px-0.5 hover:bg-blue-50 ${pos !== null && w.start >= pos ? 'bg-blue-50' : ''}`}
              onClick={() => setPos(w.start)}
            >
              {w.word}
            </span>{' '}
          </span>
        ))}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <GhostButton onClick={onCancel}>Abbrechen</GhostButton>
        <PrimaryButton disabled={pos === null || pos === 0} onClick={() => pos && onSplit(pos)}>
          Aufteilen
        </PrimaryButton>
      </div>
    </Modal>
  );
}
