"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { useRequireStudent } from "@/lib/auth/use-require-student";
import { getDynamicDatewiseAttendance, getDynamicStudentProfile } from "@/data/student-services";

export default function DatewiseAttendancePage() {
  useRequireStudent();
  const { user } = useAuth();
  const profile = getDynamicStudentProfile(user?.email);
  const [selectedDate, setSelectedDate] = useState<string>("2026-09-10");

  const schedule = getDynamicDatewiseAttendance(user?.email, selectedDate);

  // Format date display
  const dateObj = new Date(selectedDate);
  const formattedDateString = `${String(dateObj.getDate()).padStart(2, "0")}/${String(
    dateObj.getMonth() + 1
  ).padStart(2, "0")}/${dateObj.getFullYear()}`;

  const totalCount = schedule.length;
  const presentCount = schedule.filter((s) => s.status === "Present").length;
  const absentCount = schedule.filter((s) => s.status === "Absent").length;
  const leaveCount = schedule.filter((s) => s.status === "Leave").length;

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link href="/" className="hover:text-slate-800">
            Dashboard
          </Link>
          <span>/</span>
          <Link href="/attendance" className="hover:text-slate-800">
            Attendance
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-bold">Datewise Attendance</span>
        </div>

        <Link
          href="/attendance"
          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          View Overall Summary Attendance →
        </Link>
      </div>

      {/* Main Container matching media_1789019508332.png */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Blue Title Banner */}
        <div className="bg-[#475b82] text-white px-5 py-3.5 flex items-center justify-between">
          <h1 className="text-sm sm:text-base font-bold tracking-wide">
            Datewise Attendance
          </h1>
          <span className="text-xs text-slate-200 font-medium">
            {profile.name} • {profile.enrollmentNo}
          </span>
        </div>

        {/* Date Selector & Daily Summary Chips */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Date Input */}
            <div className="relative">
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                Select Date
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-xs">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent focus:outline-none cursor-pointer text-xs font-bold"
                />
              </div>
            </div>

            {/* Quick Summary Badges matching reference */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-5 sm:pt-4">
              <span className="rounded-lg bg-slate-800 text-white px-3 py-1.5 text-xs font-bold shadow-xs">
                Date : {formattedDateString}
              </span>
              <span className="rounded-lg bg-slate-700 text-white px-3 py-1.5 text-xs font-bold shadow-xs">
                Total : {totalCount}
              </span>
              <span className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-bold shadow-xs">
                Present : {presentCount}
              </span>
              <span className="rounded-lg bg-rose-600 text-white px-3 py-1.5 text-xs font-bold shadow-xs">
                Absent : {absentCount}
              </span>
              <span className="rounded-lg bg-amber-500 text-white px-3 py-1.5 text-xs font-bold shadow-xs">
                Leave : {leaveCount}
              </span>
            </div>
          </div>
        </div>

        {/* Day's Lecture Schedule Table */}
        <div className="overflow-x-auto scrollbar-thin p-5 sm:p-6">
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 border-r border-slate-200 text-center w-16">#</th>
                  <th className="py-3 px-4 border-r border-slate-200 min-w-[130px]">Time</th>
                  <th className="py-3 px-4 border-r border-slate-200 min-w-[110px]">Subject Code</th>
                  <th className="py-3 px-4 border-r border-slate-200 min-w-[240px]">Subject Name</th>
                  <th className="py-3 px-3 border-r border-slate-200 text-center min-w-[90px]">Theory / Practical</th>
                  <th className="py-3 px-4 border-r border-slate-200 min-w-[180px]">Faculty Name</th>
                  <th className="py-3 px-4 text-center min-w-[120px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {schedule.map((row) => (
                  <tr key={`${row.lectureNo}-${row.subjectCode}`} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 border-r border-slate-200 text-center font-bold text-slate-800">
                      {row.lectureNo}
                    </td>
                    <td className="py-2.5 px-4 border-r border-slate-200 font-semibold text-slate-700 whitespace-nowrap">
                      {row.time}
                    </td>
                    <td className="py-2.5 px-4 border-r border-slate-200 font-mono font-bold text-slate-900">
                      {row.subjectCode}
                    </td>
                    <td className="py-2.5 px-4 border-r border-slate-200 font-semibold text-slate-800">
                      {row.subjectName}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-200 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.type === "Practical" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                      }`}>
                        {row.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 border-r border-slate-200 font-semibold text-slate-700">
                      {row.faculty}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          row.status === "Present"
                            ? "bg-emerald-100 text-emerald-800"
                            : row.status === "Absent"
                            ? "bg-rose-100 text-rose-800"
                            : row.status === "Leave"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
