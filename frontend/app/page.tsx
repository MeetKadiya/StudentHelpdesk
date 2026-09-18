"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { listTickets, type TicketOut } from "@/lib/api/tickets";
import {
  CAMPUS_SERVICES,
  getDynamicFeeInvoice,
  getDynamicAttendanceData,
  getDynamicWeeklyTimetable,
  CAMPUS_ANNOUNCEMENTS,
  getDynamicStudentProfile,
  type CampusService,
} from "@/data/student-services";
import { ServiceActionDialog } from "@/components/service-action-dialog";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user, isUserLoading } = useAuth();
  const [tickets, setTickets] = useState<TicketOut[] | null>(null);
  const [activeActionService, setActiveActionService] = useState<CampusService | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>("Thursday");

  // Persona Redirection: Faculty & Admins should never see the student personal portal
  useEffect(() => {
    if (isAuthenticated && !isUserLoading && user) {
      if (user.role === "faculty") {
        router.replace("/faculty");
      } else if (user.role === "admin") {
        router.replace("/admin");
      }
    }
  }, [isAuthenticated, isUserLoading, user, router]);

  const profile = getDynamicStudentProfile(user?.email);
  const attendance = getDynamicAttendanceData(user?.email);
  const feeInvoice = getDynamicFeeInvoice(user?.email);
  const weeklyTimetable = getDynamicWeeklyTimetable(user?.email);

  useEffect(() => {
    if (user && isAuthenticated && user.role === "student" && typeof window !== "undefined") {
      const stored = JSON.parse(window.localStorage.getItem("helpdesk_auth") || "{}");
      if (stored.accessToken) {
        listTickets(stored.accessToken)
          .then((data) => setTickets(data))
          .catch(() => setTickets([]));
      }
    }
  }, [isAuthenticated, user]);

  function refreshTicketList() {
    if (user && typeof window !== "undefined") {
      const stored = JSON.parse(window.localStorage.getItem("helpdesk_auth") || "{}");
      if (stored.accessToken) {
        listTickets(stored.accessToken).then(setTickets).catch(() => {});
      }
    }
  }

  // Quick helper to launch a specific service tool
  function openService(serviceId: string) {
    const found = CAMPUS_SERVICES.find((s) => s.id === serviceId) || CAMPUS_SERVICES[0];
    setActiveActionService(found);
  }

  // =========================================================================
  // 1. AUTHENTICATED: Full Student Management Dashboard (Inspired by SMS Reference)
  // =========================================================================
  if (isAuthenticated && user) {
    // If role is faculty or admin, render loading transition while redirecting
    if (user.role === "faculty" || user.role === "admin") {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-indigo-600" />
          <p className="text-xs font-semibold text-slate-500">
            Routing to your {user.role === "faculty" ? "Faculty Workspace" : "Admin Hub"}...
          </p>
        </div>
      );
    }
    const activeTicketsCount =
      tickets?.filter((t) => t.status === "open" || t.status === "in_progress").length ?? 0;

    return (
      <div className="space-y-6 sm:space-y-8 pb-12">
        {/* TOP ROW: Student Identity Card & Usable Fee Dues Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          {/* LEFT: Greeting & Student ID Card (7 cols) */}
          <div id="profile-section" className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">
                  🎓
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-800">
                  Hi {profile.name.split(" ")[0]}, Good Morning !
                </h2>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                {profile.status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
              {/* Vibrant Indigo & Navy Student ID Card */}
              <div className="sm:col-span-5 bg-gradient-to-br from-[#1e293b] via-[#334155] to-[#0f172a] rounded-2xl p-5 text-white shadow-md relative overflow-hidden text-center flex flex-col items-center justify-center min-h-[240px]">
                {/* Decorative glow curves */}
                <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-indigo-500/20 blur-xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-28 h-28 rounded-full bg-emerald-500/20 blur-xl pointer-events-none" />

                {/* Circular Student Photo / Avatar */}
                <div className="relative mb-3.5">
                  <div className="w-20 h-20 rounded-full border-4 border-white/20 bg-slate-800 flex items-center justify-center text-white shadow-inner overflow-hidden ring-4 ring-indigo-400/30">
                    <span className="text-xl font-extrabold tracking-wider">
                      {profile.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <span className="absolute bottom-0 right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-slate-900" title="Enrolled & Active" />
                </div>

                {/* Name */}
                <h3 className="font-bold text-xs sm:text-sm tracking-wide uppercase text-white leading-snug">
                  {profile.name}
                </h3>

                {/* Enrollment Number */}
                <p className="font-mono text-xs font-bold text-indigo-200 mt-1 tracking-wider">
                  {profile.enrollmentNo}
                </p>

                {/* Term & CGPA */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-semibold text-slate-200">
                    {profile.semester.split(" ")[0]} {profile.semester.split(" ")[1]}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                    CGPA {profile.cgpa}
                  </span>
                </div>
              </div>

              {/* Student Details List */}
              <div className="sm:col-span-7 space-y-2.5 text-xs text-slate-700">
                <div className="flex items-start gap-2.5">
                  <span className="text-indigo-600 mt-0.5">🏛️</span>
                  <div>
                    <span className="block font-bold text-slate-800 text-[11px] uppercase leading-tight">
                      {profile.institution}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="text-indigo-600 mt-0.5">📖</span>
                  <div>
                    <span className="block font-bold text-slate-800 text-[11px] uppercase leading-tight">
                      {profile.program}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 pt-1">
                  <span className="text-indigo-600">👤</span>
                  <span className="text-slate-600 font-medium">Status: <strong className="text-slate-800">{profile.gender}</strong></span>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-indigo-600">✉️</span>
                  <span className="text-slate-600 font-medium truncate">Email: <strong className="text-slate-800">{profile.email}</strong></span>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-indigo-600">📞</span>
                  <span className="text-slate-600 font-medium">Student Hotline: <strong className="text-slate-800">{profile.phone}</strong></span>
                </div>

                <div className="pt-2 flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openService("registrar-records")}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                  >
                    Request Bonafide Certificate 📄
                  </button>
                  <button
                    type="button"
                    onClick={() => openService("exams-grading")}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-indigo-600 transition-colors"
                  >
                    Hall Ticket 🎟️ →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Usable Fee Dues & Receipt Generator (5 cols) */}
          <div id="fees-section" className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 pb-4 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                    ₹
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-slate-800">
                    Student Fee Dues &amp; Billing
                  </h2>
                </div>
                <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200 self-start xs:self-auto">
                  Invoice #{feeInvoice.invoiceNo}
                </span>
              </div>

              {/* Dark Navy Outstanding Amount Card */}
              <div className="bg-gradient-to-r from-[#1e293b] via-[#334155] to-[#1e293b] rounded-xl p-5 text-white shadow-sm text-center relative overflow-hidden">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Total Outstanding Balance
                </p>
                <p className="text-3xl font-black text-white my-2 tracking-tight">
                  ₹ {feeInvoice.totalDue.toLocaleString()}
                </p>
                <div className="mt-2 flex items-center justify-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    feeInvoice.isPaid ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-400/20 text-amber-300"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${feeInvoice.isPaid ? "bg-emerald-400" : "bg-amber-400"}`} />
                    {feeInvoice.isPaid ? "Paid in Full • All Clear" : `Due: ${feeInvoice.dueDate}`}
                  </span>
                </div>
              </div>

              {/* Itemized Fee Breakdown */}
              <div className="mt-4 space-y-2 text-xs">
                {feeInvoice.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0 text-slate-600">
                    <span className="truncate pr-2">{item.description}</span>
                    <span className="font-bold text-slate-800 shrink-0">₹ {item.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Payment Action & History Link */}
            <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2 justify-between">
              <Link
                href="/fees/history"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                View Fees Receipt History 📜
              </Link>
              {feeInvoice.isPaid ? (
                <button
                  type="button"
                  onClick={() => openService("financial-aid")}
                  className="w-full sm:w-auto rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-all"
                >
                  View Cleared Statement 📄
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openService("financial-aid")}
                  className="w-full sm:w-auto rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>💳</span> Pay Outstanding Dues (₹ {feeInvoice.totalDue.toLocaleString()}) →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* QUICK ACCESS LINKS & SUMMARY STATS */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Link
            href="/attendance"
            className="group bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all flex items-center gap-3"
          >
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-lg group-hover:scale-105 transition-transform">
              📊
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Overall Attendance</p>
              <p className="text-base font-black text-slate-900">{attendance.overallPercentage}%</p>
            </div>
          </Link>

          <Link
            href="/fees/history"
            className="group bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all flex items-center gap-3"
          >
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-lg group-hover:scale-105 transition-transform">
              💳
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Receipts History</p>
              <p className="text-base font-black text-slate-900">{feeInvoice.isPaid ? "Cleared" : "1 Pending"}</p>
            </div>
          </Link>

          <Link
            href="/exam"
            className="group bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-md hover:border-purple-200 transition-all flex items-center gap-3"
          >
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-700 font-bold flex items-center justify-center text-lg group-hover:scale-105 transition-transform">
              🎟️
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Hall Ticket</p>
              <p className="text-base font-black text-slate-900">Admit Card Active</p>
            </div>
          </Link>

          <Link
            href="/exam/results"
            className="group bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-md hover:border-amber-200 transition-all flex items-center gap-3"
          >
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 font-bold flex items-center justify-center text-lg group-hover:scale-105 transition-transform">
              📜
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Provisional Result</p>
              <p className="text-base font-black text-slate-900">CGPA {profile.cgpa}</p>
            </div>
          </Link>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 2: ATTENDANCE STATUS (Matches reference media_1789019508280.png) */}
        {/* ========================================================================= */}
        <div id="attendance-section" className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
                📊
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-800">
                  Semester Course Attendance Record
                </h2>
                <p className="text-[11px] text-slate-500">
                  Daily theory & laboratory lecture attendance tracking. Minimum 75% required for examination eligibility.
                </p>
              </div>
            </div>

            {/* Reference Badge: Your Attendance :- 84.50 % */}
            <div className="text-right">
              <span className="text-xs sm:text-sm font-semibold text-slate-600">
                Your Overall Attendance :-{" "}
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight">
                {attendance.overallPercentage} %
              </span>
              <span className="text-xs text-slate-500 font-medium ml-1.5">
                ({attendance.asOf})
              </span>
            </div>
          </div>

          {/* Responsive Attendance Table Wrapper */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th rowSpan={2} className="py-3 px-3 border-r border-slate-200">
                    Subject Code
                  </th>
                  <th rowSpan={2} className="py-3 px-4 border-r border-slate-200 min-w-[220px]">
                    Subject Name
                  </th>
                  <th colSpan={4} className="py-2 px-3 text-center border-r border-slate-200 bg-amber-50/50">
                    Theory Lectures
                  </th>
                  <th colSpan={4} className="py-2 px-3 text-center border-r border-slate-200 bg-emerald-50/50">
                    Practical Labs
                  </th>
                  <th rowSpan={2} className="py-3 px-3 text-center border-r border-slate-200">
                    Theory (%)
                  </th>
                  <th rowSpan={2} className="py-3 px-3 text-center border-r border-slate-200">
                    Practical (%)
                  </th>
                  <th rowSpan={2} className="py-3 px-3 text-center">
                    Overall (%)
                  </th>
                </tr>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] text-slate-600 font-semibold">
                  <th className="py-1.5 px-2 text-center border-r border-slate-200">Total</th>
                  <th className="py-1.5 px-2 text-center border-r border-slate-200 text-emerald-700">P</th>
                  <th className="py-1.5 px-2 text-center border-r border-slate-200 text-rose-700">A</th>
                  <th className="py-1.5 px-2 text-center border-r border-slate-200 text-amber-700">L</th>
                  <th className="py-1.5 px-2 text-center border-r border-slate-200">Total</th>
                  <th className="py-1.5 px-2 text-center border-r border-slate-200 text-emerald-700">P</th>
                  <th className="py-1.5 px-2 text-center border-r border-slate-200 text-rose-700">A</th>
                  <th className="py-1.5 px-2 text-center border-r border-slate-200 text-amber-700">L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700 font-medium">
                {attendance.records.map((row) => (
                  <tr key={row.code} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 border-r border-slate-200 font-mono text-[11px] font-bold text-slate-900">
                      {row.code}
                    </td>
                    <td className="py-2.5 px-4 border-r border-slate-200 text-[11px] font-semibold text-slate-800">
                      {row.name}
                    </td>
                    {/* Theory */}
                    <td className="py-2.5 px-2 text-center border-r border-slate-200">{row.theory.total}</td>
                    <td className="py-2.5 px-2 text-center border-r border-slate-200 font-semibold text-emerald-700">{row.theory.p}</td>
                    <td className="py-2.5 px-2 text-center border-r border-slate-200 text-rose-600">{row.theory.a}</td>
                    <td className="py-2.5 px-2 text-center border-r border-slate-200 text-slate-400">{row.theory.l}</td>
                    {/* Practical */}
                    <td className="py-2.5 px-2 text-center border-r border-slate-200">{row.practical.total}</td>
                    <td className="py-2.5 px-2 text-center border-r border-slate-200 font-semibold text-emerald-700">{row.practical.p}</td>
                    <td className="py-2.5 px-2 text-center border-r border-slate-200 text-rose-600">{row.practical.a}</td>
                    <td className="py-2.5 px-2 text-center border-r border-slate-200 text-slate-400">{row.practical.l}</td>
                    {/* Percentages */}
                    <td className="py-2.5 px-3 text-center border-r border-slate-200 font-semibold">
                      {row.theory.pct ? `${row.theory.pct}` : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-center border-r border-slate-200 font-semibold">
                      {row.practical.pct ? `${row.practical.pct}` : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                      {row.overallPct}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                  <td colSpan={2} className="py-3 px-4 border-r border-slate-200 text-center uppercase tracking-wide text-xs">
                    Overall Summary Totals
                  </td>
                  <td className="py-3 px-2 text-center border-r border-slate-200">{attendance.totals.theoryTotal}</td>
                  <td className="py-3 px-2 text-center border-r border-slate-200 text-emerald-700">{attendance.totals.theoryP}</td>
                  <td className="py-3 px-2 text-center border-r border-slate-200 text-rose-700">{attendance.totals.theoryA}</td>
                  <td className="py-3 px-2 text-center border-r border-slate-200">{attendance.totals.theoryL}</td>
                  <td className="py-3 px-2 text-center border-r border-slate-200">{attendance.totals.practicalTotal}</td>
                  <td className="py-3 px-2 text-center border-r border-slate-200 text-emerald-700">{attendance.totals.practicalP}</td>
                  <td className="py-3 px-2 text-center border-r border-slate-200 text-rose-700">{attendance.totals.practicalA}</td>
                  <td className="py-3 px-2 text-center border-r border-slate-200">{attendance.totals.practicalL}</td>
                  <td className="py-3 px-3 text-center border-r border-slate-200">{attendance.totals.theoryPct}</td>
                  <td className="py-3 px-3 text-center border-r border-slate-200">{attendance.totals.practicalPct}</td>
                  <td className="py-3 px-3 text-center text-emerald-700 font-extrabold text-sm">{attendance.totals.overallPct}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 3: TIMETABLE SCHEDULE */}
        {/* ========================================================================= */}
        <div id="timetable-section" className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-700 text-sm font-bold">
                🗓️
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-800">
                  Weekly Class Schedule & Faculty Timetable
                </h2>
                <p className="text-[11px] text-slate-500">
                  Select day of the week to view room locations, lecture hours, and faculty sessions.
                </p>
              </div>
            </div>
            <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg self-start sm:self-auto">
              {profile.program} • {profile.semester} {profile.section}
            </div>
          </div>

          {/* Interactive Day Tabs */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none sm:flex-wrap">
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => {
              const isSelected = selectedDay === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={`rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {day} {day === "Thursday" && "• Today"}
                </button>
              );
            })}
          </div>

          {/* Schedule Table */}
          <p className="sm:hidden text-[10px] text-slate-500 italic flex items-center gap-1 pt-1">
            <span>👉</span> Swipe sideways to inspect full timetable schedule
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-3 px-3 border-r border-slate-200 text-center w-28">Period</th>
                  <th className="py-3 px-3 border-r border-slate-200 text-center w-28">Room</th>
                  <th className="py-3 px-4 border-r border-slate-200 min-w-[150px]">Time Slot</th>
                  <th className="py-3 px-4 border-r border-slate-200 min-w-[100px]">Code</th>
                  <th className="py-3 px-4 border-r border-slate-200 min-w-[240px]">Subject Name</th>
                  <th className="py-3 px-3 border-r border-slate-200 text-center min-w-[90px]">Type</th>
                  <th className="py-3 px-4 min-w-[180px]">Faculty In-Charge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700 font-medium">
                {(weeklyTimetable[selectedDay] || []).map((slot) => (
                  <tr key={`${selectedDay}-${slot.lectureNo}-${slot.subjectCode}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-center border-r border-slate-200 font-bold text-slate-800">
                      {slot.period || `Lecture ${slot.lectureNo}`}
                    </td>
                    <td className="py-3 px-3 text-center border-r border-slate-200 font-semibold text-slate-600">
                      {slot.roomNo}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200 font-semibold text-slate-800 whitespace-nowrap">
                      {slot.time}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200 font-mono text-[11px] font-bold text-slate-900">
                      {slot.subjectCode}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200 text-[11px] font-semibold text-slate-800">
                      {slot.subjectName}
                    </td>
                    <td className="py-3 px-3 text-center border-r border-slate-200">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          slot.type === "Practical"
                            ? "bg-emerald-100 text-emerald-800"
                            : slot.type === "Tutorial"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-slate-800 text-white"
                        }`}
                      >
                        {slot.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[11px] text-slate-800">
                      {slot.faculty}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 4: CAMPUS SERVICES & INSTANT ACTION PORTAL */}
        {/* ========================================================================= */}
        <div id="services-grid" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800">
                Official Campus Services & HelpDesk Actions
              </h2>
              <p className="text-xs text-slate-500">
                Direct integration with all 9 administrative branches. Click any service to execute actions immediately.
              </p>
            </div>
            <Link
              href="/services"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Browse All Services →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {CAMPUS_SERVICES.map((srv) => (
              <div
                key={srv.id}
                className="group bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                      {srv.category}
                    </span>
                    {srv.badge && (
                      <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold">
                        {srv.badge}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {srv.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {srv.department}
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {srv.description}
                  </p>

                  <div className="space-y-1 pt-1 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Frequently Requested:</p>
                    <div className="flex flex-wrap gap-1">
                      {srv.commonRequests.slice(0, 2).map((req, i) => (
                        <span key={i} className="text-[10px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                          • {req}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[10px] text-slate-400">
                    <span>📍 {srv.location}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveActionService(srv)}
                    className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 active:scale-95 transition-all"
                  >
                    {srv.actionLabel}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 5: CAMPUS ANNOUNCEMENTS & TICKETS SUMMARY */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          {/* Announcements (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-lg">📢</span>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  Official Campus Announcements & Deadlines
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">Fall 2026</span>
            </div>

            <div className="space-y-3">
              {CAMPUS_ANNOUNCEMENTS.map((a) => (
                <div key={a.id} className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-100 text-indigo-700 mb-1">
                      {a.category}
                    </span>
                    <h4 className="text-xs font-semibold text-slate-800 leading-snug">
                      {a.title}
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                    {a.date}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Support Tickets (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎫</span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-800">
                    My HelpDesk Inquiries
                  </h3>
                </div>
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                  {activeTicketsCount} Active
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {tickets === null ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Loading ticket updates...</p>
                ) : tickets.length === 0 ? (
                  <div className="py-6 text-center space-y-2">
                    <p className="text-xs text-slate-500 font-medium">No open inquiries right now.</p>
                    <p className="text-[11px] text-slate-400">Launch any service card above to create an automated inquiry.</p>
                  </div>
                ) : (
                  tickets.slice(0, 3).map((t) => (
                    <Link
                      key={t.id}
                      href={`/tickets/${t.id}`}
                      className="block p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 truncate">{t.subject}</span>
                        <span className={`capitalize px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.status === "open"
                            ? "bg-amber-100 text-amber-800"
                            : t.status === "resolved"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {t.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{t.category || "Campus Inquiry"}</p>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <Link
                href="/tickets"
                className="text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors"
              >
                View All Inquiries →
              </Link>
              <Link
                href="/tickets/new"
                className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-all"
              >
                + New Ticket
              </Link>
            </div>
          </div>
        </div>

        {/* Global Modal for Executing Service Actions */}
        <ServiceActionDialog
          service={activeActionService}
          isOpen={!!activeActionService}
          onClose={() => setActiveActionService(null)}
          onSuccess={() => {
            refreshTicketList();
          }}
        />
      </div>
    );
  }

  // =========================================================================
  // 2. UNAUTHENTICATED: Public University Portal Welcome
  // =========================================================================
  return (
    <div className="space-y-12">
      {/* Hero Header */}
      <section className="surface-card p-6 sm:p-10 border border-line text-center space-y-4">
        <span className="inline-block rounded-full bg-indigo-100 px-3.5 py-1 text-xs font-bold text-indigo-800 uppercase tracking-wider">
          University Academic Management & Student Services
        </span>
        <h1 className="font-display text-3xl sm:text-5xl font-medium tracking-tight text-ink max-w-2xl mx-auto">
          Student Portal & HelpDesk System
        </h1>
        <p className="text-sm sm:text-base text-ink-muted max-w-xl mx-auto">
          Access real-time lecture attendance, course schedules, instant fee receipt generation, verified exam hall tickets, and AI-assisted support for all 9 campus administrative departments.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/login" className="btn-primary !px-6 !py-2.5 text-sm">
            Student Login
          </Link>
          <Link href="/services" className="btn-secondary !px-6 !py-2.5 text-sm">
            Browse Campus Services
          </Link>
        </div>
      </section>

      {/* Services Grid Preview */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="font-display text-2xl font-medium text-ink">
            Campus Service Departments
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted mt-1">
            Comprehensive student services with direct digital filing and instant resolution.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAMPUS_SERVICES.map((service) => (
            <div key={service.id} className="surface-card p-5 space-y-3 border border-line">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-ink">
                  {service.title}
                </h3>
                <span className="rounded bg-paper-raised px-2 py-0.5 text-[10px] font-semibold text-ledger border border-line">
                  {service.category}
                </span>
              </div>
              <p className="text-xs text-ink-muted line-clamp-2">
                {service.description}
              </p>
              <div className="pt-2 text-xs text-ink-faint border-t border-line/60">
                {service.location}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
