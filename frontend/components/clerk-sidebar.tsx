"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface ClerkSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ClerkNavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  badge?: string;
}

const CLERK_NAV: ClerkNavItem[] = [
  {
    id: "clerk-desk",
    label: "Clerk Intake Desk",
    href: "/clerk",
    icon: "📋",
  },
  {
    id: "campus-services",
    label: "Campus Services",
    href: "/services",
    icon: "🏛️",
  },
];

export function ClerkSidebar({ isOpen, onClose }: ClerkSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs transition-opacity lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600 text-white font-bold text-lg shadow-sm">
              📋
            </div>
            <div>
              <div className="font-extrabold text-sm text-slate-900 leading-tight">Clerk Portal</div>
              <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">Triage & Forwarding</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              Clerk Operations
            </div>
            <nav className="space-y-1">
              {CLERK_NAV.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/clerk" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => {
                      if (typeof window !== "undefined" && window.innerWidth < 1024) onClose();
                    }}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-amber-500/10 text-amber-900 font-bold"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-950 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-amber-900">
              <span>⚡ Desk Operations</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Triage student queries and route them to designated authorities based on <strong>Branch</strong> and <strong>Semester</strong>.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-3 px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-600 text-white font-bold text-xs shadow-xs">
              CK
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">HelpDesk Clerk</div>
              <div className="text-[10px] text-slate-500 truncate">Front-Desk Authority</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
