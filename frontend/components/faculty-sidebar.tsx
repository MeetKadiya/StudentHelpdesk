"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface FacultySidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FacultyNavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  badge?: string;
}

const FACULTY_NAV: FacultyNavItem[] = [
  {
    id: "faculty-workspace",
    label: "Faculty Workspace",
    href: "/faculty",
    icon: "👨‍🏫",
  },
  {
    id: "routed-inquiries",
    label: "Student Inquiries",
    href: "/faculty#inquiries",
    icon: "📥",
    badge: "Active",
  },
  {
    id: "teaching-courses",
    label: "Teaching Courses",
    href: "/faculty#teaching",
    icon: "📖",
  },
  {
    id: "consultation-hours",
    label: "Consultation Hours",
    href: "/faculty#consultation",
    icon: "⏱️",
  },
  {
    id: "campus-services",
    label: "Campus Services Directory",
    href: "/services",
    icon: "🏛️",
  },
];

export function FacultySidebar({ isOpen, onClose }: FacultySidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
          <Link href="/faculty" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-700 text-white font-bold text-lg shadow-sm">
              👨‍🏫
            </div>
            <div className="leading-tight">
              <span className="block font-black tracking-tight text-xs text-purple-950 uppercase">
                CAMPUS PORTAL
              </span>
              <span className="block font-semibold tracking-wider text-[10px] text-purple-700 uppercase">
                FACULTY & ADVISING
              </span>
              <span className="block text-[8px] tracking-wider text-slate-400 font-medium">
                ACADEMIC OPERATIONS
              </span>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
            aria-label="Close sidebar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-thin">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-purple-800">
            Faculty Management
          </div>

          {FACULTY_NAV.map((item) => {
            const isActive =
              item.href === "/faculty"
                ? pathname === "/faculty"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onClose}
                className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-purple-50 text-purple-900 border border-purple-200 shadow-xs"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom Institutional Info */}
        <div className="border-t border-slate-200 p-4 bg-slate-50/70 text-slate-500 text-[11px] space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-slate-700">Faculty Desk Online</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Staff IT Support: <strong className="text-slate-600">helpdesk@university.edu</strong>
          </p>
        </div>
      </aside>
    </>
  );
}
