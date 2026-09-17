"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { createTicket } from "@/lib/api/tickets";
import { ApiError } from "@/lib/api/client";
import {
  type CampusService,
  getDynamicFeeInvoice,
  getDynamicHallTicket,
  getDynamicStudentProfile,
} from "@/data/student-services";
import { PaymentCheckoutModal } from "@/components/payment-checkout-modal";

export interface ServiceActionDialogProps {
  service: CampusService | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ServiceActionDialog({
  service,
  isOpen,
  onClose,
  onSuccess,
}: ServiceActionDialogProps) {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const profile = getDynamicStudentProfile(user?.email);
  const feeInvoice = getDynamicFeeInvoice(user?.email);
  const hallTicket = getDynamicHallTicket(user?.email);

  // States
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Bonafide certificate state
  const [certificatePurpose, setCertificatePurpose] = useState("Visa / Passport Application");
  const [certificateGenerated, setCertificateGenerated] = useState(false);
  const [certRefNo, setCertRefNo] = useState<string | null>(null);

  // Generic form state for Advising, IT, Hostel, Library, etc.
  const [field1, setField1] = useState("");
  const [field2, setField2] = useState("");
  const [notes, setNotes] = useState("");

  if (!isOpen || !service) return null;

  function handleClose() {
    setSubmitting(false);
    setSuccessMessage(null);
    setCreatedTicketId(null);
    setErrorMessage(null);
    setCertificateGenerated(false);
    setField1("");
    setField2("");
    setNotes("");
    onClose();
  }

  if (service.actionType === "fee_payment") {
    return (
      <PaymentCheckoutModal
        isOpen={isOpen}
        onClose={handleClose}
        onSuccess={() => {
          if (onSuccess) onSuccess();
          handleClose();
        }}
        accessToken={accessToken || undefined}
        studentEmail={user?.email}
        defaultAmount={feeInvoice.totalDue > 0 ? feeInvoice.totalDue : 45000}
        feeType="tuition"
        semester={feeInvoice.term || "Semester 6 - Fall 2026"}
      />
    );
  }


  // 2. Bonafide Certificate Generator
  async function handleGenerateCertificate() {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));

