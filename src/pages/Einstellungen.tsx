/**
 * §6.7 Einstellungen — Abteilungen list, default export language,
 * items per page.
 */

import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../store';
import { GhostButton, PrimaryButton, TextPromptDialog } from '../components/ui';

export default function Einstellungen() {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState<number | null>(null);

  const updateAbteilungen = (next: { name: string; color: string }[]) => setSettings({ abteilungen: next });

  return (
    <div className="max-w-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Einstellungen</h1>

      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-2 font-semibold">Abteilungen</h2>
        <ul className="divide-y divide-gray-100">
          {settings.abteilungen.map((a, i) => (
            <li key={a.name} className="flex items-center gap-3 py-2">
              <input
                type="color"
                value={a.color}
                onChange={(e) =>
                  updateAbteilungen(settings.abteilungen.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)))
                }
                className="h-5 w-5 cursor-pointer rounded-full border-0 bg-transparent p-0"
                title="Farbe"
              />
              <span className="flex-1">{a.name}</span>
              <GhostButton onClick={() => setRenaming(i)}>Umbenennen</GhostButton>
              <button
                className="rounded p-1 text-gray-500 hover:bg-gray-100"
                onClick={() => updateAbteilungen(settings.abteilungen.filter((_, j) => j !== i))}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
        <PrimaryButton icon={<Plus size={14} />} className="mt-2" onClick={() => setAdding(true)}>
          Abteilung hinzufügen
        </PrimaryButton>
      </div>

      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-2 font-semibold">Export</h2>
        <label className="mb-1 block text-xs font-medium text-gray-600">Standard-Exportsprache</label>
        <select
          value={settings.exportLanguage}
          onChange={(e) => setSettings({ exportLanguage: e.target.value as 'Deutsch' | 'Englisch' })}
          className="w-48 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option>Deutsch</option>
          <option>Englisch</option>
        </select>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-2 font-semibold">Tabelle</h2>
        <label className="mb-1 block text-xs font-medium text-gray-600">Sichtbar pro Seite (Standard)</label>
        <select
          value={settings.itemsPerPage}
          onChange={(e) => setSettings({ itemsPerPage: Number(e.target.value) })}
          className="w-48 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      {adding && (
        <TextPromptDialog
          title="Abteilung hinzufügen"
          label="Name"
          onCancel={() => setAdding(false)}
          onSubmit={(name) => {
            updateAbteilungen([...settings.abteilungen, { name, color: '#6b7280' }]);
            setAdding(false);
          }}
        />
      )}
      {renaming !== null && (
        <TextPromptDialog
          title="Abteilung umbenennen"
          label="Name"
          initial={settings.abteilungen[renaming].name}
          onCancel={() => setRenaming(null)}
          onSubmit={(name) => {
            updateAbteilungen(settings.abteilungen.map((x, j) => (j === renaming ? { ...x, name } : x)));
            setRenaming(null);
          }}
        />
      )}
    </div>
  );
}
