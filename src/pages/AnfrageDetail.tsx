/**
 * §6.2 Anfrage detail — documents view with bulk action bar + upload modal.
 */

import {
  Download,
  Eye,
  Home,
  Import,
  Info,
  LayoutList,
  List,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Table2,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useStore } from '../store';
import { segmentationService } from '../services/segmentation';
import { formatDate } from '../utils/status';
import { runExcelImport, runHistorienabgleich, runStandardabgleich, runZuweisungAbteilungen } from '../utils/actions';
import { Dropdown, DropdownItem, TextPromptDialog, ToolbarButton } from '../components/ui';
import ExportModal from '../components/ExportModal';
import UploadModal from '../components/UploadModal';

export default function AnfrageDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const anfrage = useStore((s) => s.anfragen.find((a) => a.id === id));
  const { renameAnfrage, removeDocuments, setDocument, replaceSegments } = useStore();

  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [exporting, setExporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  if (!anfrage || anfrage.deleted) return <div className="p-6 text-gray-500">Anfrage nicht gefunden.</div>;

  const docs = anfrage.documents.filter(
    (d) =>
      d.fileName.toLowerCase().includes(search.toLowerCase()) &&
      (!statusFilter || d.segmentierungsStatus === statusFilter),
  );
  const selectedDocs = anfrage.documents.filter((d) => selected.includes(d.id));
  const hasSelection = selected.length > 0;

  const toggleDoc = (docId: string) =>
    setSelected((prev) => (prev.includes(docId) ? prev.filter((x) => x !== docId) : [...prev, docId]));

  const segmentDoc = async (doc: (typeof anfrage.documents)[number]): Promise<number> => {
    setDocument(doc.id, { segmentierungsStatus: 'In Bearbeitung' });
    try {
      const segments = await segmentationService.segment(doc.pdfUrl);
      replaceSegments(doc.id, segments);
      setDocument(doc.id, {
        segmentierungsStatus: 'Segmentiert',
        pageCount: Math.max(doc.pageCount, ...segments.map((s) => s.page), 1),
      });
      return segments.length;
    } catch (e) {
      setDocument(doc.id, { segmentierungsStatus: 'Nicht segmentiert' });
      toast.error(`Segmentierung von ${doc.fileName} fehlgeschlagen`);
      return 0;
    }
  };

  const segmentSelected = async () => {
    const id = toast.loading('Segmentierung läuft…');
    let total = 0;
    for (const doc of selectedDocs) {
      if (doc.segmentierungsStatus === 'Segmentiert') continue;
      total += await segmentDoc(doc);
    }
    toast.success(`${total} Segmente erstellt`, { id });
  };

  const onImport = async (file: File) => {
    const doc = selectedDocs[0] ?? anfrage.documents[0];
    if (!doc) return;
    const { updated, unmatched } = await runExcelImport(file, doc);
    toast.success(`${updated} Segmente aktualisiert, ${unmatched} Zeilen ohne Treffer`);
  };

  return (
    <div className="p-6">
      {/* H1 row */}
      <div className="mb-3 flex items-center gap-2">
        <h1 className="text-xl font-semibold">{anfrage.name}</h1>
        <button className="rounded p-1 text-gray-500 hover:bg-gray-100" onClick={() => setRenaming(true)}>
          <Pencil size={15} />
        </button>
        <button className="rounded p-1 text-gray-500 hover:bg-gray-100">
          <Eye size={15} />
        </button>
      </div>

      {/* Toolbar row */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="mr-2 flex items-center rounded-md border border-gray-300 bg-white">
          <button className="rounded-l-md bg-blue-50 p-1.5 text-blue-700">
            <List size={15} />
          </button>
          <button className="p-1.5 text-gray-400 hover:bg-gray-50">
            <Info size={15} />
          </button>
          <button className="p-1.5 text-gray-400 hover:bg-gray-50">
            <Table2 size={15} />
          </button>
          <button className="rounded-r-md p-1.5 text-gray-400 hover:bg-gray-50">
            <LayoutList size={15} />
          </button>
        </div>
        <ToolbarButton icon={<Plus size={14} />} onClick={() => setUploading(true)}>
          Anfragepaket
        </ToolbarButton>
        <ToolbarButton
          icon={<Plus size={14} />}
          onClick={() => toast('Versionsupdate: bitte im Dokument ausführen (Segmentansicht)')}
        >
          Versionsupdate
        </ToolbarButton>
        <Dropdown
          trigger={() => <ToolbarButton icon={<Import size={14} />}>Import ▾</ToolbarButton>}
        >
          <DropdownItem onClick={() => importRef.current?.click()}>Excel-Import</DropdownItem>
        </Dropdown>
        <ToolbarButton icon={<Download size={14} />} onClick={() => setExporting(true)}>
          Export Excel
        </ToolbarButton>
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

      {/* Search + status filter */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="relative max-w-md flex-1">
          <Search size={14} className="absolute left-2.5 top-2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filterung nach Dokumentenname"
            className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-600"
        >
          <option value="">Segmentierungsstatus</option>
          <option>Nicht segmentiert</option>
          <option>In Bearbeitung</option>
          <option>Segmentiert</option>
        </select>
      </div>

      {/* Bulk action bar */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex h-7 items-center gap-1 rounded-md border border-gray-300 bg-white px-2 text-gray-600">
          {selected.length} Dokumente gewählt
        </span>
        <ToolbarButton
          className="!h-7 !text-xs"
          icon={<Info size={12} />}
          disabled={!hasSelection}
          onClick={async () => {
            for (const d of selectedDocs) await runZuweisungAbteilungen(d);
          }}
        >
          Zuweisung Abteilungen
        </ToolbarButton>
        <ToolbarButton
          className="!h-7 !text-xs"
          icon={<Info size={12} />}
          disabled={!hasSelection}
          onClick={async () => {
            for (const d of selectedDocs) await runStandardabgleich(d);
          }}
        >
          Standardabgleich
        </ToolbarButton>
        <ToolbarButton
          className="!h-7 !text-xs"
          icon={<Info size={12} />}
          disabled={!hasSelection}
          onClick={async () => {
            for (const d of selectedDocs) await runHistorienabgleich(d);
          }}
        >
          Historienabgleich
        </ToolbarButton>
        <ToolbarButton className="!h-7 !text-xs" icon={<RefreshCw size={12} />} disabled={!hasSelection} onClick={segmentSelected}>
          Segmentieren
        </ToolbarButton>
        <ToolbarButton className="!h-7 !text-xs" icon={<Home size={12} />} disabled={!hasSelection} onClick={() => toast('Tags (Demo)')}>
          Tags
        </ToolbarButton>
        <ToolbarButton
          className="!h-7 !text-xs"
          icon={<X size={12} />}
          disabled={!hasSelection}
          onClick={() => {
            removeDocuments(anfrage.id, selected);
            setSelected([]);
            toast('Dokumente entfernt');
          }}
        >
          Entfernen
        </ToolbarButton>
        <ToolbarButton className="!h-7 !text-xs" disabled={!hasSelection} onClick={() => setExporting(true)}>
          Export excel
        </ToolbarButton>
        <ToolbarButton className="!h-7 !text-xs" disabled={!hasSelection} onClick={() => setExporting(true)}>
          Custom Export
        </ToolbarButton>
      </div>

      {/* Document rows */}
      <div className="rounded-lg border border-gray-200 bg-white">
        {docs.map((d) => (
          <div key={d.id} className="flex items-center gap-3 border-b border-gray-100 px-4 py-2.5 last:border-0 hover:bg-gray-50">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-blue-600"
              checked={selected.includes(d.id)}
              onChange={() => toggleDoc(d.id)}
            />
            <button
              className="flex-1 truncate text-left font-medium text-blue-700 hover:underline"
              onClick={() => navigate(`/anfrage/${anfrage.id}/details?view=doc-details&specDocId=${d.id}&page=1`)}
            >
              {d.fileName}
            </button>
            <span className="w-24 text-gray-500">{d.pageCount} Seiten</span>
            <span className="w-28 text-gray-500">{d.segments.length} Segmente</span>
            <span
              className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs ${
                d.segmentierungsStatus === 'Segmentiert'
                  ? 'border-green-600 bg-green-50 text-green-700'
                  : d.segmentierungsStatus === 'In Bearbeitung'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-400 bg-gray-50 text-gray-600'
              }`}
            >
              {d.segmentierungsStatus}
            </span>
            {d.segmentierungsStatus === 'Nicht segmentiert' && (
              <ToolbarButton
                className="!h-7 !text-xs"
                icon={<RefreshCw size={12} />}
                onClick={async () => {
                  const id = toast.loading('Segmentierung läuft…');
                  const n = await segmentDoc(d);
                  toast.success(`${n} Segmente erstellt`, { id });
                }}
              >
                Segmentieren
              </ToolbarButton>
            )}
            <span className="w-24 text-right text-gray-500">{formatDate(d.uploadedAt)}</span>
          </div>
        ))}
        {docs.length === 0 && <div className="px-4 py-8 text-center text-gray-400">Keine Dokumente vorhanden.</div>}
      </div>

      {uploading && <UploadModal anfrageId={anfrage.id} onClose={() => setUploading(false)} />}
      {renaming && (
        <TextPromptDialog
          title="Anfrage umbenennen"
          label="Name"
          initial={anfrage.name}
          onCancel={() => setRenaming(false)}
          onSubmit={(name) => {
            renameAnfrage(anfrage.id, name);
            setRenaming(false);
          }}
        />
      )}
      {exporting && (
        <ExportModal
          anfrageName={anfrage.name}
          fileName={selectedDocs[0]?.fileName ?? anfrage.documents[0]?.fileName ?? 'Export'}
          segments={(selectedDocs.length ? selectedDocs : anfrage.documents).flatMap((d) => d.segments)}
          onClose={() => setExporting(false)}
        />
      )}
      <div className="mt-2">
        <Link to="/anfragen" className="text-sm text-blue-700 hover:underline">
          ‹ Zurück zur Übersicht
        </Link>
      </div>
    </div>
  );
}
