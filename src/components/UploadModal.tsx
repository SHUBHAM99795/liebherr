/**
 * §6.2 upload modal „Anforderungsdokumente Hinzufügen".
 */

import { CheckCircle2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { readPageCount } from '../pdf';
import { savePdfBlob } from '../services/persistence';
import { useStore } from '../store';
import { Modal, PrimaryButton } from './ui';

export default function UploadModal({ anfrageId, onClose }: { anfrageId: string; onClose: () => void }) {
  const addDocuments = useStore((s) => s.addDocuments);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (list: FileList | null) => {
    if (!list) return;
    const pdfs = Array.from(list).filter((f) => f.name.toLowerCase().endsWith('.pdf'));
    setFiles((prev) => [...prev, ...pdfs]);
  };

  const [busy, setBusy] = useState(false);

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
    setBusy(false);
    toast.success(`${files.length} Dokument${files.length > 1 ? 'e' : ''} hochgeladen`);
    onClose();
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

      <div className="mt-4 flex justify-end">
        <PrimaryButton icon={<Upload size={14} />} disabled={files.length === 0 || busy} onClick={upload}>
          {busy ? 'Wird hochgeladen…' : `Upload (${files.length})`}
        </PrimaryButton>
      </div>
    </Modal>
  );
}