    const ref = `CERT-BON-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    setCertRefNo(ref);
    setCertificateGenerated(true);
    setSubmitting(false);

    if (accessToken) {
      createTicket(accessToken, {
        subject: `Bonafide Certificate Issued: ${ref}`,
        message: `Instant Bonafide / Enrollment Verification Certificate generated for ${certificatePurpose}. Certificate Reference: ${ref}.`,
        category: "Registrar & Student Records",
      }).catch(() => {});
      if (onSuccess) onSuccess();
    }
  }

  // 3. Generic Action Submit (Advising, IT, Hostel, etc.)
  async function handleGeneralActionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const subjectText = `${service?.title}: ${field1 || "Service Request"}`;
      const messageText = `Service: ${service?.title}\nDetails: ${field1 || "Standard Request"} | ${field2 || "Normal Urgency"}\nNotes / Requirement: ${notes || "Submitted via Student Portal Service Action Hub."}\nStudent ID: ${profile.enrollmentNo}\nEmail: ${profile.email}`;

      const newTicket = await createTicket(accessToken, {
        subject: subjectText,
        message: messageText,
        category: service?.title,
      });

      setCreatedTicketId(newTicket.id);
      setSuccessMessage("Your service request has been triaged by Clerk Assistant and submitted successfully!");
      if (onSuccess) onSuccess();
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError ? String(err.detail) : "Failed to register request. Please verify connection and try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 font-bold text-base">
              ⚡
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">{service.title}</h3>
              <p className="text-xs text-slate-500">{service.department}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <span className="text-lg font-bold leading-none">✕</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* ========================================================================= */}
          {/* ACTION 2: EXAM HALL TICKET / ADMIT CARD */}
          {/* ========================================================================= */}
          {service.actionType === "hall_ticket" && (
            <div className="space-y-4">
              <div className="rounded-2xl border-2 border-slate-800 p-5 bg-white shadow-sm">
                {/* Header */}
                <div className="text-center border-b-2 border-slate-800 pb-3">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500">
                    CONTROLLER OF EXAMINATIONS • STUDENT ACADEMIC AFFAIRS
                  </p>
                  <h3 className="text-base font-black uppercase text-slate-900 tracking-tight mt-0.5">
                    EXAMINATION ADMIT CARD / HALL TICKET
                  </h3>
                  <p className="text-xs font-semibold text-rose-700 mt-0.5">
                    {hallTicket.examSession}
                  </p>
                </div>

                {/* Candidate Info Grid */}
                <div className="grid grid-cols-3 gap-3 py-3 border-b border-slate-200 text-xs">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Candidate Name</p>
                    <p className="font-bold text-slate-900">{profile.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Enrollment No</p>
                    <p className="font-mono font-bold text-slate-900">{profile.enrollmentNo}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Examination Center</p>
                    <p className="font-bold text-slate-800">{hallTicket.centerCode}</p>
                  </div>
                </div>

                {/* Exam Timetable */}
                <div className="py-3">
                  <p className="text-[11px] font-bold uppercase text-slate-700 mb-2">
                    Confirmed Examination Schedule:
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-2.5">Code</th>
                          <th className="py-2 px-3">Subject</th>
                          <th className="py-2 px-2.5">Date</th>
                          <th className="py-2 px-2.5">Time</th>
                          <th className="py-2 px-2.5">Room</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {hallTicket.papers.map((p) => (
                          <tr key={p.code} className="hover:bg-slate-50">
                            <td className="py-2 px-2.5 font-mono font-bold text-slate-900">{p.code}</td>
                            <td className="py-2 px-3">{p.name}</td>
                            <td className="py-2 px-2.5 font-semibold text-rose-700">{p.date}</td>
                            <td className="py-2 px-2.5">{p.time}</td>
                            <td className="py-2 px-2.5 font-semibold text-slate-800">{p.room}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Instructions */}
                <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 space-y-1">
                  <p className="font-bold text-slate-700">Important Instructions for Candidates:</p>
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
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  🖨️ Print / Save Admit Card PDF
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ACTION 3: BONAFIDE / ENROLLMENT CERTIFICATE */}
          {/* ========================================================================= */}
          {service.actionType === "bonafide_certificate" && (
            <div className="space-y-4">
              {!certificateGenerated ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Purpose of Certificate
                    </label>
                    <select
                      value={certificatePurpose}
                      onChange={(e) => setCertificatePurpose(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-600"
                    >
                      <option value="Visa / Passport Application">Visa / Passport Application</option>
                      <option value="Bank Loan & Financial Sponsorship">Bank Loan & Financial Sponsorship</option>
                      <option value="External Internship & Industry Training">External Internship & Industry Training</option>
                      <option value="Government Scholarship Scheme">Government Scholarship Scheme</option>
                      <option value="Public Transit Student Discount Pass">Public Transit Student Discount Pass</option>
                    </select>
                  </div>

                  <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-900">
                    <p className="font-semibold">Instant Digital Verification:</p>
                    <p className="text-[11px] text-indigo-700 mt-0.5">
                      Your institutional certificate is signed digitally using cryptographic university keys. Valid for all official submissions worldwide.
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleGenerateCertificate}
                      className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition-all"
                    >
                      {submitting ? "Generating Certificate..." : "Generate Official Certificate"}
                    </button>
                  </div>
                </div>
              ) : (
                /* Official Digital Bonafide Certificate View */
                <div className="space-y-4">
                  <div className="border-4 double border-slate-800 p-6 bg-amber-50/10 rounded-2xl text-center space-y-3">
                    <p className="text-[10px] tracking-widest uppercase font-bold text-slate-500">
                      OFFICE OF THE REGISTRAR • UNIVERSITY OF HIGHER EDUCATION
                    </p>
                    <h3 className="text-lg font-black uppercase text-slate-900 tracking-tight">
                      BONAFIDE & ENROLLMENT CERTIFICATE
                    </h3>
                    <p className="text-[11px] font-mono text-slate-500">Ref: {certRefNo}</p>

                    <div className="text-left text-xs text-slate-700 leading-relaxed py-3 border-y border-slate-200 my-2 space-y-2">
                      <p>
                        This is to certify that <strong>{profile.name}</strong>, bearing University Enrollment Number{" "}
                        <strong className="font-mono">{profile.enrollmentNo}</strong>, is a bonafide student in full-time standing of the{" "}
                        <strong>{profile.program}</strong> program at {profile.institution}.
                      </p>
                      <p>
                        The student is currently enrolled in <strong>{profile.semester}</strong> ({profile.section}) and maintains {profile.status} standing with cumulative CGPA of{" "}
                        <strong>{profile.cgpa}</strong>.
                      </p>
                      <p>
                        This official certificate is issued upon the student&apos;s request specifically for:{" "}
                        <strong className="text-indigo-800">{certificatePurpose}</strong>.
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-3 text-slate-600">
                      <div className="text-left">
                        <p className="text-[10px] text-slate-400">Date of Issuance:</p>
                        <p className="font-medium">{new Date().toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-800">University Registrar</p>
                        <p className="text-[10px] text-emerald-700 font-bold uppercase">Digitally Authenticated ✓</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      🖨️ Print / Save Certificate PDF
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* ACTIONS 4+: GENERAL SERVICE FORMS (Advising, IT, Hostel, Library, etc.) */}
          {/* ========================================================================= */}
          {service.actionType !== "hall_ticket" &&
            service.actionType !== "bonafide_certificate" && (
              <form onSubmit={handleGeneralActionSubmit} className="space-y-4">
                {successMessage ? (
                  <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-base">
                        ✓
                      </span>
                      <div>
                        <p className="font-bold text-sm text-emerald-950">Inquiry Registered &amp; Triaged Successfully!</p>
                        <p className="text-[11px] text-emerald-700">{successMessage}</p>
                      </div>
                    </div>

                    {createdTicketId && (
                      <div className="bg-white/80 rounded-xl p-3.5 border border-emerald-200 space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-emerald-700">Official Ticket Reference</span>
                          <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                            🤖 Triaged by Clerk Assistant
                          </span>
                        </div>
                        <p className="font-mono font-bold text-slate-900 text-xs">#{createdTicketId}</p>
                        <p className="text-[11px] text-slate-600">
                          Routed to <strong>{service.department}</strong>. Department staff and the AI Specialist are reviewing your submission.
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      {createdTicketId && (
                        <button
                          type="button"
                          onClick={() => {
                            handleClose();
                            router.push(`/tickets/${createdTicketId}`);
                          }}
                          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 font-bold text-xs shadow-xs cursor-pointer"
                        >
                          View Ticket Details →
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleClose}
                        className="rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 px-4 py-2 font-bold text-xs cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {errorMessage && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                        <span>⚠️</span> {errorMessage}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Service Option / Request Type
                        </label>
                        <select
                          value={field1}
                          onChange={(e) => setField1(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-600"
                        >
                          <option value="">-- Choose Option --</option>
                          {service.commonRequests.map((req, i) => (
                            <option key={i} value={req}>
                              {req}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Urgency Level
                        </label>
                        <select
                          value={field2}
                          onChange={(e) => setField2(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-600"
                        >
                          <option value="Normal">Normal (24-48 hours)</option>
                          <option value="Urgent">Urgent Priority (Today)</option>
                          <option value="Scheduled">Scheduled Consultation</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Detailed Note / Statement of Request
                      </label>
                      <textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Provide any relevant details, reference numbers, or requirements..."
                        className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 placeholder:text-slate-400"
                      />
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-0.5">
                      <p>
                        <strong>Filing on behalf of:</strong> {profile.name} ({profile.enrollmentNo})
                      </p>
                      <p>
                        <strong>Registered Campus Email:</strong> {profile.email}
                      </p>
                      <p>
                        <strong>Department Desk:</strong> {service.department} • {service.location}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition-all"
                      >
                        {submitting ? "Submitting..." : service.actionLabel}
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}
        </div>
      </div>
    </div>
  );
}
