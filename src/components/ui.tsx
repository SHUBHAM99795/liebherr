/**
 * Small UI primitives (buttons, modal, dropdown, filter dropdown) in the
 * toolbar/dialog style defined in §4 of the build prompt.
 */

import { ChevronDown, Filter, X } from 'lucide-react';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

/* ---------------- buttons -------------------------------------------- */

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ReactNode };

/** Outlined blue toolbar button. */
export function ToolbarButton({ icon, children, className = '', ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={`inline-flex h-8 items-center gap-1 rounded-md border border-blue-600 bg-white px-3 text-sm text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-white ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}

/** Solid blue primary button. */
export function PrimaryButton({ icon, children, className = '', ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={`inline-flex h-8 items-center gap-1 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}

export function GhostButton({ icon, children, className = '', ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={`inline-flex h-8 items-center gap-1 rounded-md px-3 text-sm text-gray-600 hover:bg-gray-100 ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}

/* ---------------- modal ----------------------------------------------- */

export function Modal({
  title,
  onClose,
  children,
  width = 'max-w-2xl',
}: {
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div
        className={`w-full ${width} rounded-lg bg-white shadow-xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label="Schließen">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'OK',
  onConfirm,
  onCancel,
}: {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={title} onClose={onCancel} width="max-w-md">
      <div className="text-sm text-gray-700">{message}</div>
      <div className="mt-4 flex justify-end gap-2">
        <GhostButton onClick={onCancel}>Abbrechen</GhostButton>
        <PrimaryButton onClick={onConfirm}>{confirmLabel}</PrimaryButton>
      </div>
    </Modal>
  );
}

/* ---------------- dropdown -------------------------------------------- */

const DropdownCtx = createContext<{ close: () => void } | null>(null);

export function Dropdown({
  trigger,
  children,
  align = 'left',
}: {
  trigger: (open: boolean) => React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <div onClick={() => setOpen((o) => !o)}>{trigger(open)}</div>
      {open && (
        <DropdownCtx.Provider value={{ close: () => setOpen(false) }}>
          <div
            className={`absolute z-40 mt-1 min-w-[220px] rounded-md border border-gray-200 bg-white py-1 shadow-lg ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            {children}
          </div>
        </DropdownCtx.Provider>
      )}
    </div>
  );
}

export function DropdownItem({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  const ctx = useContext(DropdownCtx);
  return (
    <button
      className="block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
      onClick={() => {
        onClick?.();
        ctx?.close();
      }}
    >
      {children}
    </button>
  );
}

/* ---------------- filter dropdown (multi-select, §6.3) ---------------- */

export function FilterDropdown<T extends string>({
  label,
  options,
  selected,
  onChange,
  renderOption,
}: {
  label: string;
  options: { value: T; label: React.ReactNode }[];
  selected: T[];
  onChange: (next: T[]) => void;
  renderOption?: (o: { value: T; label: React.ReactNode }) => React.ReactNode;
}) {
  const toggle = (v: T) => {
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  };
  return (
    <Dropdown
      align="right"
      trigger={(open) => (
        <button
          className={`inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs ${
            selected.length ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-600'
          } hover:bg-gray-50`}
        >
          <Filter size={12} />
          {label}
          {selected.length > 0 && (
            <span className="rounded-full bg-blue-600 px-1.5 text-[10px] font-semibold text-white">
              {selected.length}
            </span>
          )}
          <ChevronDown size={12} className={open ? 'rotate-180 transition' : 'transition'} />
        </button>
      )}
    >
      <div className="max-h-72 overflow-y-auto">
        {options.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-blue-600"
              checked={selected.includes(o.value)}
              onChange={() => toggle(o.value)}
            />
            {renderOption ? renderOption(o) : o.label}
          </label>
        ))}
      </div>
    </Dropdown>
  );
}

/* ---------------- misc ------------------------------------------------ */

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-600">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${
            checked ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </button>
      {label}
    </label>
  );
}

export function TextPromptDialog({
  title,
  label,
  initial = '',
  onSubmit,
  onCancel,
}: {
  title: string;
  label?: string;
  initial?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <Modal title={title} onClose={onCancel} width="max-w-md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onSubmit(value.trim());
        }}
      >
        {label && <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>}
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
        <div className="mt-4 flex justify-end gap-2">
          <GhostButton type="button" onClick={onCancel}>
            Abbrechen
          </GhostButton>
          <PrimaryButton type="submit">Speichern</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
