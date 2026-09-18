"use client";

import { useState, type ReactNode, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { StudentSidebar } from "@/components/student-sidebar";
import { FacultySidebar } from "@/components/faculty-sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { ClerkSidebar } from "@/components/clerk-sidebar";
import { CampusChatbot } from "@/components/campus-chatbot";
import { getDynamicStudentProfile } from "@/data/student-services";
import { changePassword } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

export function PortalShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, logout, accessToken } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Change Password Modal State
  const [showChangePwModal, setShowChangePwModal] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [isPwSubmitting, setIsPwSubmitting] = useState(false);

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);
    if (newPw !== confirmPw) {
      setPwError("New passwords do not match.");
      return;
    }
    if (newPw.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    if (!accessToken) {
      setPwError("Not authenticated.");
      return;
    }
    setIsPwSubmitting(true);
    try {
      const result = await changePassword(accessToken, {
        old_password: oldPw,
        new_password: newPw,
      });
      if (result.success) {
        setPwSuccess("✅ Password changed successfully!");
        setOldPw("");
        setNewPw("");
        setConfirmPw("");
        setTimeout(() => {
          setShowChangePwModal(false);
          setPwSuccess(null);
        }, 2200);
      } else {
        setPwError("Password change failed. Please try again.");
      }
    } catch (err) {
      setPwError(err instanceof ApiError ? String(err.detail) : "Failed to change password. Check your current password.");
    } finally {
      setIsPwSubmitting(false);
    }
  }

  const role = user?.role || "student";
  const isFaculty = role === "faculty";
  const isAdmin = role === "admin";
  const isClerk = role === "clerk";
  const isStudent = !isFaculty && !isAdmin && !isClerk;

  // Derive dynamic identity labels
  const emailPrefix = user?.email ? user.email.split("@")[0].split(/[._-]/).filter(Boolean).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ") : "";
  const profile = getDynamicStudentProfile(user?.email);

  const displayName = isFaculty
    ? (emailPrefix ? `Prof. ${emailPrefix}` : "Professor / Faculty")
    : isAdmin
    ? (emailPrefix ? `Admin ${emailPrefix}` : "System Administrator")
    : isClerk
    ? (emailPrefix ? `Clerk ${emailPrefix}` : "HelpDesk Clerk")
    : profile.name;

  const roleSubtitle = isFaculty
    ? "Faculty Staff • Dept of Computing & IT"
    : isAdmin
    ? "Central System SuperAdmin • IT Ops"
    : isClerk
    ? "HelpDesk Clerk • Student Queries & Forwarding"
    : `${profile.enrollmentNo} • Sem 6`;

  function handleLogout() {
    logout();
    setIsUserMenuOpen(false);
    router.push("/login");
  }

  // If user is authenticated, render role-specific shell
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f4f6f9] text-slate-800 flex flex-col antialiased">
        <div className="flex flex-1 overflow-hidden">
          {/* Responsive Left Sidebar based on Role */}
          {isFaculty ? (
            <FacultySidebar
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
            />
          ) : isAdmin ? (
            <AdminSidebar
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
            />
          ) : isClerk ? (
            <ClerkSidebar
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
            />
          ) : (
            <StudentSidebar
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Main Layout Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-6 shadow-xs">
              <div className="flex items-center gap-2 sm:gap-4 flex-1 max-w-lg min-w-0">
                {/* Hamburger Toggle */}
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen((prev) => !prev)}
                  className="shrink-0 rounded-lg p-1.5 sm:p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
                  aria-label="Toggle navigation menu"
                >
                  <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                {/* Search Bar */}
                <div className="relative flex-1 min-w-0 max-w-[170px] xs:max-w-xs sm:max-w-sm">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      isFaculty
                        ? "Search inquiries..."
                        : isAdmin
                        ? "Search users, rules..."
                        : isClerk
                        ? "Search student queries..."
                        : "Search portal..."
                    }
                    className="w-full rounded-lg sm:rounded-md border border-slate-200 bg-slate-50/70 py-1 sm:py-1.5 pl-2.5 sm:pl-3 pr-8 sm:pr-9 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300 transition-all"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 sm:pr-3">
                    <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Top Right User Profile & Role Quick Links */}
              <div className="flex items-center gap-2 sm:gap-4">
                <nav className="hidden md:flex items-center gap-3.5 text-xs font-semibold text-slate-600 mr-2">
                  {isFaculty ? (
                    <>
                      <Link
                        href="/faculty"
                        className={`hover:text-purple-700 transition-colors ${
                          pathname === "/faculty" ? "text-purple-700 font-bold" : ""
                        }`}
                      >
                        Faculty Workspace
                      </Link>
                      <Link
                        href="/faculty#inquiries"
                        className="hover:text-purple-700 transition-colors"
                      >
                        Student Inquiries
                      </Link>
                      <Link
                        href="/faculty#teaching"
                        className="hover:text-purple-700 transition-colors"
                      >
                        Teaching Schedule
                      </Link>
                      <Link
                        href="/services"
                        className={`hover:text-purple-700 transition-colors ${
                          pathname === "/services" ? "text-purple-700 font-bold" : ""
                        }`}
                      >
                        Campus Services
                      </Link>
                    </>
                  ) : isAdmin ? (
                    <>
                      <Link
                        href="/admin"
                        className={`hover:text-rose-700 transition-colors ${
                          pathname === "/admin" ? "text-rose-700 font-bold" : ""
                        }`}
                      >
                        Admin Hub
                      </Link>
                      <Link
                        href="/admin#users"
                        className="hover:text-rose-700 transition-colors"
                      >
                        User Directory
                      </Link>
                      <Link
                        href="/admin#routing"
                        className="hover:text-rose-700 transition-colors"
                      >
                        Routing Rules
                      </Link>
                      <Link
                        href="/admin/analytics"
                        className={`hover:text-rose-700 transition-colors ${
                          pathname === "/admin/analytics" ? "text-rose-700 font-bold" : ""
                        }`}
                      >
                        Analytics
                      </Link>
                      <Link
                        href="/services"
                        className={`hover:text-rose-700 transition-colors ${
                          pathname === "/services" ? "text-rose-700 font-bold" : ""
                        }`}
                      >
                        Services
                      </Link>
                    </>
                  ) : isClerk ? (
                    <>
                      <Link
                        href="/clerk"
                        className={`hover:text-amber-700 transition-colors ${
                          pathname === "/clerk" ? "text-amber-700 font-bold" : ""
                        }`}
                      >
                        Clerk Desk 📋
                      </Link>
                      <Link
                        href="/services"
                        className={`hover:text-amber-700 transition-colors ${
                          pathname === "/services" ? "text-amber-700 font-bold" : ""
                        }`}
                      >
                        Campus Services
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/"
                        className={`hover:text-rose-600 transition-colors ${
                          pathname === "/" ? "text-rose-600 font-bold" : ""
                        }`}
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/attendance"
                        className={`hover:text-rose-600 transition-colors ${
                          pathname.startsWith("/attendance") ? "text-rose-600 font-bold" : ""
                        }`}
                      >
                        Attendance
                      </Link>
                      <Link
                        href="/exam/results"
                        className={`hover:text-rose-600 transition-colors ${
                          pathname.startsWith("/exam") ? "text-rose-600 font-bold" : ""
                        }`}
                      >
                        Exams & Results
                      </Link>
                      <Link
                        href="/fees/history"
                        className={`hover:text-rose-600 transition-colors ${
                          pathname.startsWith("/fees") ? "text-rose-600 font-bold" : ""
                        }`}
                      >
                        Fees & Receipts
                      </Link>
                      <Link
                        href="/services"
                        className={`hover:text-rose-600 transition-colors ${
                          pathname === "/services" ? "text-rose-600 font-bold" : ""
                        }`}
                      >
                        Campus Services
                      </Link>
                      <Link
                        href="/tickets"
                        className={`hover:text-rose-600 transition-colors ${
                          pathname === "/tickets" ? "text-rose-600 font-bold" : ""
                        }`}
                      >
                        My Inquiries
                      </Link>
                    </>
                  )}
                </nav>

                {/* Identity Profile Pill */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen((prev) => !prev)}
                    className="flex items-center gap-2.5 rounded-full p-1 pl-1.5 pr-2.5 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
                  >
                    {/* User Avatar with role accent */}
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-white font-bold text-xs shadow-sm overflow-hidden ring-2 ${
                        isFaculty
                          ? "bg-purple-800 ring-purple-200"
                          : isAdmin
                          ? "bg-slate-900 ring-rose-200"
                          : isClerk
                          ? "bg-amber-800 ring-amber-200"
                          : "bg-slate-800 ring-slate-200"
                      }`}
                    >
                      <span className="text-[11px] font-semibold tracking-wider">
                        {user?.email?.slice(0, 2).toUpperCase() || "US"}
                      </span>
                    </div>

                    <div className="hidden text-left md:block">
                      <p className="text-xs font-semibold text-slate-800 leading-tight max-w-[170px] truncate">
                        {displayName}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium truncate max-w-[170px]">
                        {roleSubtitle}
                      </p>
                    </div>

                    <svg
                      className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                        isUserMenuOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Profile Dropdown Menu */}
                  {isUserMenuOpen && (
                    <>
                      <div
                        onClick={() => setIsUserMenuOpen(false)}
                        className="fixed inset-0 z-40"
                        aria-hidden="true"
                      />
                      <div className="absolute right-0 mt-2 z-50 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl animate-scale-in">
                        <div className="border-b border-slate-100 px-3 py-2">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {displayName}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                          <span
                            className={`inline-block mt-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              isFaculty
                                ? "bg-purple-100 text-purple-800 border border-purple-200"
                                : isAdmin
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            }`}
                          >
                            {isFaculty ? "Faculty Member" : isAdmin ? "System Administrator" : "Enrolled Student"}
                          </span>
                        </div>

                        <div className="py-1 text-xs text-slate-700">
                          {isFaculty ? (
                            <>
                              <Link
                                href="/faculty"
                                onClick={() => setIsUserMenuOpen(false)}
                                className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100"
                              >
                                <span>👨‍🏫</span> Faculty Workspace
                              </Link>
                              <Link
                                href="/faculty#inquiries"
                                onClick={() => setIsUserMenuOpen(false)}
                                className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100"
                              >
                                <span>📥</span> Student Inquiries
                              </Link>
                              <Link
                                href="/faculty#teaching"
                                onClick={() => setIsUserMenuOpen(false)}
                                className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100"
                              >
                                <span>📖</span> Teaching Modules
                              </Link>
                              <Link
                                href="/services"
                                onClick={() => setIsUserMenuOpen(false)}
                                className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100"
                              >
                                <span>🏛️</span> Campus Services
                              </Link>
                            </>
                          ) : isAdmin ? (
                            <>
                              <Link
                                href="/admin"
                                onClick={() => setIsUserMenuOpen(false)}
                                className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100"
                              >
                                <span>🛡️</span> Admin Console
                              </Link>
                              <Link
                                href="/admin#users"
                                onClick={() => setIsUserMenuOpen(false)}
                                className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100"
                              >
                                <span>👥</span> User & Role Directory
                              </Link>
                              <Link
                                href="/admin#routing"
                                onClick={() => setIsUserMenuOpen(false)}
                                className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100"
                              >
                                <span>🔀</span> Routing & Escalations
                              </Link>
                              <Link
                                href="/admin/analytics"
                                onClick={() => setIsUserMenuOpen(false)}
                                className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100"
                              >
                                <span>📊</span> System Analytics
                              </Link>
                            </>
                          ) : (
                            <>
                              <Link
                                href="/"
                                onClick={() => setIsUserMenuOpen(false)}
                                className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100"
                              >
                                <span>🎓</span> My Student Profile
                              </Link>
                              <Link
                                href="/attendance"
                                onClick={() => setIsUserMenuOpen(false)}
                                className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100"
                              >
                                <span>📅</span> Overall Attendance
                              </Link>
                              <Link
                                href="/exam/results"
                                onClick={() => setIsUserMenuOpen(false)}
                                className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100"
                              >
                                <span>📊</span> Provisional Result
                              </Link>
                              <Link
                                href="/fees/history"
                                onClick={() => setIsUserMenuOpen(false)}
                                className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100"
                              >
                                <span>🧾</span> Fees Receipt History
                              </Link>
                              <Link
                                href="/services"
                                onClick={() => setIsUserMenuOpen(false)}
                                className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100"
                              >
                                <span>🏛️</span> Campus Services Directory
                              </Link>
                              <Link
                                href="/tickets"
                                onClick={() => setIsUserMenuOpen(false)}
                                className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100"
                              >
                                <span>💬</span> My Inquiries & Tickets
                              </Link>
                            </>
                          )}
                        </div>

                        <div className="border-t border-slate-100 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              setPwError(null);
                              setPwSuccess(null);
                              setOldPw("");
                              setNewPw("");
                              setConfirmPw("");
                              setShowChangePwModal(true);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            <span>🔑</span> Change Password
                          </button>
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                          >
                            <svg className="h-4 w-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Log out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 p-3 sm:p-5 lg:p-7 max-w-7xl w-full mx-auto animate-fade-in pb-20 sm:pb-8">
              {children}
            </main>
          </div>
        </div>

        {/* AI Campus Assistant Floating Chatbot */}
        <CampusChatbot />

        {/* Change Password Modal */}
        {showChangePwModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <span>🔑</span> Change Account Password
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isStudent
                      ? "You can change your password. Your email, enrollment number, and other profile details are locked and managed by the University Administration."
                      : "Update your account login password."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowChangePwModal(false)}
                  className="text-slate-400 hover:text-slate-700 text-xl font-bold leading-none"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="p-5 space-y-4">
                {pwError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                    ⚠️ {pwError}
                  </div>
                )}
                {pwSuccess && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                    {pwSuccess}
                  </div>
                )}

                {isStudent && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1.5 text-xs">
                    <p className="font-bold text-amber-900">🔒 Profile Attributes Locked by Administration</p>
                    <p className="text-amber-800">Email, Enrollment Number, Phone, Branch, Semester — these are immutable and can only be updated by the Admin.</p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <p className="text-[10px] text-amber-700 font-bold uppercase">Email</p>
                        <p className="text-xs font-mono font-bold text-amber-950 truncate">{user?.email || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-amber-700 font-bold uppercase">Enrollment No</p>
                        <p className="text-xs font-mono font-bold text-amber-950">{(user as any)?.enrollment_number || "—"}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={oldPw}
                    onChange={(e) => setOldPw(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowChangePwModal(false)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPwSubmitting}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isPwSubmitting ? "Updating…" : "🔑 Update Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Unauthenticated / Public Shell
  return (
    <div className="min-h-screen bg-paper font-sans text-ink flex flex-col antialiased">
      <header className="sticky top-0 z-20 border-b border-line bg-paper-raised/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5">
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5 transition-standard hover:opacity-80 min-w-0">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white font-bold text-sm shadow-sm">
              🏛️
            </div>
            <div className="truncate">
              <span className="font-bold text-xs uppercase tracking-tight text-slate-900 block leading-tight truncate">
                University Portal
              </span>
              <span className="hidden xs:block font-display text-[11px] sm:text-xs font-medium tracking-tight text-ink-muted leading-tight truncate">
                Academic Management & Services
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-3 text-xs font-semibold shrink-0">
            <Link
              href="/services"
              className="hidden sm:inline-flex text-ink-muted hover:text-ink transition-colors px-2 py-1"
            >
              Campus Services
            </Link>
            <Link
              href="/login"
              className="text-slate-700 hover:text-slate-900 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-100"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="btn-primary !px-3 sm:!px-4 !py-1.5 text-xs shadow-xs"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 mx-auto max-w-7xl w-full px-3 sm:px-6 py-4 sm:py-8 animate-fade-in pb-20 sm:pb-8">
        {children}
      </main>

      {/* AI Campus Assistant Floating Chatbot */}
      <CampusChatbot />
    </div>
  );
}
