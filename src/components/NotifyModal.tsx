/**
 * §7 „Abteilungen Benachrichtigen" — open counts per department + mailto.
 */

import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import type { Segment } from '../types';
import { ALL_ABTEILUNGEN } from '../utils/status';
import { openCountsByAbteilung } from '../utils/actions';
import { Modal, PrimaryButton } from './ui';

export default function NotifyModal({
  anfrageName,
  segments,
  onClose,
}: {
  anfrageName: string;
  segments: Segment[];
  onClose: () => void;
}) {
  const counts = openCountsByAbteilung(segments);

  return (
    <Modal title="Abteilungen Benachrichtigen" onClose={onClose} width="max-w-lg">
      <ul className="divide-y divide-gray-100">
        {ALL_ABTEILUNGEN.map((a) => {
          const n = counts.get(a) ?? 0;
          const subject = encodeURIComponent(`${anfrageName} – ${n} offene Anforderungen für ${a}`);
          return (
            <li key={a} className="flex items-center justify-between py-2">
              <span>{a}</span>
              <div className="flex items-center gap-3">
                <span className={`text-sm ${n > 0 ? 'font-semibold text-orange-600' : 'text-gray-400'}`}>
                  {n} offen
                </span>
                <a
                  href={`mailto:?subject=${subject}`}
                  className={`inline-flex items-center gap-1 text-sm text-blue-700 hover:underline ${
                    n === 0 ? 'pointer-events-none opacity-40' : ''
                  }`}
                >
                  <Mail size={14} /> E-Mail
                </a>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex justify-end">
        <PrimaryButton
          onClick={() => {
            toast.success('Alle Abteilungen benachrichtigt');
            onClose();
          }}
        >
          Alle benachrichtigen
        </PrimaryButton>
      </div>
    </Modal>
  );
}
