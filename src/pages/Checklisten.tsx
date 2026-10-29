/**
 * §6.6 AI Checklisten overview.
 */

import { Folder, Pencil, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { ConfirmDialog, PrimaryButton, TextPromptDialog } from '../components/ui';

export default function Checklisten() {
  const checklisten = useStore((s) => s.checklisten);
  const { addCheckliste, renameCheckliste, deleteCheckliste } = useStore();
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);

  return (
    <div className="p-6">
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h1 className="text-lg font-semibold">AI Checklisten</h1>
            <p className="text-sm text-gray-500">Verwaltung von AI Checklisten</p>
          </div>
          <PrimaryButton icon={<Plus size={16} />} onClick={() => setCreating(true)}>
            Neue Checkliste
          </PrimaryButton>
        </div>
        <ul className="divide-y divide-gray-100">
          {checklisten.map((cl) => (
            <li key={cl.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
              <Folder size={16} className="text-gray-400" />
              <Link to={`/check-lists/${cl.id}/items`} className="flex-1 font-medium text-blue-700 hover:underline">
                {cl.name}
              </Link>
              <span className="text-xs text-gray-400">{cl.items.length} Prüfkriterien</span>
              <button
                className="rounded p-1 text-gray-500 hover:bg-gray-100"
                title="Umbenennen"
                onClick={() => setRenaming({ id: cl.id, name: cl.name })}
              >
                <Pencil size={14} />
              </button>
              <button
                className="rounded p-1 text-gray-500 hover:bg-gray-100"
                title="Löschen"
                onClick={() => setDeleting({ id: cl.id, name: cl.name })}
              >
                <X size={14} />
              </button>
            </li>
          ))}
          {checklisten.length === 0 && <li className="px-5 py-8 text-center text-gray-400">Keine Checklisten vorhanden.</li>}
        </ul>
      </div>

      {creating && (
        <TextPromptDialog
          title="Neue Checkliste"
          label="Name"
          onCancel={() => setCreating(false)}
          onSubmit={(name) => {
            addCheckliste(name);
            setCreating(false);
          }}
        />
      )}
      {renaming && (
        <TextPromptDialog
          title="Checkliste umbenennen"
          label="Name"
          initial={renaming.name}
          onCancel={() => setRenaming(null)}
          onSubmit={(name) => {
            renameCheckliste(renaming.id, name);
            setRenaming(null);
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Checkliste löschen"
          message={`Checkliste „${deleting.name}" wirklich löschen?`}
          confirmLabel="Löschen"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            deleteCheckliste(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}
