"use client";

import { useState, useEffect, type FormEvent } from "react";
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
import { getExamFormStatus, registerExamForm, type ExamFormStatusOut } from "@/lib/api/academic";
import { ApiError } from "@/lib/api/client";

export default function ExaminationHubPage() {
  useRequireStudent();
  const { user, accessToken } = useAuth();
  const profile = getDynamicStudentProfile(user?.email);
  const attendance = getDynamicAttendanceData(user?.email);
  const hallTicket = getDynamicHallTicket(user?.email);

  const [isHallTicketModalOpen, setIsHallTicketModalOpen] = useState(false);
  const examService = CAMPUS_SERVICES.find((s) => s.id === "exams-grading") || CAMPUS_SERVICES[1];

  // Live Exam Form Status
  const [examStatus, setExamStatus] = useState<ExamFormStatusOut | null>(null);
  const [examStatusError, setExamStatusError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);
  const [selectedPapers, setSelectedPapers] = useState<string[]>([]);

  useEffect(() => {
    if (!accessToken) return;
    getExamFormStatus(accessToken)
      .then(setExamStatus)
      .catch(() => setExamStatusError("Unable to check exam form status."));
  }, [accessToken]);

  async function handleExamRegister(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setRegError(null);
    setRegSuccess(null);
    setIsRegistering(true);
    try {
      const papersPayload = selectedPapers.map((code) => {
        const found = hallTicket.papers.find((p) => p.code === code);
        return { code, title: found ? found.name : code };
      });
      await registerExamForm(accessToken, {
        semester: profile.semester || "Semester 6",
        papers: papersPayload,
      });
      setRegSuccess("✅ Examination form submitted successfully! You will receive confirmation on your registered email.");
    } catch (err) {
      setRegError(err instanceof ApiError ? String(err.detail) : "Registration failed. Please try again.");
    } finally {
      setIsRegistering(false);
    }
  }

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

      {/* Live Examination Form Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>📋</span> Semester Examination Form Submission
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Admin-controlled registration window for upcoming university examinations.
            </p>
          </div>
          {examStatus && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-black inline-flex items-center gap-1.5 ${
                examStatus.is_active
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : "bg-rose-100 text-rose-800 border border-rose-200"
              }`}
            >
              {examStatus.is_active ? "🟢 Registration OPEN" : "🔴 Registration CLOSED"}
            </span>
          )}
        </div>

        {examStatusError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 font-medium">
            ⚠️ {examStatusError}
          </div>
        )}

        {examStatus && !examStatus.is_active && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 space-y-1 text-xs">
            <p className="font-bold text-rose-900">
              🔒 Examination Registration is currently CLOSED by the Controller of Examinations.
            </p>
            <p className="text-rose-700">
              The examination registration portal for <strong>{examStatus.session_name}</strong> is not accepting submissions at this time. Please check back when announced by the administration.
            </p>
            {examStatus.announcement && (
              <p className="mt-2 text-xs text-slate-700 bg-white/80 p-2 rounded-lg border border-rose-200 font-mono">
                📢 {examStatus.announcement}
              </p>
            )}
          </div>
        )}

        {examStatus && examStatus.is_active && (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <p className="font-bold text-emerald-900">
                  ✅ Active Session: {examStatus.session_name}
                </p>
                <span className="font-bold text-emerald-800">
                  Examination Fee: ₹{examStatus.fee_amount}
                </span>
              </div>
              {examStatus.announcement && (
                <p className="text-emerald-700">{examStatus.announcement}</p>
              )}
            </div>

            {regSuccess && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-100/80 p-3 text-xs font-bold text-emerald-900">
                {regSuccess}
              </div>
            )}
            {regError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800">
                ⚠️ {regError}
              </div>
            )}

            {!regSuccess && (
              <form onSubmit={handleExamRegister} className="space-y-4">
                <p className="text-xs font-bold text-slate-700">
                  Select Examination Papers for Registration:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {hallTicket.papers.map((p) => {
                    const isSelected = selectedPapers.includes(p.code);
                    return (
                      <label
                        key={p.code}
                        className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-50/60"
                            : "border-slate-200 bg-slate-50 hover:bg-slate-100/70"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPapers([...selectedPapers, p.code]);
                            } else {
                              setSelectedPapers(selectedPapers.filter((c) => c !== p.code));
                            }
                          }}
                          className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <p className="font-mono font-bold text-slate-900">{p.code}</p>
                          <p className="text-slate-700">{p.name}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                  <span className="text-xs text-slate-500">
                    Selected: {selectedPapers.length} of {hallTicket.papers.length} papers
                  </span>
                  <button
                    type="submit"
                    disabled={isRegistering}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-2.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isRegistering ? "Submitting Registration…" : "🚀 Submit Examination Form"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
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
