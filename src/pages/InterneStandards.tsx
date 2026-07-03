/**
 * §6.7 Interne Standards — upload + list, used by Standardabgleich.
 */

import { Trash2, Upload } from 'lucide-react';
import { useRef } from 'react';
import { toast } from 'sonner';
import { useStore } from '../store';
import { formatDate } from '../utils/status';
import { PrimaryButton } from '../components/ui';

export default function InterneStandards() {
  const standards = useStore((s) => s.standards);
  const { addStandard, deleteStandard } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      addStandard({
        name: f.name.replace(/\.pdf$/i, ''),
        version: '1.0',
        uploadedAt: new Date().toISOString().slice(0, 10),
        keywords: [],
      });
    }
    toast(`${files.length} Standard${files.length > 1 ? 's' : ''} hochgeladen`);
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Interne Standards</h1>
          <p className="text-sm text-gray-500">Werksnormen für den Standardabgleich</p>
        </div>
        <PrimaryButton icon={<Upload size={16} />} onClick={() => fileRef.current?.click()}>
          Standard hochladen
        </PrimaryButton>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Version</th>
              <th className="px-4 py-2">Hochgeladen am</th>
              <th className="px-4 py-2">Schlüsselwörter</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {standards.map((st) => (
              <tr key={st.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{st.name}</td>
                <td className="px-4 py-2 text-gray-600">{st.version}</td>
                <td className="px-4 py-2 text-gray-600">{formatDate(st.uploadedAt)}</td>
                <td className="px-4 py-2 text-xs text-gray-500">{st.keywords.join(', ') || '–'}</td>
                <td className="px-4 py-2 text-right">
                  <button
                    className="rounded p-1 text-gray-500 hover:bg-gray-100"
                    title="Löschen"
                    onClick={() => deleteStandard(st.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {standards.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Keine internen Standards vorhanden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
