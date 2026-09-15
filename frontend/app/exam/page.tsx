"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { useRequireStudent } from "@/lib/auth/use-require-student";
import {
  CAMPUS_SERVICES,
  getDynamicHallTicket,
  getDynamicAttendanceData,
  getDynamicStudentProfile,
} from "@/data/student-services";
import { ServiceActionDialog } from "@/components/service-action-dialog";

export default function ExaminationHubPage() {
  useRequireStudent();
  const { user } = useAuth();
  const profile = getDynamicStudentProfile(user?.email);
  const attendance = getDynamicAttendanceData(user?.email);
  const hallTicket = getDynamicHallTicket(user?.email);

  const [isHallTicketModalOpen, setIsHallTicketModalOpen] = useState(false);
  const examService = CAMPUS_SERVICES.find((s) => s.id === "exams-grading") || CAMPUS_SERVICES[1];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link href="/" className="hover:text-slate-800">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-bold">Examination</span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Examination Management & Hall Tickets
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/exam/results"
            className="rounded-xl bg-[#475b82] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#384a6b] transition-colors inline-flex items-center gap-1.5"
          >
            <span>📜</span> View Provisional Results →
          </Link>
        </div>
      </div>

      {/* Hero Cards: Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Hall Ticket Card */}
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/40 p-5 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-800 uppercase tracking-wide">
                {hallTicket.examSession}
              </span>
              <h2 className="mt-2 text-base sm:text-lg font-black text-slate-900">
                Official Examination Admit Card
              </h2>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed max-w-md">
                Verified candidate hall ticket for upcoming end-semester regular examinations. Seating hall allocations and verification QR included.
              </p>
            </div>
            <span className="text-3xl sm:text-4xl">🎫</span>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsHallTicketModalOpen(true)}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2"
            >
              <span>🖨️</span> Download / Print Hall Ticket
            </button>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
              ✓ Eligible (Attendance {attendance.overallPercentage}%)
            </span>
          </div>
        </div>

        {/* Results Card */}
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/40 p-5 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                All Semesters Marksheets
              </span>
              <h2 className="mt-2 text-base sm:text-lg font-black text-slate-900">
                Provisional Results & SPI / CPI
              </h2>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed max-w-md">
                Detailed semester performance, letter grades, credit points, cumulative SPI/CPI, and official attested marksheets.
              </p>
            </div>
            <span className="text-3xl sm:text-4xl">📊</span>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href="/exam/results"
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-2"
            >
              <span>🔍</span> Open Provisional Results Portal
            </Link>
            <span className="text-[11px] font-semibold text-slate-600">
              Current CPI: <strong className="text-slate-900">{profile.cgpa}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Upcoming Exam Schedule Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-[#475b82] text-white px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold tracking-wide">
              {hallTicket.examSession}
            </h2>
            <p className="text-[11px] text-slate-200">
              Allocated Exam Center: {hallTicket.centerName} ({hallTicket.centerCode})
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsHallTicketModalOpen(true)}
            className="self-start sm:self-auto rounded-lg bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 text-xs font-bold transition-all"
          >
            View Full Admit Card PDF
          </button>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse min-w-[650px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-3 px-4">Subject Code</th>
                <th className="py-3 px-4 min-w-[200px]">Subject Name</th>
                <th className="py-3 px-4">Exam Date</th>
                <th className="py-3 px-4">Timing</th>
                <th className="py-3 px-4">Hall / Room</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {hallTicket.papers.map((paper) => (
                <tr key={paper.code} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {paper.code}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {paper.name}
                  </td>
                  <td className="py-3 px-4 text-rose-700 font-semibold">
                    {paper.date}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {paper.time}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {paper.room}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                      Confirmed
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hall Ticket Printable Modal */}
      {isHallTicketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">Official Examination Hall Ticket</h3>
              <button
                type="button"
                onClick={() => setIsHallTicketModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Printable Admit Card Form */}
            <div className="border-2 border-slate-800 p-5 rounded-xl space-y-4">
              <div className="text-center border-b-2 border-slate-800 pb-3">
                <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500">
                  OFFICE OF CONTROLLER OF EXAMINATIONS • STUDENT REGISTRY
                </p>
                <h4 className="text-base font-black uppercase text-slate-900 mt-1">
                  OFFICIAL EXAMINATION ADMIT CARD
                </h4>
                <p className="text-xs font-semibold text-rose-700">
                  {hallTicket.examSession}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs py-2 border-b border-slate-200">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Student Name</p>
                  <p className="font-bold text-slate-900">{profile.name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Enrollment No</p>
                  <p className="font-mono font-bold text-slate-900">{profile.enrollmentNo}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Degree Program</p>
                  <p className="font-semibold text-slate-800">{profile.program}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Center Code</p>
                  <p className="font-bold text-slate-800">{hallTicket.centerCode}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-slate-700 mb-2">Paper Timetable:</p>
                <div className="overflow-x-auto rounded border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold">
                      <tr>
                        <th className="p-2">Code</th>
                        <th className="p-2">Subject</th>
                        <th className="p-2">Date</th>
                        <th className="p-2">Time</th>
                        <th className="p-2">Room</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {hallTicket.papers.map((p) => (
                        <tr key={p.code}>
                          <td className="p-2 font-mono font-bold">{p.code}</td>
                          <td className="p-2">{p.name}</td>
                          <td className="p-2 text-rose-700 font-semibold">{p.date}</td>
                          <td className="p-2">{p.time}</td>
                          <td className="p-2">{p.room}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-200 space-y-1">
                <p className="font-bold text-slate-700">Instructions to Candidates:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {hallTicket.instructions.map((ins, i) => (
                    <li key={i}>{ins}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                🖨️ Print / Save PDF
              </button>
              <button
                type="button"
                onClick={() => setIsHallTicketModalOpen(false)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
