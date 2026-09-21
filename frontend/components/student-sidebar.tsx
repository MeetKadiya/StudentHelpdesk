"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface StudentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeSection?: string;
  onSelectSection?: (sectionId: string) => void;
}

interface NavSubItem {
  id: string;
  label: string;
  href?: string;
  sectionId?: string;
}

interface NavItem {
  id: string;
  label: string;
  href?: string;
  sectionId?: string;
  iconType:
    | "profile"
    | "payments"
    | "receipt"
    | "certificate"
    | "exam"
    | "enrollment"
    | "assignment"
    | "library"
    | "attendance"
    | "timetable"
    | "services"
    | "helpdesk";
  badge?: string;
  children?: NavSubItem[];
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "profile",
    label: "My Profile",
    sectionId: "profile-section",
    iconType: "profile",
  },
  {
    id: "attendance",
    label: "Attendance",
    iconType: "attendance",
    children: [
      { id: "attendance-overall", label: "Overall Attendance", href: "/attendance" },
      { id: "attendance-datewise", label: "Datewise Attendance", href: "/attendance/datewise" },
    ],
  },
  {
    id: "timetable",
    label: "Timetable",
    sectionId: "timetable-section",
    iconType: "timetable",
  },
  {
    id: "payments",
    label: "Payments",
    iconType: "payments",
    children: [
      { id: "pay-dues", label: "Current Dues & Pay", sectionId: "fees-section" },
      { id: "fees-receipt", label: "Fees Receipt Transaction", href: "/fees/history" },
    ],
  },
  {
    id: "exam",
    label: "Exam",
    iconType: "exam",
    children: [
      { id: "exam-hub", label: "Schedule & Hall Ticket", href: "/exam" },
      { id: "exam-results", label: "Provisional Result", href: "/exam/results" },
    ],
  },
  {
    id: "services",
    label: "Campus Services",
    href: "/services",
    iconType: "services",
    badge: "9 Active",
  },
  {
    id: "helpdesk",
    label: "My Tickets & Inquiries",
    href: "/tickets",
    iconType: "helpdesk",
  },
  {
    id: "certificate",
    label: "Certificates (Bonafide)",
    href: "/services",
    iconType: "certificate",
  },
  {
    id: "enrollment",
    label: "Enrollment Process",
    href: "/services",
    iconType: "enrollment",
  },
  {
    id: "assignment",
    label: "Assignments",
    sectionId: "timetable-section",
    iconType: "assignment",
  },
  {
    id: "subject-library",
    label: "Subject Library",
    sectionId: "attendance-section",
    iconType: "library",
  },
];

function NavIcon({ type }: { type: NavItem["iconType"] }) {
  switch (type) {
    case "profile":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case "payments":
      return <span className="font-bold text-xs">₹</span>;
    case "receipt":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case "certificate":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      );
    case "exam":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case "enrollment":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
        </svg>
      );
    case "assignment":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      );
    case "library":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
    case "attendance":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case "timetable":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "services":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      );
    case "helpdesk":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      );
  }
}

export function StudentSidebar({
  isOpen,
  onClose,
  activeSection = "profile-section",
  onSelectSection,
}: StudentSidebarProps) {
  const pathname = usePathname();

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    attendance: pathname.startsWith("/attendance"),
    payments: pathname.startsWith("/fees"),
    exam: pathname.startsWith("/exam"),
  });

  function toggleGroup(id: string) {
    setOpenGroups((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function handleSectionNavigation(sectionId?: string) {
    if (!sectionId) return;
    if (pathname !== "/") {
      window.location.href = `/#${sectionId}`;
    } else {
      if (onSelectSection) {
        onSelectSection(sectionId);
      }
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    onClose();
  }

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col bg-white border-r border-slate-200 shadow-xl lg:shadow-none transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 bg-white">
          <Link href="/" onClick={onClose} className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm font-bold text-base">
              🏛️
            </div>
            <div className="leading-tight">
              <span className="block font-black tracking-tight text-xs text-slate-900 uppercase">
                CAMPUS PORTAL
              </span>
              <span className="block font-semibold tracking-wider text-[10px] text-slate-600 uppercase">
                STUDENT SERVICES
              </span>
              <span className="block text-[8px] tracking-wider text-slate-400 font-medium">
                ACADEMIC & ADMIN HUB
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

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin">
          {NAV_ITEMS.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isGroupOpen = openGroups[item.id] ?? false;

            const isDirectRouteActive = item.href ? pathname === item.href : false;
            const isSectionActive = pathname === "/" && item.sectionId === activeSection;
            const isChildActive = hasChildren && item.children?.some((child) => child.href === pathname);
            const isItemActive = isDirectRouteActive || isSectionActive || isChildActive;

            if (hasChildren) {
              return (
                <div key={item.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(item.id)}
                    className={`w-full group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                      isItemActive
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                          isItemActive
                            ? "bg-rose-600 text-white"
                            : "bg-rose-500 text-white group-hover:bg-rose-600"
                        }`}
                      >
                        <NavIcon type={item.iconType} />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </div>

                    <svg
                      className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                        isGroupOpen ? "rotate-90 text-rose-600" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {isGroupOpen && (
                    <div className="ml-5 pl-3 border-l-2 border-slate-200 space-y-1 py-1">
                      {item.children!.map((subItem) => {
                        const isSubActive = subItem.href
                          ? pathname === subItem.href
                          : pathname === "/" && subItem.sectionId === activeSection;

                        if (subItem.href) {
                          return (
                            <Link
                              key={subItem.id}
                              href={subItem.href}
                              onClick={onClose}
                              className={`block rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                                isSubActive
                                  ? "bg-[#3e527a] text-white font-bold shadow-xs"
                                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                              }`}
                            >
                              {subItem.label}
                            </Link>
                          );
                        }

                        return (
                          <button
                            key={subItem.id}
                            type="button"
                            onClick={() => handleSectionNavigation(subItem.sectionId)}
                            className={`w-full text-left rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                              isSubActive
                                ? "bg-[#3e527a] text-white font-bold shadow-xs"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            }`}
                          >
                            {subItem.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const content = (
              <div
                className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                  isItemActive
                    ? "bg-[#3e527a] text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                      isItemActive
                        ? "bg-rose-600 text-white"
                        : "bg-rose-500 text-white group-hover:bg-rose-600"
                    }`}
                  >
                    <NavIcon type={item.iconType} />
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge ? (
                  <span className="rounded bg-indigo-100 text-indigo-700 text-[9px] font-bold px-1.5 py-0.5">
                    {item.badge}
                  </span>
                ) : (
                  <svg
                    className={`h-3.5 w-3.5 opacity-60 transition-transform ${
                      isItemActive ? "text-white" : "text-slate-400 group-hover:translate-x-0.5"
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            );

            if (item.href) {
              return (
                <Link key={item.id} href={item.href} onClick={onClose} className="block">
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSectionNavigation(item.sectionId)}
                className="w-full text-left"
              >
                {content}
              </button>
            );
          })}
        </div>

        <div className="border-t border-slate-100 bg-slate-50/70 p-3 text-center">
          <p className="text-[10px] text-slate-500 font-medium">Student Portal • UMS</p>
          <p className="text-[9px] text-slate-400">Integrated HelpDesk & Academic Hub</p>
        </div>
      </aside>
    </>
  );
}
