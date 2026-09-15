"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { useRequireStudent } from "@/lib/auth/use-require-student";
import {
  getDynamicFeeReceipts,
  getDynamicFeeInvoice,
  CAMPUS_SERVICES,
  getDynamicStudentProfile,
  type FeeReceiptRecord,
} from "@/data/student-services";
import { PaymentCheckoutModal } from "@/components/payment-checkout-modal";
import { listMyPayments, type PaymentTransactionOut } from "@/lib/api/payments";

export default function FeesHistoryPage() {
  useRequireStudent();
  const { user, accessToken } = useAuth();
  const profile = getDynamicStudentProfile(user?.email);
  const feeInvoice = getDynamicFeeInvoice(user?.email);
  const defaultReceipts = getDynamicFeeReceipts(user?.email);

  const [dbPayments, setDbPayments] = useState<PaymentTransactionOut[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [hasPaidLive, setHasPaidLive] = useState(false);

  function reloadPayments() {
    if (!accessToken) return;
    listMyPayments(accessToken)
      .then((data) => {
        setDbPayments(data);
        if (data.some((d) => d.status === "success" && d.fee_type === "tuition")) {
          setHasPaidLive(true);
        }
      })
      .catch(() => {});
  }

  useEffect(() => {
    reloadPayments();
  }, [accessToken]);

  // Combine live DB payments with historical catalog receipts
  const liveReceipts: any[] = dbPayments
    .filter((p) => p.status === "success")
    .map((p) => ({
      id: p.id,
      academicYear: p.academic_year,
      semester: p.semester,
      receiptDate: new Date(p.completed_at || p.created_at).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      receiptNo: p.receipt_no || `REC-2026-${p.id.slice(0, 6).toUpperCase()}`,
      amount: p.amount,
      paymentType: p.payment_method?.toUpperCase() || "ONLINE GATEWAY",
      isLive: true,
      hash: p.receipt_hash,
      orderId: p.order_id,
      paymentId: p.payment_id,
    }));

  const allReceipts = [...liveReceipts, ...defaultReceipts];
  const isPaid = feeInvoice.isPaid || hasPaidLive;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link href="/" className="hover:text-slate-800">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-bold">Fees Receipt Transaction</span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Fees Receipt Transaction & Online Settlement
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {isPaid ? (
            <button
              type="button"
              onClick={() => setIsCheckoutOpen(true)}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>✅</span> Semester Dues Settled (Make Additional Payment)
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsCheckoutOpen(true)}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer animate-pulse"
            >
              <span>💳</span> Pay Semester Dues (₹ {feeInvoice.totalDue.toLocaleString()})
            </button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Blue Title Banner */}
        <div className="bg-[#475b82] text-white px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold tracking-wide">
              Official University Fee Ledger & Receipt Register
            </h2>
            <p className="text-[11px] text-slate-200 mt-0.5">
              Verified records with digital SHA-256 integrity signature
            </p>
          </div>
          <span className="text-xs text-slate-200 font-medium">
            Student ID: <strong className="text-white font-mono">{profile.enrollmentNo}</strong>
          </span>
        </div>

        {/* Transaction History Table */}
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-700 font-bold">
                <th className="py-3.5 px-4">Academic Year</th>
                <th className="py-3.5 px-3">Semester</th>
                <th className="py-3.5 px-4">Receipt Date</th>
                <th className="py-3.5 px-4">Receipt No</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Payment Channel</th>
                <th className="py-3.5 px-4 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {allReceipts.map((row, idx) => (
                <tr key={row.id || idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {row.academicYear}
                  </td>
                  <td className="py-3 px-3">
                    <span className="rounded-lg bg-indigo-50 border border-indigo-100 px-2 py-0.5 font-bold text-indigo-700 text-[11px]">
                      {row.semester}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                    {row.receiptDate}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">
                    {row.receiptNo}
                    {row.isLive && (
                      <span className="ml-1.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2">
                        LIVE
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-black text-slate-900">
                    ₹ {Number(row.amount).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                      {row.paymentType}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedReceipt(row)}
                      title="Download / Print Official Receipt"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all shadow-xs cursor-pointer"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Footer Note */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p>
          💡 All payments are recorded in the institutional database with digital SHA-256 signatures. For fee installment plans, contact <strong>Bursar & Student Accounts</strong>.
        </p>
        <button
          type="button"
          onClick={() => setIsCheckoutOpen(true)}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline self-start sm:self-auto cursor-pointer"
        >
          Open Online Payment Checkout →
        </button>
      </div>

      {/* Receipt Preview & Print Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 text-lg">
                  🧾
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Official Fee Payment Receipt
                  </h3>
                  <p className="text-[11px] text-slate-500">University Bursar & Financial Services</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-300 p-4 bg-slate-50/70 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Receipt No:</span>
                <span className="font-mono font-bold text-indigo-700">{selectedReceipt.receiptNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Student Name:</span>
                <span className="font-bold text-slate-800">{profile.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Enrollment ID:</span>
                <span className="font-mono font-bold text-slate-800">{profile.enrollmentNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Academic Term:</span>
                <span className="font-semibold text-slate-800">{selectedReceipt.semester} ({selectedReceipt.academicYear})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction Date:</span>
                <span className="font-medium text-slate-800">{selectedReceipt.receiptDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Channel:</span>
                <span className="font-bold text-slate-800 uppercase">{selectedReceipt.paymentType}</span>
              </div>
              {selectedReceipt.hash && (
                <div className="flex justify-between border-t border-slate-200/80 pt-1.5">
                  <span className="text-slate-500">Verification Hash:</span>
                  <span className="font-mono text-[10px] text-slate-400 truncate max-w-[200px]">
                    {selectedReceipt.hash}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-sm">
                <span className="text-slate-800">Amount Paid:</span>
                <span className="text-emerald-700 font-black">₹ {Number(selectedReceipt.amount).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 cursor-pointer"
              >
                🖨️ Print Receipt
              </button>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-2 text-xs font-bold text-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Gateway Checkout Modal */}
      <PaymentCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onSuccess={() => {
          reloadPayments();
        }}
        accessToken={accessToken || undefined}
        studentEmail={user?.email}
        defaultAmount={feeInvoice.totalDue > 0 ? feeInvoice.totalDue : 45000}
        feeType="tuition"
        semester="Semester 6 - Fall 2026"
      />
    </div>
  );
}
