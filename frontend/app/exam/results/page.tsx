"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { useRequireStudent } from "@/lib/auth/use-require-student";
import {
  getDynamicExamResultsMap,
  getDynamicStudentProfile,
  CAMPUS_SERVICES,
} from "@/data/student-services";
import { ServiceActionDialog } from "@/components/service-action-dialog";

export default function ProvisionalResultPage() {
  useRequireStudent();
  const { user } = useAuth();
  const profile = getDynamicStudentProfile(user?.email);
  const resultsMap = getDynamicExamResultsMap(user?.email);
  const examKeys = Object.keys(resultsMap);

  const [selectedExamId, setSelectedExamId] = useState<string>(examKeys[0] || "sem-6-winter-2025");
  const [isRecheckModalOpen, setIsRecheckModalOpen] = useState(false);

  const currentResult = resultsMap[selectedExamId] || Object.values(resultsMap)[0];
  const examService = CAMPUS_SERVICES.find((s) => s.id === "exams-grading") || CAMPUS_SERVICES[1];

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link href="/" className="hover:text-slate-800">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-slate-500">Examination</span>
        <span>/</span>
        <span className="text-slate-800 font-bold">Provisional Result</span>
      </div>

      {/* Main Container matching media_1789019508271.png */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Blue Title Banner */}
        <div className="bg-[#475b82] text-white px-5 py-3.5 flex items-center justify-between">
          <h1 className="text-sm sm:text-base font-bold tracking-wide">
            Provisional Result
          </h1>
          <span className="text-xs text-slate-200 font-medium">
            Academic Performance Evaluation
          </span>
        </div>

        {/* Dropdown Selector Area */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="max-w-xl space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Exam Name
            </label>
            <div className="relative">
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 shadow-xs cursor-pointer"
              >
                <option value="">---Select Exam Name---</option>
                {examKeys.map((key) => {
                  const res = resultsMap[key];
                  return (
                    <option key={key} value={key}>
                      {profile.program} - {res.semester} ({res.academicYear})
                    </option>
                  );
                })}
              </select>
            </div>
            <p className="text-[11px] text-slate-500">
              Select any past semester examination session to view verified grade sheets.
            </p>
          </div>
        </div>

        {/* Dynamic Results Display */}
        {currentResult ? (
          <div className="p-5 sm:p-6 space-y-6">
            {/* Student Header Card */}
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Student Name</p>
                <p className="font-bold text-slate-900">{profile.name}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Enrollment Number</p>
                <p className="font-mono font-bold text-slate-900">{profile.enrollmentNo}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Semester / Term</p>
                <p className="font-bold text-slate-900">{currentResult.semester} ({currentResult.academicYear})</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Result Declaration</p>
                <p className="font-medium text-slate-700">{currentResult.declarationDate}</p>
              </div>
            </div>

            {/* Marksheet Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 border-r border-slate-200 w-28">Subject Code</th>
                    <th className="py-3 px-4 border-r border-slate-200">Subject Name</th>
                    <th className="py-3 px-3 border-r border-slate-200 text-center w-20">Credits</th>
                    <th className="py-3 px-3 border-r border-slate-200 text-center w-24">Grade</th>
                    <th className="py-3 px-3 text-center w-28">Grade Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {currentResult.subjects.map((sub) => (
                    <tr key={sub.code} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 border-r border-slate-200">
                        {sub.code}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800 border-r border-slate-200">
                        {sub.name}
                      </td>
                      <td className="py-2.5 px-3 text-center border-r border-slate-200">
                        {sub.credits}
                      </td>
                      <td className="py-2.5 px-3 text-center border-r border-slate-200">
                        <span className="inline-block px-2.5 py-0.5 rounded font-black text-xs bg-emerald-100 text-emerald-800">
                          {sub.grade}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                        {sub.gradePoints} / 10
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Performance Summary Bar (SPI / CPI / Credits) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-900 text-white">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Credits Earned</p>
                <p className="text-xl font-black">{currentResult.totalCredits}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Semester Index (SPI)</p>
                <p className="text-xl font-black text-emerald-400">{currentResult.spi}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Cumulative Index (CPI)</p>
                <p className="text-xl font-black text-indigo-300">{currentResult.cpi}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Official Result Status</p>
                <span className="inline-block mt-0.5 rounded bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                  {currentResult.resultStatus}
                </span>
              </div>
            </div>

            {/* Actions: Re-evaluation or Print Marksheet */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                <span>Discrepancy in grade calculation? </span>
                <button
                  type="button"
                  onClick={() => setIsRecheckModalOpen(true)}
                  className="font-bold text-indigo-600 hover:underline"
                >
                  Apply for Re-evaluation / Paper Inspection →
                </button>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                🖨️ Print Official Grade Card
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs">
            Please select an examination session from the dropdown above to load your grade report.
          </div>
        )}
      </div>

      <ServiceActionDialog
        service={examService}
        isOpen={isRecheckModalOpen}
        onClose={() => setIsRecheckModalOpen(false)}
      />
    </div>
  );
}
