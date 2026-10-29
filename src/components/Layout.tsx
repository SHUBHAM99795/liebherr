/**
 * App shell (§5): top bar with hamburger + wordmark, collapsible left
 * sidebar, user icon top-right.
 */

import { ClipboardList, Database, FileText, Menu, Settings, Trash2, UserRound } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const NAV = [
  { to: '/anfragen', label: 'Anfragen', icon: FileText },
  { to: '/papierkorb', label: 'Papierkorb', icon: Trash2 },
  { gap: true },
  { to: '/interne-standards', label: 'Interne Standards', icon: Database },
  { to: '/einstellungen', label: 'Einstellungen', icon: Settings },
  { to: '/check-lists', label: 'AI Checklisten', icon: ClipboardList },
] as const;

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-3">
        <div className="flex items-center gap-2">
          <button
            className="rounded p-1.5 text-gray-600 hover:bg-gray-100"
            onClick={() => setCollapsed((c) => !c)}
            aria-label="Seitenleiste umschalten"
          >
            <Menu size={18} />
          </button>
          <span className="text-lg font-bold tracking-tight">
            <span className="text-[#e11d48]">Spec</span>
            <span className="text-[#2563eb]">Matrix</span>
          </span>
        </div>
        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">
          <UserRound size={16} />
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {!collapsed && (
          <aside className="w-[210px] shrink-0 border-r border-gray-200 bg-white py-3">
            <nav className="flex flex-col gap-0.5 px-2">
              {NAV.map((item, i) =>
                'gap' in item ? (
                  <div key={i} className="my-3 border-t border-gray-100" />
                ) : (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                        isActive ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                      }`
                    }
                  >
                    <item.icon size={16} />
                    {item.label}
                  </NavLink>
                ),
              )}
            </nav>
          </aside>
        )}
        <main className="min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
