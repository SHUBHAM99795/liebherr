/**
 * §6.7 Papierkorb — deleted Anfragen with restore / purge.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { useStore } from '../store';
import { formatDate } from '../utils/status';
import { ConfirmDialog, GhostButton, ToolbarButton } from '../components/ui';

export default function Papierkorb() {
  const anfragen = useStore((s) => s.anfragen);
  const deleted = anfragen.filter((a) => a.deleted);
  const { restoreAnfrage, purgeAnfrage } = useStore();
  const [purging, setPurging] = useState<{ id: string; name: string } | null>(null);

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Papierkorb</h1>
      <div className="rounded-lg border border-gray-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Dokumente</th>
              <th className="px-4 py-2">Gelöscht am</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {deleted.map((a) => (
              <tr key={a.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{a.name}</td>
                <td className="px-4 py-2 text-gray-600">{a.documents.length}</td>
                <td className="px-4 py-2 text-gray-600">{formatDate(a.createdAt)}</td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-2">
                    <ToolbarButton
                      onClick={() => {
                        restoreAnfrage(a.id);
                        toast(`„${a.name}" wiederhergestellt`);
                      }}
                    >
                      Wiederherstellen
                    </ToolbarButton>
                    <GhostButton className="text-red-600" onClick={() => setPurging({ id: a.id, name: a.name })}>
                      Endgültig löschen
                    </GhostButton>
                  </div>
                </td>
              </tr>
            ))}
            {deleted.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  Der Papierkorb ist leer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {purging && (
        <ConfirmDialog
          title="Endgültig löschen"
          message={`Anfrage „${purging.name}" endgültig löschen? Dies kann nicht rückgängig gemacht werden.`}
          confirmLabel="Endgültig löschen"
          onCancel={() => setPurging(null)}
          onConfirm={() => {
            purgeAnfrage(purging.id);
            setPurging(null);
            toast('Anfrage endgültig gelöscht');
          }}
        />
      )}
    </div>
  );
}
