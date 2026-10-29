/**
 * §6.1 Anfragen list.
 */

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useStore } from '../store';
import { computeCounts, formatDate } from '../utils/status';
import { PrimaryButton, TextPromptDialog } from '../components/ui';

function defaultAnfrageName(): string {
  const d = new Date();
  return `Neue Anfrage ${d.getDate()}.${d.getMonth() + 1}.${String(d.getFullYear()).slice(2)}`;
}

export default function AnfragenList() {
  const alleAnfragen = useStore((s) => s.anfragen);
  const anfragen = alleAnfragen.filter((a) => !a.deleted);
  const { addAnfrage, renameAnfrage, deleteAnfrage } = useStore();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Anfragen</h1>
        <PrimaryButton icon={<Plus size={16} />} onClick={() => setCreating(true)}>
          Neue Anfrage
        </PrimaryButton>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Erstellt am</th>
              <th className="px-4 py-2">Dokumente</th>
              <th className="px-4 py-2 w-52">Fortschritt</th>
              <th className="px-4 py-2 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {anfragen.map((a) => {
              const segments = a.documents.flatMap((d) => d.segments);
              const c = computeCounts(segments);
              const pct = c.anforderungen ? Math.round((c.erfuellt / c.anforderungen) * 100) : 0;
              return (
                <tr key={a.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link to={`/anfrage/${a.id}`} className="font-medium text-blue-700 hover:underline">
                      {a.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{formatDate(a.createdAt)}</td>
                  <td className="px-4 py-2 text-gray-600">{a.documents.length}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                        <div className="h-full bg-green-600" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-9 text-right text-xs text-gray-500">{pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <button
                        className="rounded p-1 text-gray-500 hover:bg-gray-100"
                        title="Umbenennen"
                        onClick={() => setRenaming({ id: a.id, name: a.name })}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="rounded p-1 text-gray-500 hover:bg-gray-100"
                        title="Löschen"
                        onClick={() => {
                          deleteAnfrage(a.id);
                          toast(`„${a.name}" in den Papierkorb verschoben`);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {anfragen.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Keine Anfragen vorhanden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <TextPromptDialog
          title="Neue Anfrage"
          label="Name"
          initial={defaultAnfrageName()}
          onCancel={() => setCreating(false)}
          onSubmit={(name) => {
            const a = addAnfrage(name);
            setCreating(false);
            navigate(`/anfrage/${a.id}`);
          }}
        />
      )}
      {renaming && (
        <TextPromptDialog
          title="Anfrage umbenennen"
          label="Name"
          initial={renaming.name}
          onCancel={() => setRenaming(null)}
          onSubmit={(name) => {
            renameAnfrage(renaming.id, name);
            setRenaming(null);
          }}
        />
      )}
    </div>
  );
}
