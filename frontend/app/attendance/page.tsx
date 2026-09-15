"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { useRequireStudent } from "@/lib/auth/use-require-student";
import { getDynamicAttendanceData, getDynamicStudentProfile } from "@/data/student-services";

export default function OverallAttendancePage() {
  useRequireStudent();
  const { user } = useAuth();
  const profile = getDynamicStudentProfile(user?.email);
  const attendance = getDynamicAttendanceData(user?.email);

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumbs & Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link href="/" className="hover:text-slate-800">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-bold">Overall Attendance</span>
        </div>

        <Link
          href="/attendance/datewise"
          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <span>📅</span> View Datewise Attendance Schedule →
        </Link>
      </div>

      {/* Main Table Card matching media_1789019508280.png */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Blue Title Banner */}
        <div className="bg-[#475b82] text-white px-5 py-3.5 flex items-center justify-between">
          <h1 className="text-sm sm:text-base font-bold tracking-wide">
            Overall Attendance
          </h1>
          <span className="rounded-md bg-white/20 px-2.5 py-0.5 text-xs font-bold text-white">
            {profile.semester} • {profile.section}
          </span>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <th rowSpan={2} className="py-3 px-3.5 border-r border-slate-200">
                  Subject Code
                </th>
                <th rowSpan={2} className="py-3 px-4 border-r border-slate-200 min-w-[220px]">
                  Subject Name
                </th>
                <th colSpan={4} className="py-2 px-3 text-center border-r border-slate-200 bg-amber-50/50">
                  Theory
                </th>
                <th colSpan={4} className="py-2 px-3 text-center border-r border-slate-200 bg-emerald-50/50">
                  Practical
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
                  <td className="py-2.5 px-3.5 border-r border-slate-200 font-mono text-[11px] font-bold text-slate-900">
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
    </div>
  );
}
