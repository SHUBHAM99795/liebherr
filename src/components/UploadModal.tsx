/**
 * §6.2 upload modal „Anforderungsdokumente Hinzufügen".
 * With "Matrix automatisch erstellen" enabled (default), every uploaded PDF
 * runs the full pipeline: segmentation + KI-Zuweisung + Standardabgleich +
 * Historienabgleich — the caller is then navigated to the finished matrix.
 */

import { CheckCircle2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { readPageCount } from '../pdf';
import { savePdfBlob } from '../services/persistence';
import { useStore } from '../store';
import { generateMatrix } from '../utils/actions';
import { Modal, PrimaryButton } from './ui';

export default function UploadModal({
  anfrageId,
  onClose,
  onUploaded,
}: {
  anfrageId: string;
  onClose: () => void;
  /** called after the pipeline finished, with the new document ids */
  onUploaded?: (docIds: string[]) => void;
}) {
  const addDocuments = useStore((s) => s.addDocuments);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [autoMatrix, setAutoMatrix] = useState(true);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (list: FileList | null) => {
    if (!list) return;
    const pdfs = Array.from(list).filter((f) => f.name.toLowerCase().endsWith('.pdf'));
    setFiles((prev) => [...prev, ...pdfs]);
  };

  const upload = async () => {
    setBusy(true);
    const entries = await Promise.all(
      files.map(async (f) => {
        const pdfUrl = URL.createObjectURL(f);
        let pageCount = 0;
        try {
          pageCount = await readPageCount(pdfUrl);
        } catch {
          // not a readable PDF — keep it listed, viewer will show an error
        }
        return { file: f, pdfUrl, pageCount };
      }),
    );
    const docs = addDocuments(
      anfrageId,
      entries.map((e) => ({ fileName: e.file.name, pdfUrl: e.pdfUrl, pageCount: e.pageCount })),
    );
    // persist the raw PDF bytes so the file survives page reloads
    await Promise.all(docs.map((d, i) => savePdfBlob(d.id, entries[i].file)));
    toast.success(`${files.length} Dokument${files.length > 1 ? 'e' : ''} hochgeladen`);

    if (autoMatrix) {
      for (const d of docs) {
        await generateMatrix(d.id);
      }
    }
    setBusy(false);
    onClose();
    onUploaded?.(docs.map((d) => d.id));
  };

  return (
    <Modal title="Anforderungsdokumente Hinzufügen" onClose={onClose} width="max-w-lg">
      <div
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center ${
          dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files);
        }}
      >
        {files.length > 0 ? (
          <>
            <CheckCircle2 size={36} className="mb-2 text-green-600" />
            <p className="font-medium">
              {files.length} {files.length === 1 ? 'Datei ausgewählt' : 'Dateien ausgewählt'}
            </p>
            <p className="mt-1 text-xs text-gray-500">Klicken oder ziehen Sie einen neuen Ordner zum Hochladen</p>
          </>
        ) : (
          <>
            <Upload size={36} className="mb-2 text-gray-400" />
            <p className="text-gray-600">PDF-Dateien hierher ziehen oder klicken zum Auswählen</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {files.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-sm font-medium">Ausgewählte Dateien:</p>
          <ul className="text-xs text-gray-500">
            {files.map((f, i) => (
              <li key={i}>{f.name}</li>
            ))}
          </ul>
        </div>
      )}

      <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 accent-blue-600"
          checked={autoMatrix}
          onChange={(e) => setAutoMatrix(e.target.checked)}
        />
        Matrix automatisch erstellen (Segmentierung + KI-Zuweisung + Abgleiche)
      </label>

      <div className="mt-4 flex justify-end">
        <PrimaryButton icon={<Upload size={14} />} disabled={files.length === 0 || busy} onClick={upload}>
          {busy ? 'Matrix wird erstellt…' : `Upload (${files.length})`}
        </PrimaryButton>
      </div>
    </Modal>
  );
}
