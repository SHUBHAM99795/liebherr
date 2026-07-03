/**
 * §6.6 Checklist items table (Regel / Ziel-Abteilung / Aktiv).
 */

import { ChevronLeft, Pencil, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Abteilung } from '../types';
import { useStore } from '../store';
import { ALL_ABTEILUNGEN } from '../utils/status';
import { PrimaryButton, TextPromptDialog, Toggle } from '../components/ui';

export default function ChecklistItems() {
  const { id } = useParams();
  const checkliste = useStore((s) => s.checklisten.find((c) => c.id === id));
  const { addChecklistItem, updateChecklistItem, deleteChecklistItem } = useStore();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<{ id: string; regel: string } | null>(null);

  if (!checkliste) {
    return <div className="p-6 text-gray-500">Checkliste nicht gefunden.</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-3 flex items-center gap-2 text-sm text-gray-500">
        <Link to="/check-lists" className="inline-flex items-center gap-1 text-blue-700 hover:underline">
          <ChevronLeft size={14} /> AI Checklisten
        </Link>
        <span>›</span>
        <span className="font-semibold text-gray-800">{checkliste.name}</span>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h1 className="font-semibold">Prüfkriterien</h1>
          <PrimaryButton icon={<Plus size={16} />} onClick={() => setAdding(true)}>
            Neues Prüfkriterium
          </PrimaryButton>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
              <th className="px-4 py-2">Regel / Prüfkriterium</th>
              <th className="px-4 py-2 w-64">Ziel-Abteilung</th>
              <th className="px-4 py-2 w-20">Aktiv</th>
              <th className="px-4 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {checkliste.items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-2">{item.regel}</td>
                <td className="px-4 py-2">
                  <select
                    value={item.zielAbteilung ?? ''}
                    onChange={(e) =>
                      updateChecklistItem(checkliste.id, item.id, {
                        zielAbteilung: (e.target.value || undefined) as Abteilung | undefined,
                      })
                    }
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                  >
                    <option value="">–</option>
                    {ALL_ABTEILUNGEN.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <Toggle checked={item.aktiv} onChange={(v) => updateChecklistItem(checkliste.id, item.id, { aktiv: v })} />
                </td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-1">
                    <button
                      className="rounded p-1 text-gray-500 hover:bg-gray-100"
                      title="Bearbeiten"
                      onClick={() => setEditing({ id: item.id, regel: item.regel })}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="rounded p-1 text-gray-500 hover:bg-gray-100"
                      title="Löschen"
                      onClick={() => deleteChecklistItem(checkliste.id, item.id)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {checkliste.items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  Keine Prüfkriterien vorhanden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {adding && (
        <TextPromptDialog
          title="Neues Prüfkriterium"
          label="Regel / Prüfkriterium"
          onCancel={() => setAdding(false)}
          onSubmit={(regel) => {
            addChecklistItem(checkliste.id, { regel, aktiv: true });
            setAdding(false);
          }}
        />
      )}
      {editing && (
        <TextPromptDialog
          title="Prüfkriterium bearbeiten"
          label="Regel / Prüfkriterium"
          initial={editing.regel}
          onCancel={() => setEditing(null)}
          onSubmit={(regel) => {
            updateChecklistItem(checkliste.id, editing.id, { regel });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
