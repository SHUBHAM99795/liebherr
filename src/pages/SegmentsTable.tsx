/**
 * §6.3 Segments table — THE CORE SCREEN.
 * Breadcrumb, toolbar, search, 6 filter dropdowns, status line, table with
 * document group header + chapter separators, pagination.
 */

import {
  Bell,
  ChevronLeft,
  Download,
  Grid2X2,
  Import,
  Info,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Send,
  Home,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import type { Bewertung, Segment, SegmentType } from '../types';
import { defaultTableUi, useStore } from '../store';
import {
  ALL_ABTEILUNGEN,
  ALL_BEWERTUNGEN,
  ALL_TYPEN,
  filterSegments,
  type SegmentFilters,
} from '../utils/status';
import {
  applyKiSuggestions,
  runExcelImport,
  runHistorienabgleich,
  runSegmentTypeExt,
  runStandardabgleich,
  runVersionsupdate,
  runZuweisungAbteilungen,
} from '../utils/actions';
import { AbteilungChip, BewertungChip, SegmentStatusCell, TypBadge } from '../components/chips';
import StatusLine from '../components/StatusLine';
import ExportModal from '../components/ExportModal';
import NotifyModal from '../components/NotifyModal';
import UploadModal from '../components/UploadModal';
import { ConfirmDialog, Dropdown, DropdownItem, FilterDropdown, TextPromptDialog, ToolbarButton } from '../components/ui';

/** Segment row list with chapter separators interleaved. */
type Row = { kind: 'chapter'; kapitel: string } | { kind: 'segment'; segment: Segment };

function buildRows(segments: Segment[]): Row[] {
  const rows: Row[] = [];
  let lastKapitel: string | null = null;
  for (const seg of segments) {
    if (seg.kapitel !== lastKapitel) {
      rows.push({ kind: 'chapter', kapitel: seg.kapitel });
      lastKapitel = seg.kapitel;
    }
    rows.push({ kind: 'segment', segment: seg });
  }
  return rows;
}

export default function SegmentsTable() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const anfrage = useStore((s) => s.anfragen.find((a) => a.id === id));
  const itemsPerPage = useStore((s) => s.settings.itemsPerPage);
  const tableUiMap = useStore((s) => s.tableUi);
  const { setTableUi, updateSegment } = useStore();

  const docId = params.get('specDocId') ?? anfrage?.documents[0]?.id ?? '';
  const doc = anfrage?.documents.find((d) => d.id === docId);

  const ui = tableUiMap[docId] ?? defaultTableUi(itemsPerPage);
  const urlPage = Number(params.get('page') ?? ui.page) || 1;

  const [selected, setSelected] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [versionConfirm, setVersionConfirm] = useState(false);
  const [zuweisungConfirm, setZuweisungConfirm] = useState(false);
  const [renamingDoc, setRenamingDoc] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () => (doc ? filterSegments(doc.segments, ui.filters, ui.search) : []),
    [doc, ui.filters, ui.search],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ui.pageSize));
  const page = Math.min(urlPage, totalPages);
  const pageSegments = filtered.slice((page - 1) * ui.pageSize, page * ui.pageSize);
  const rows = useMemo(() => buildRows(pageSegments), [pageSegments]);

  // restore scroll when coming back from the detail overlay
  useEffect(() => {
    if (ui.scrollY !== undefined) window.scrollTo(0, ui.scrollY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!anfrage || !doc) return <div className="p-6 text-gray-500">Dokument nicht gefunden.</div>;

  const setPage = (p: number) => {
    setTableUi(docId, { page: p });
    params.set('page', String(p));
    params.set('specDocId', docId);
    params.set('view', 'doc-details');
    setParams(params, { replace: true });
  };

  const setFilters = (patch: Partial<SegmentFilters>) => {
    setTableUi(docId, { filters: { ...ui.filters, ...patch }, page: 1 });
  };

  const openSegment = (segmentId: string) => {
    setTableUi(docId, { lastSegmentId: segmentId, scrollY: window.scrollY });
    navigate(`/anfrage/${anfrage.id}/details/segment/${segmentId}`);
  };

  const onImport = async (file: File) => {
    const { updated, unmatched } = await runExcelImport(file, doc);
    toast.success(`${updated} Segmente aktualisiert, ${unmatched} Zeilen ohne Treffer`);
  };

  const pagination = () => {
    const pages: (number | '…')[] = [];
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pages.push(p);
      else if (pages[pages.length - 1] !== '…') pages.push('…');
    }
    return pages;
  };

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Home size={14} />
          <Link to={`/anfrage/${anfrage.id}`} className="hover:underline">
            {anfrage.name}
          </Link>
          <span>›</span>
          <span className="font-semibold text-gray-900">{doc.fileName}</span>
        </div>
        <ToolbarButton icon={<ChevronLeft size={14} />} onClick={() => navigate(`/anfrage/${anfrage.id}`)}>
          Zurück zur Anfrage
        </ToolbarButton>
      </div>

      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="mr-1 flex items-center rounded-md border border-gray-300 bg-white">
          <button className="rounded-l-md bg-blue-50 p-1.5 text-blue-700">
            <List size={15} />
          </button>
          <button className="rounded-r-md p-1.5 text-gray-400 hover:bg-gray-50" title="Split-Ansicht">
            <Grid2X2 size={15} />
          </button>
        </div>
        <ToolbarButton icon={<Plus size={14} />} onClick={() => setUploading(true)}>
          Anfragepaket
        </ToolbarButton>
        <ToolbarButton icon={<Plus size={14} />} onClick={() => setVersionConfirm(true)}>
          Versionsupdate
        </ToolbarButton>
        <Dropdown trigger={() => <ToolbarButton icon={<Import size={14} />}>Import ▾</ToolbarButton>}>
          <DropdownItem onClick={() => importRef.current?.click()}>Excel-Import</DropdownItem>
        </Dropdown>
        <ToolbarButton icon={<Info size={14} />} onClick={() => setZuweisungConfirm(true)}>
          Zuweisung Abteilungen
        </ToolbarButton>
        <ToolbarButton icon={<Info size={14} />} onClick={() => runStandardabgleich(doc, selected)}>
          Standardabgleich
        </ToolbarButton>
        <ToolbarButton icon={<Search size={14} />} onClick={() => runHistorienabgleich(doc, selected)}>
          Historienabgleich
        </ToolbarButton>
        <ToolbarButton icon={<Info size={14} />} onClick={() => runSegmentTypeExt(doc)}>
          SegmentTypeExt Berechnen
        </ToolbarButton>
        <ToolbarButton
          icon={<Info size={14} />}
          onClick={() => {
            const n = applyKiSuggestions(doc);
            toast.success(n ? `${n} KI-Vorschläge übernommen` : 'Keine offenen KI-Vorschläge vorhanden');
          }}
        >
          KI-Vorschläge Übernehmen
        </ToolbarButton>
        <ToolbarButton icon={<Download size={14} />} onClick={() => setExporting(true)}>
          Export Excel
        </ToolbarButton>
        <ToolbarButton icon={<Send size={14} />} onClick={() => setNotifying(true)}>
          Abteilungen Benachrichtigen
        </ToolbarButton>
        <div className="ml-auto">
          <button className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
            <Bell size={16} />
          </button>
        </div>
        <input
          ref={importRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImport(f);
            e.target.value = '';
          }}
        />
      </div>

      {/* Search + filters */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search size={14} className="absolute left-2.5 top-2 text-gray-400" />
          <input
            value={ui.search}
            onChange={(e) => setTableUi(docId, { search: e.target.value, page: 1 })}
            placeholder="Anforderung suchen"
            className="w-full rounded-full border border-gray-300 py-1.5 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <FilterDropdown
            label="Segment-Typ"
            options={ALL_TYPEN.map((t) => ({ value: t, label: t }))}
            selected={ui.filters.typ}
            onChange={(v) => setFilters({ typ: v as SegmentType[] })}
          />
          <FilterDropdown
            label="Versionsabgleich"
            options={[
              { value: 'neu', label: 'Neu' },
              { value: 'geändert', label: 'Geändert' },
              { value: 'entfernt', label: 'Entfernt' },
              { value: 'unverändert', label: 'Unverändert' },
            ]}
            selected={ui.filters.versionsabgleich}
            onChange={(v) => setFilters({ versionsabgleich: v })}
          />
          <FilterDropdown
            label="Bewertung"
            options={ALL_BEWERTUNGEN.map((b) => ({ value: b, label: b }))}
            selected={ui.filters.bewertung}
            onChange={(v) => setFilters({ bewertung: v as Bewertung[] })}
            renderOption={(o) => <BewertungChip bewertung={o.value as Bewertung} />}
          />
          <FilterDropdown
            label="KI"
            options={[
              { value: 'mit', label: 'Mit KI-Vorschlag' },
              { value: 'ohne', label: 'Ohne' },
            ]}
            selected={ui.filters.ki}
            onChange={(v) => setFilters({ ki: v })}
          />
          <FilterDropdown
            label="Kommentar"
            options={[
              { value: 'mit', label: 'Mit Kommentar' },
              { value: 'ohne', label: 'Ohne Kommentar' },
            ]}
            selected={ui.filters.kommentar}
            onChange={(v) => setFilters({ kommentar: v })}
          />
          <FilterDropdown
            label="Abteilung"
            options={[
              { value: 'ohne', label: 'Ohne Zugewiesene Abteilungen' },
              ...ALL_ABTEILUNGEN.map((a) => ({ value: a as string, label: a })),
            ]}
            selected={ui.filters.abteilung}
            onChange={(v) => setFilters({ abteilung: v })}
          />
        </div>
      </div>

      {/* Status line */}
      <div className="mb-2">
        <StatusLine segments={doc.segments} />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full table-fixed">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
              <th className="w-8 px-2 py-2">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-blue-600"
                  checked={pageSegments.length > 0 && pageSegments.every((s) => selected.includes(s.id))}
                  onChange={(e) =>
                    setSelected(e.target.checked ? pageSegments.map((s) => s.id) : [])
                  }
                />
              </th>
              <th className="w-12 px-2 py-2">#</th>
              <th className="w-40 px-2 py-2">Kapitel</th>
              <th className="px-2 py-2">Anforderung</th>
              <th className="w-14 px-2 py-2">Typ</th>
              <th className="w-36 px-2 py-2">Bewertung</th>
              <th className="w-44 px-2 py-2">Zuweisung</th>
              <th className="w-10 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {/* document group header */}
            <tr className="border-b border-gray-200 bg-gray-50">
              <td colSpan={7} className="px-3 py-2 font-semibold">
                {doc.fileName.replace(/\.pdf$/i, '')}
                <span className="ml-2 text-xs font-normal text-gray-400">Version {doc.version}</span>
              </td>
              <td className="px-2 py-2 text-right">
                <Dropdown
                  align="right"
                  trigger={() => (
                    <button className="rounded p-1 text-gray-500 hover:bg-gray-100">
                      <MoreHorizontal size={15} />
                    </button>
                  )}
                >
                  <DropdownItem onClick={() => setRenamingDoc(true)}>Umbenennen</DropdownItem>
                  <DropdownItem
                    onClick={() => {
                      useStore.getState().removeDocuments(anfrage.id, [doc.id]);
                      navigate(`/anfrage/${anfrage.id}`);
                    }}
                  >
                    Löschen
                  </DropdownItem>
                  <DropdownItem onClick={() => setVersionConfirm(true)}>Versionsupdate</DropdownItem>
                </Dropdown>
              </td>
            </tr>

            {rows.map((row, i) =>
              row.kind === 'chapter' ? (
                <tr key={`ch-${i}`} className="border-b border-gray-100 bg-gray-50">
                  <td colSpan={8} className="px-3 py-1.5 text-xs font-bold text-gray-700">
                    {row.kapitel}
                  </td>
                </tr>
              ) : (
                <tr
                  key={row.segment.id}
                  className={`cursor-pointer border-b border-gray-100 hover:bg-gray-50 ${
                    ui.lastSegmentId === row.segment.id ? 'bg-gray-100' : ''
                  }`}
                  onClick={() => openSegment(row.segment.id)}
                >
                  <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-blue-600"
                      checked={selected.includes(row.segment.id)}
                      onChange={() =>
                        setSelected((prev) =>
                          prev.includes(row.segment.id)
                            ? prev.filter((x) => x !== row.segment.id)
                            : [...prev, row.segment.id],
                        )
                      }
                    />
                  </td>
                  <td className="px-2 py-2 text-gray-500">{row.segment.nr}</td>
                  <td className="truncate px-2 py-2 text-xs text-gray-500">{row.segment.kapitel}</td>
                  <td className="px-2 py-2">
                    {row.segment.contentType === 'table' ? (
                      <div className="segment-table overflow-x-auto" dangerouslySetInnerHTML={{ __html: row.segment.text }} />
                    ) : (
                      <span className="whitespace-pre-line">{row.segment.text}</span>
                    )}
                    {row.segment.versionDiff && row.segment.versionDiff.status !== 'unverändert' && (
                      <span
                        className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                          row.segment.versionDiff.status === 'neu'
                            ? 'bg-green-100 text-green-700'
                            : row.segment.versionDiff.status === 'geändert'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {row.segment.versionDiff.status}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <TypBadge typ={row.segment.typ} />
                  </td>
                  <td className="px-2 py-2">
                    <SegmentStatusCell segment={row.segment} />
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-1">
                      {row.segment.abteilungen.map((a) => (
                        <AbteilungChip key={a} abteilung={a} />
                      ))}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        openSegment(row.segment.id);
                      }}
                    >
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ),
            )}
            {pageSegments.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                  Keine Segmente gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer bar */}
      <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
        <span>
          Zeige {filtered.length === 0 ? 0 : (page - 1) * ui.pageSize + 1}-{Math.min(page * ui.pageSize, filtered.length)} von{' '}
          {filtered.length}
        </span>
        <span className="flex items-center gap-2">
          Sichtbar pro Seite:
          <select
            value={ui.pageSize}
            onChange={(e) => {
              setTableUi(docId, { pageSize: Number(e.target.value), page: 1 });
              setPage(1);
            }}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </span>
        <span className="flex items-center gap-1">
          <button
            className="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            ‹
          </button>
          {pagination().map((p, i) =>
            p === '…' ? (
              <span key={`e${i}`} className="px-1 text-gray-400">
                …
              </span>
            ) : (
              <button
                key={p}
                className={`rounded px-2.5 py-1 ${p === page ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ),
          )}
          <button
            className="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-40"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            ›
          </button>
        </span>
      </div>

      {/* Modals */}
      {exporting && (
        <ExportModal
          anfrageName={anfrage.name}
          fileName={doc.fileName}
          segments={doc.segments}
          onClose={() => setExporting(false)}
        />
      )}
      {notifying && <NotifyModal anfrageName={anfrage.name} segments={doc.segments} onClose={() => setNotifying(false)} />}
      {uploading && <UploadModal anfrageId={anfrage.id} onClose={() => setUploading(false)} />}
      {versionConfirm && (
        <ConfirmDialog
          title="Versionsupdate"
          message={`Neue Version von „${doc.fileName}" hochladen und Versionsabgleich ausführen? (Mock: die Segmente werden als neu/geändert/entfernt/unverändert markiert.)`}
          confirmLabel="Versionsupdate ausführen"
          onCancel={() => setVersionConfirm(false)}
          onConfirm={() => {
            setVersionConfirm(false);
            runVersionsupdate(doc);
          }}
        />
      )}
      {zuweisungConfirm && (
        <ConfirmDialog
          title="Zuweisung Abteilungen"
          message={
            selected.length
              ? `KI-Zuweisung für ${selected.length} ausgewählte Segmente ausführen?`
              : 'KI-Zuweisung für alle Segmente des Dokuments ausführen?'
          }
          confirmLabel="Ausführen"
          onCancel={() => setZuweisungConfirm(false)}
          onConfirm={() => {
            setZuweisungConfirm(false);
            runZuweisungAbteilungen(doc, selected);
          }}
        />
      )}
      {renamingDoc && (
        <TextPromptDialog
          title="Dokument umbenennen"
          label="Dateiname"
          initial={doc.fileName}
          onCancel={() => setRenamingDoc(false)}
          onSubmit={(name) => {
            useStore.getState().renameDocument(doc.id, name);
            setRenamingDoc(false);
          }}
        />
      )}
    </div>
  );
}
