"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { useRequireFaculty } from "@/lib/auth/use-require-faculty";
import { listRoutedTickets, type FacultyTicketOut } from "@/lib/api/faculty";
import { triageStudentQueryClient } from "@/lib/services/clerk-triage";
import {
  sendEmail,
  sendBroadcastEmail,
  listSentEmails,
  listStudentsDirectory,
  getSmtpConfig,
  updateSmtpConfig,
  testSmtpConnection,
  type EmailOut,
  type StudentRecipientOut,
  type SmtpConfigOut,
  type BroadcastEmailResultOut,
} from "@/lib/api/emails";
import {
  listAssignments,
  createAssignment,
  getAssignmentDetail,
  deleteAssignment,
  gradeSubmission,
  listAttendanceSessions,
  recordAttendanceSession,
  getStudentRoster,
  type AssignmentOut,
  type AssignmentDetailOut,
  type AttendanceSessionOut,
  type StudentRosterItemOut,
} from "@/lib/api/academic";
import { ApiError } from "@/lib/api/client";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-amber-100 text-amber-800 border border-amber-200",
  answered: "bg-blue-100 text-blue-800 border border-blue-200",
  escalated: "bg-rose-100 text-rose-800 border border-rose-200",
  closed: "bg-emerald-100 text-emerald-800 border border-emerald-200",
};

const FACULTY_DIRECTORY: Record<
  string,
  { name: string; dept: string; staffId: string; room: string; hours: string }
> = {
  "admin@university.edu": {
    name: "Dr. Admin Directorate",
    dept: "Office of the Academic Provost",
    staffId: "ADM-2026-0001",
    room: "Main Admin Tower · Room 101",
    hours: "Mon-Fri 9 AM - 5 PM",
  },
  "dean.anderson@university.edu": {
    name: "Dean Arthur Anderson",
    dept: "Faculty of Engineering & Computing Sciences",
    staffId: "FAC-2026-1001",
    room: "Deanery Suite · Room 501",
    hours: "Mon & Thu 10 AM - 12 PM",
  },
  "dr_391902@university.edu": {
    name: "Dr. Marcus Vance",
    dept: "Software Systems & Software Engineering",
    staffId: "FAC-2026-1002",
    room: "Engineering Block B · Room 314",
    hours: "Tue & Fri 2 PM - 4 PM",
  },
  "prof_471982@university.edu": {
    name: "Prof. Elena Rostova",
    dept: "Computer Networks & Cyber Defense",
    staffId: "FAC-2026-1003",
    room: "Computing Lab Wing · Room 220",
    hours: "Wed 1 PM - 4 PM",
  },
  "prof_rbac_test@university.edu": {
    name: "Prof. Robert Taylor",
    dept: "Distributed Cloud Systems & Microservices",
    staffId: "FAC-2026-1004",
    room: "Science & Tech Wing · Room 412",
    hours: "Tue & Thu 2 PM - 4:30 PM",
  },
  "prof.sharma@university.edu": {
    name: "Prof. Aisha Sharma",
    dept: "Artificial Intelligence & Machine Learning",
    staffId: "FAC-2026-1005",
    room: "AI Innovation Center · Room 305",
    hours: "Mon & Wed 11 AM - 1 PM",
  },
  "dr.patel@university.edu": {
    name: "Dr. Rajesh Patel",
    dept: "Data Science & Database Architectures",
    staffId: "FAC-2026-1006",
    room: "Data Analytics Lab · Room 418",
    hours: "Tue & Thu 10 AM - 12 PM",
  },
  "prof.chen@university.edu": {
    name: "Prof. Wei Chen",
    dept: "Internet of Things & Embedded Systems",
    staffId: "FAC-2026-1007",
    room: "Hardware Systems Wing · Room 112",
    hours: "Wed & Fri 3 PM - 5 PM",
  },
  "dr.williams@university.edu": {
    name: "Dr. Sarah Williams",
    dept: "Human-Computer Interaction & User Experience",
    staffId: "FAC-2026-1008",
    room: "Design Studio · Room 208",
    hours: "Mon & Thu 2 PM - 4 PM",
  },
  "prof.miller@university.edu": {
    name: "Prof. David Miller",
    dept: "Algorithms & Discrete Mathematics",
    staffId: "FAC-2026-1009",
    room: "Math Science Wing · Room 402",
    hours: "Tue & Fri 9 AM - 11 AM",
  },
  "dr.garcia@university.edu": {
    name: "Dr. Sofia Garcia",
    dept: "Financial Technology & Applied Computing",
    staffId: "FAC-2026-1010",
    room: "FinTech Hub · Room 322",
    hours: "Mon & Wed 3 PM - 5 PM",
  },
};

// ----------------------------------------------------
// Subcomponent: Email Composer, Live SMTP Settings, and Sent Log
// ----------------------------------------------------
function FacultyEmailComposerSection({
  accessToken,
  prefilledEmail,
  onClearPrefill,
}: {
  accessToken: string;
  prefilledEmail?: string;
  onClearPrefill?: () => void;
}) {
  const [students, setStudents] = useState<StudentRecipientOut[]>([]);
  const [sendMode, setSendMode] = useState<"individual" | "broadcast">("individual");
  const [recipientEmail, setRecipientEmail] = useState(prefilledEmail || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sentEmails, setSentEmails] = useState<EmailOut[] | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSmtpConfig, setShowSmtpConfig] = useState(false);

  // SMTP Settings State
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfigOut | null>(null);
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpTls, setSmtpTls] = useState(true);
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("University Faculty Advising");
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [testRecipient, setTestRecipient] = useState("");
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpFeedback, setSmtpFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (prefilledEmail === "BROADCAST_ALL") {
      setSendMode("broadcast");
      setRecipientEmail("");
    } else if (prefilledEmail) {
      setSendMode("individual");
      setRecipientEmail(prefilledEmail);
    }
  }, [prefilledEmail]);

  function reload() {
    listStudentsDirectory(accessToken).then(setStudents).catch(() => {});
    listSentEmails(accessToken).then(setSentEmails).catch(() => {});
    getSmtpConfig(accessToken)
      .then((cfg) => {
        setSmtpConfig(cfg);
        if (cfg.smtp_host) setSmtpHost(cfg.smtp_host);
        if (cfg.smtp_port) setSmtpPort(cfg.smtp_port);
        if (cfg.smtp_user) setSmtpUser(cfg.smtp_user);
        if (cfg.from_email) setFromEmail(cfg.from_email);
        if (cfg.from_name) setFromName(cfg.from_name);
        setSmtpTls(cfg.smtp_tls);
      })
      .catch(() => {});
  }

  useEffect(reload, [accessToken]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      setErrorMsg("Please fill in both subject and message body.");
      return;
    }
    if (sendMode === "individual" && !recipientEmail) {
      setErrorMsg("Please choose or enter a recipient email address.");
      return;
    }

    setIsSending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (sendMode === "broadcast") {
        const res = await sendBroadcastEmail(accessToken, {
          subject: subject.trim(),
          body: body.trim(),
        });
        if (res.delivered_smtp_count > 0) {
          setSuccessMsg(
            `📢 Group Announcement successfully sent! Delivered live to ${res.delivered_smtp_count} student mailboxes via SMTP and stored in all ${res.total_recipients} student portal inboxes.`
          );
        } else if (res.failed_smtp_count > 0) {
          setErrorMsg(
            `⚠️ Group Announcement saved in all ${res.total_recipients} student portal inboxes, but external mailbox delivery failed for ${res.failed_smtp_count} students. (Check SMTP settings: a 16-character Google App Password is required).`
          );
        } else {
          setSuccessMsg(
            `📢 Group Announcement successfully stored in all ${res.total_recipients} student portal inboxes! (Configure Real Mailbox / SMTP below to deliver to external inboxes like Gmail).`
          );
        }
      } else {
        const res = await sendEmail(accessToken, {
          recipient_email: recipientEmail,
          subject: subject.trim(),
          body: body.trim(),
        });
        if (res.status === "delivered_smtp") {
          setSuccessMsg(
            `✅ Email successfully delivered to both student portal inbox and external mailbox (${recipientEmail}) via SMTP!`
          );
        } else if (res.status.startsWith("smtp_error")) {
          setErrorMsg(
            `⚠️ Email saved in student's portal inbox, but real mailbox delivery failed: ${res.status.replace("smtp_error: ", "")}`
          );
        } else {
          setSuccessMsg(
            `📬 Email saved to student portal inbox. (Real mailbox delivery inactive; configure SMTP in the settings drawer below).`
          );
        }
      }

      setSubject("");
      setBody("");
      if (onClearPrefill) onClearPrefill();
      reload();
      setTimeout(() => {
        setSuccessMsg(null);
        setErrorMsg(null);
      }, 10000);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? String(err.detail) : "Failed to send email.");
    } finally {
      setIsSending(false);
    }
  }

  async function handleSaveSmtp(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingSmtp(true);
    setSmtpFeedback(null);
    try {
      const updated = await updateSmtpConfig(accessToken, {
        smtp_host: smtpHost.trim(),
        smtp_port: Number(smtpPort),
        smtp_user: smtpUser.trim(),
        smtp_password: smtpPassword ? smtpPassword.replace(/\s+/g, "").trim() : undefined,
        smtp_tls: smtpTls,
        from_email: (fromEmail || smtpUser).trim(),
        from_name: fromName.trim(),
        is_active: true,
      });
      setSmtpConfig(updated);
      setSmtpFeedback("✅ SMTP configuration updated and activated successfully!");
      setTimeout(() => setSmtpFeedback(null), 5000);
    } catch (err) {
      setSmtpFeedback(err instanceof ApiError ? `❌ ${err.detail}` : "❌ Failed to update SMTP settings.");
    } finally {
      setIsSavingSmtp(false);
    }
  }

  async function handleTestSmtp() {
    if (!testRecipient) {
      setSmtpFeedback("Please enter a test recipient email address.");
      return;
    }
    setIsTestingSmtp(true);
    setSmtpFeedback(null);
    try {
      const res = await testSmtpConnection(accessToken, testRecipient);
      if (res.success) {
        setSmtpFeedback(`✅ Test email delivered successfully to ${testRecipient}! Check your inbox.`);
      } else {
        setSmtpFeedback(`❌ Test email failed: ${res.message}`);
      }
      reload();
    } catch (err) {
      setSmtpFeedback(err instanceof ApiError ? `❌ ${err.detail}` : "❌ Test failed.");
    } finally {
      setIsTestingSmtp(false);
    }
  }

  const isLiveSmtpActive = Boolean(
    smtpConfig?.is_active && smtpConfig?.smtp_host && smtpConfig?.smtp_user && smtpConfig?.has_password
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>✉️</span> Student Communications & Email Dispatch
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Send official academic advising notices, assignment updates, or broadcast group announcements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSmtpConfig(!showSmtpConfig)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              isLiveSmtpActive
                ? "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                : "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
            }`}
          >
            {isLiveSmtpActive ? "🟢 Real Mailbox: Live (Gmail / SMTP)" : "⚙️ Configure Real Mailbox (Gmail / SMTP)"}
          </button>
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
          >
            {showHistory ? "✕ Hide Sent Log" : `📋 Sent History (${(sentEmails || []).length})`}
          </button>
        </div>
      </div>

      {/* SMTP Active Status Banner */}
      {!isLiveSmtpActive && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-medium">
            <span>ℹ️</span>
            <span>
              <strong>Real Mailbox Delivery Inactive:</strong> Dispatched messages are stored in student portal inboxes (<code className="font-mono bg-amber-100 px-1 py-0.5 rounded">/inbox</code>). Click <strong>&quot;Configure Real Mailbox&quot;</strong> to deliver directly to external email inboxes (like Gmail or Outlook).
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowSmtpConfig(true)}
            className="rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold px-2.5 py-1 text-[11px] shrink-0 self-start sm:self-auto cursor-pointer"
          >
            Setup Real Delivery →
          </button>
        </div>
      )}

      {/* SMTP Configuration Drawer / Modal */}
      {showSmtpConfig && (
        <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>⚙️</span> Real Mailbox Delivery Settings (Gmail / Custom SMTP)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Connect your institutional or personal Gmail account to deliver emails directly to students&apos; real inboxes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSmtpConfig(false)}
              className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
            >
              ✕ Close
            </button>
          </div>

          <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/40 p-3 text-xs text-indigo-200 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <span>💡</span> Google / Gmail Setup Instructions:
            </p>
            <p className="text-[11px] text-indigo-300">
              1. If your Google account has 2-Step Verification enabled, Google requires a <strong>16-character App Password</strong> (not your standard login password).
            </p>
            <p className="text-[11px] text-indigo-300">
              2. Visit{" "}
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 underline font-semibold"
              >
                myaccount.google.com/apppasswords
              </a>
              , create an app password named &quot;Student HelpDesk&quot;, and paste the 16 characters below.
            </p>
          </div>

          {smtpFeedback && (
            <div className="rounded-xl border border-indigo-500/50 bg-indigo-950/60 p-3 text-xs font-bold text-indigo-200">
              {smtpFeedback}
            </div>
          )}

          <form onSubmit={handleSaveSmtp} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">SMTP Server Host</label>
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.gmail.com"
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 py-2 px-3 text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">SMTP Port</label>
                <input
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(Number(e.target.value))}
                  placeholder="587"
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 py-2 px-3 text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Username / Sender Email</label>
                <input
                  type="text"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="your.email@gmail.com"
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 py-2 px-3 text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Password / App Password {smtpConfig?.has_password && "(saved in database)"}
                </label>
                <input
                  type="password"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  placeholder={smtpConfig?.has_password ? "•••••••••••••••• (Leave blank to keep current)" : "16-char Google App Password"}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 py-2 px-3 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Sender Display Name</label>
                <input
                  type="text"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="University Faculty & Advising"
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 py-2 px-3 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">From Header Email</label>
                <input
                  type="email"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder="Optional, defaults to SMTP username"
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 py-2 px-3 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="Test recipient (e.g. your email)"
                  className="rounded-xl bg-slate-800 border border-slate-700 py-1.5 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleTestSmtp}
                  disabled={isTestingSmtp}
                  className="rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs px-3 py-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isTestingSmtp ? "Testing…" : "🧪 Test SMTP"}
                </button>
              </div>

              <button
                type="submit"
                disabled={isSavingSmtp}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2 cursor-pointer transition-colors disabled:opacity-50"
              >
                {isSavingSmtp ? "Saving…" : "Save & Activate SMTP"}
              </button>
            </div>
          </form>
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2">
          <span>✅</span> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800 flex items-center gap-2">
          <span>⚠️</span> {errorMsg}
        </div>
      )}

      <form onSubmit={handleSend} className="space-y-4 bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200">
        {/* Mode Selector */}
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-200/60">
          <span className="text-xs font-bold text-slate-700 mr-1">Delivery Scope:</span>
          <button
            type="button"
            onClick={() => setSendMode("individual")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              sendMode === "individual"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            👤 Individual Student
          </button>
          <button
            type="button"
            onClick={() => setSendMode("broadcast")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              sendMode === "broadcast"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span>📢</span> Group Mail / Broadcast ({students.length} Students)
          </button>
        </div>

        {/* Individual Student Selection */}
        {sendMode === "individual" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Enrolled Student
              </label>
              <select
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              >
                <option value="">-- Choose a student recipient --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.email}>
                    {s.email} (Student)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Or Enter Direct Student Email
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="e.g. meetkadiya121@gmail.com"
                className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                required={sendMode === "individual"}
              />
            </div>
          </div>
        ) : (
          /* Broadcast Notice Callout */
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <span>📢</span> Broadcasting Announcement to All {students.length} Registered Students
              </span>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                Group Notice
              </span>
            </div>
            <p className="text-[11px] text-indigo-800/90 leading-relaxed">
              This notice will be recorded into every student&apos;s portal inbox (accessible at <code className="font-mono bg-indigo-100/80 px-1 py-0.5 rounded">/inbox</code>) and dispatched to their real mailbox if live SMTP is active.
            </p>
            <div className="flex flex-wrap gap-1 pt-1 max-h-20 overflow-y-auto">
              {students.map((s) => (
                <span key={s.id} className="text-[10px] font-mono bg-white border border-indigo-200 text-indigo-900 px-2 py-0.5 rounded-md">
                  {s.email}
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            {sendMode === "broadcast" ? "Group Announcement Subject" : "Email Subject / Academic Topic"}
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={
              sendMode === "broadcast"
                ? "e.g. [Important Notice] Mid-Semester Exam Schedule & Submission Deadlines"
                : "e.g. Course CS-401 Lab Submission & Consultation Schedule"
            }
            className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Message Content
          </label>
          <textarea
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              sendMode === "broadcast"
                ? "Write your official announcement for all students here..."
                : "Write your guidance or instruction for the student here..."
            }
            className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-normal text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-600 font-sans"
            required
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <p className="text-[11px] text-slate-500">
            {sendMode === "broadcast" ? (
              <span>
                📢 Will dispatch to <strong>{students.length} students</strong> simultaneously.
              </span>
            ) : (
              <span>
                {isLiveSmtpActive ? "🟢 Will deliver live to external email + portal inbox." : "📬 Will store in student portal inbox."}
              </span>
            )}
          </p>
          <button
            type="submit"
            disabled={isSending}
            className={`rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 ${
              sendMode === "broadcast"
                ? "bg-indigo-700 hover:bg-indigo-600"
                : "bg-indigo-600 hover:bg-indigo-500"
            }`}
          >
            {isSending
              ? "Dispatching…"
              : sendMode === "broadcast"
              ? `📢 Broadcast to All ${students.length} Students`
              : "📤 Dispatch Email to Student"}
          </button>
        </div>
      </form>

      {/* Sent History Table */}
      {showHistory && (
        <div className="border-t border-slate-100 pt-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Sent Communications Log ({(sentEmails || []).length})
          </h3>
          {sentEmails === null && <p className="text-xs text-slate-400">Loading history...</p>}
          {sentEmails !== null && sentEmails.length === 0 && (
            <p className="text-xs text-slate-400">No sent emails recorded yet.</p>
          )}
          {sentEmails !== null && sentEmails.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700">
                  <tr>
                    <th className="py-2 px-3">Recipient</th>
                    <th className="py-2 px-3">Subject</th>
                    <th className="py-2 px-3">Sent At</th>
                    <th className="py-2 px-3">Delivery Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sentEmails.map((se) => (
                    <tr key={se.id} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3 font-semibold text-slate-800">{se.recipient_email}</td>
                      <td className="py-2 px-3 text-slate-700">{se.subject}</td>
                      <td className="py-2 px-3 text-slate-500">{new Date(se.created_at).toLocaleString()}</td>
                      <td className="py-2 px-3">
                        {se.status === "delivered_smtp" ? (
                          <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                            ✓ Delivered to Real Mailbox
                          </span>
                        ) : se.status === "portal_inbox_only" ? (
                          <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold">
                            Portal Inbox Only
                          </span>
                        ) : se.status.startsWith("smtp_error") ? (
                          <span className="rounded-full bg-rose-100 text-rose-800 px-2 py-0.5 text-[10px] font-bold" title={se.status}>
                            ⚠️ SMTP Delivery Failed
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-[10px] font-bold">
                            {se.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// Subcomponent: Assignments Management Tab
// ----------------------------------------------------
function FacultyAssignmentsSection({ accessToken }: { accessToken: string }) {
  const [assignments, setAssignments] = useState<AssignmentOut[] | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentDetailOut | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New assignment form state
  const [courseCode, setCourseCode] = useState("CS-401");
  const [courseName, setCourseName] = useState("Distributed Cloud Systems & Microservices");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16)
  );
  const [totalPoints, setTotalPoints] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Grading form state
  const [gradingSubId, setGradingSubId] = useState<string | null>(null);
  const [gradeScore, setGradeScore] = useState<number>(90);
  const [gradeFeedback, setGradeFeedback] = useState<string>("");
  const [isGrading, setIsGrading] = useState(false);

  function reload() {
    setIsLoading(true);
    listAssignments(accessToken)
      .then((data) => {
        setAssignments(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setErrorMsg(err instanceof ApiError ? String(err.detail) : "Failed to load assignments.");
        setIsLoading(false);
      });
  }

  useEffect(reload, [accessToken]);

  async function handleCreateAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMsg("Please fill in assignment title and guidelines.");
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await createAssignment(accessToken, {
        course_code: courseCode,
        course_name: courseName,
        title: title.trim(),
        description: description.trim(),
        due_date: new Date(dueDate).toISOString(),
        total_points: Number(totalPoints),
      });
      setSuccessMsg(`Assignment "${title}" created successfully!`);
      setTitle("");
      setDescription("");
      setShowCreateModal(false);
      reload();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? String(err.detail) : "Failed to create assignment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOpenDetail(assignmentId: string) {
    try {
      const detail = await getAssignmentDetail(accessToken, assignmentId);
      setSelectedAssignment(detail);
    } catch (err) {
      setErrorMsg("Failed to load assignment submissions.");
    }
  }

  async function handleDelete(assignmentId: string) {
    if (!confirm("Are you sure you want to delete this assignment?")) return;
    try {
      await deleteAssignment(accessToken, assignmentId);
      setSuccessMsg("Assignment deleted.");
      if (selectedAssignment?.id === assignmentId) {
        setSelectedAssignment(null);
      }
      reload();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setErrorMsg("Failed to delete assignment.");
    }
  }

  async function handleGradeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAssignment || !gradingSubId) return;
    setIsGrading(true);
    try {
      await gradeSubmission(accessToken, selectedAssignment.id, {
        submission_id: gradingSubId,
        score: Number(gradeScore),
        feedback: gradeFeedback.trim() || undefined,
      });
      setSuccessMsg("Grade and feedback saved successfully!");
      setGradingSubId(null);
      handleOpenDetail(selectedAssignment.id);
      reload();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setErrorMsg("Failed to grade submission.");
    } finally {
      setIsGrading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>📝</span> Course Assignments & Project Milestones
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Publish course problem sets, view student submissions, evaluate code, and award grades.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(!showCreateModal)}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <span>➕</span> {showCreateModal ? "Cancel" : "Create New Assignment"}
          </button>
        </div>

        {successMsg && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2">
            <span>✅</span> {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800 flex items-center gap-2">
            <span>⚠️</span> {errorMsg}
          </div>
        )}

        {showCreateModal && (
          <form
            onSubmit={handleCreateAssignment}
            className="space-y-3.5 bg-slate-50/80 p-5 rounded-2xl border border-slate-200"
          >
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Publish New Course Assignment
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Course Module
                </label>
                <select
                  value={courseCode}
                  onChange={(e) => {
                    setCourseCode(e.target.value);
                    if (e.target.value === "CS-401") setCourseName("Distributed Cloud Systems & Microservices");
                    else if (e.target.value === "CS-404") setCourseName("Cloud Systems Implementation Lab");
                    else if (e.target.value === "CS-406") setCourseName("Cybersecurity, Ethics & Digital Privacy");
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                >
                  <option value="CS-401">CS-401: Distributed Cloud Systems</option>
                  <option value="CS-404">CS-404: Cloud Systems Lab</option>
                  <option value="CS-406">CS-406: Cybersecurity & Ethics</option>
                  <option value="IT-302">IT-302: Network Systems Architecture</option>
                  <option value="AI-501">AI-501: Applied Machine Learning</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Course Name
                </label>
                <input
                  type="text"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Assignment Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Lab 3: Docker Orchestration & Asynchronous Celery Workers"
                className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Description & Submission Instructions
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide problem specification, repo requirements, or rubric..."
                className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Due Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Maximum Points / Total Marks
                </label>
                <input
                  type="number"
                  value={totalPoints}
                  onChange={(e) => setTotalPoints(Number(e.target.value))}
                  min={10}
                  max={1000}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 text-xs font-bold shadow-sm transition-all disabled:opacity-50"
              >
                {isSubmitting ? "Publishing…" : "Publish Assignment"}
              </button>
            </div>
          </form>
        )}

        {isLoading && (
          <div className="py-8 text-center text-xs text-slate-400">Loading assignments...</div>
        )}

        {!isLoading && assignments && assignments.length === 0 && (
          <div className="py-10 text-center rounded-2xl border-2 border-dashed border-slate-200 p-6 space-y-2">
            <span className="text-3xl">📂</span>
            <h4 className="text-sm font-bold text-slate-800">No Course Assignments Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click &quot;Create New Assignment&quot; to publish your first coursework task or project milestone for enrolled students.
            </p>
          </div>
        )}

        {!isLoading && assignments && assignments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignments.map((a) => (
              <div
                key={a.id}
                className={`rounded-2xl border p-4 sm:p-5 transition-all flex flex-col justify-between space-y-3 ${
                  selectedAssignment?.id === a.id
                    ? "border-indigo-600 bg-indigo-50/20 shadow-md"
                    : "border-slate-200 bg-white hover:border-slate-300 shadow-xs"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-lg bg-indigo-100 text-indigo-800 font-mono font-bold text-[11px] px-2.5 py-0.5">
                      {a.course_code}
                    </span>
                    <span className="rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 uppercase">
                      {a.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-slate-900 leading-snug">
                    {a.title}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-2">
                    {a.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>
                      📅 Due: <strong>{new Date(a.due_date).toLocaleDateString()}</strong>
                    </span>
                    <span>
                      🎯 Max Marks: <strong>{a.total_points} pts</strong>
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <span>📥</span> {a.submission_count} Submissions ({a.graded_count} Graded)
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(a.id)}
                        className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] px-3 py-1.5 transition-colors cursor-pointer"
                      >
                        {selectedAssignment?.id === a.id ? "Viewing ▾" : "Review Submissions"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(a.id)}
                        className="rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-[11px] px-2 py-1.5 transition-colors cursor-pointer"
                        title="Delete Assignment"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Assignment Submissions Drawer */}
      {selectedAssignment && (
        <div className="bg-white rounded-2xl border border-indigo-200 p-5 sm:p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
            <div>
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                Submissions Review
              </span>
              <h3 className="text-base font-black text-slate-900">
                {selectedAssignment.title} ({selectedAssignment.course_code})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedAssignment(null)}
              className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 text-xs font-bold"
            >
              ✕ Close Submissions
            </button>
          </div>

          {selectedAssignment.submissions.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-4 bg-slate-50 rounded-xl text-center">
              No students have submitted work for this assignment yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {selectedAssignment.submissions.map((sub) => (
                <div key={sub.id} className="p-4 space-y-2 hover:bg-slate-50/60 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">
                        {sub.student_email}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          sub.status === "graded"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {sub.status === "graded" ? `Graded: ${sub.score}/${selectedAssignment.total_points}` : "Submitted (Needs Grade)"}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Submitted: {new Date(sub.submitted_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 font-mono break-all whitespace-pre-wrap">
                    {sub.submission_text}
                  </div>

                  {sub.feedback && (
                    <div className="text-xs text-emerald-900 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
                      <strong>Faculty Feedback:</strong> {sub.feedback}
                    </div>
                  )}

                  {gradingSubId === sub.id ? (
                    <form onSubmit={handleGradeSubmit} className="pt-2 p-3 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-2">
                      <h4 className="text-xs font-bold text-indigo-900">Grade & Feedback:</h4>
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-semibold text-slate-700">Award Score:</label>
                        <input
                          type="number"
                          value={gradeScore}
                          onChange={(e) => setGradeScore(Number(e.target.value))}
                          min={0}
                          max={selectedAssignment.total_points}
                          className="w-24 rounded-lg border border-slate-300 bg-white py-1 px-2 text-xs font-bold text-slate-800"
                          required
                        />
                        <span className="text-xs text-slate-500">/ {selectedAssignment.total_points} points</span>
                      </div>
                      <div>
                        <input
                          type="text"
                          value={gradeFeedback}
                          onChange={(e) => setGradeFeedback(e.target.value)}
                          placeholder="Feedback comments for student (optional)..."
                          className="w-full rounded-lg border border-slate-300 bg-white py-1 px-2 text-xs text-slate-800"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="submit"
                          disabled={isGrading}
                          className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 cursor-pointer"
                        >
                          {isGrading ? "Saving…" : "Save Grade"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setGradingSubId(null)}
                          className="rounded-lg bg-slate-200 text-slate-700 font-bold text-xs px-3 py-1.5"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setGradingSubId(sub.id);
                          setGradeScore(sub.score ?? 85);
                          setGradeFeedback(sub.feedback ?? "");
                        }}
                        className="rounded-xl border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1 text-xs font-bold transition-colors cursor-pointer"
                      >
                        {sub.status === "graded" ? "✏️ Edit Grade / Feedback" : "⭐ Grade Submission"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// Subcomponent: Attendance Tracker Tab
// ----------------------------------------------------
function FacultyAttendanceSection({ accessToken }: { accessToken: string }) {
  const [sessions, setSessions] = useState<AttendanceSessionOut[] | null>(null);
  const [roster, setRoster] = useState<StudentRosterItemOut[]>([]);
  const [courseCode, setCourseCode] = useState("CS-401");
  const [courseName, setCourseName] = useState("Distributed Cloud Systems & Microservices");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [topic, setTopic] = useState("");
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, { status: "present" | "absent" | "late" | "excused"; notes?: string }>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  function reload() {
    listAttendanceSessions(accessToken).then(setSessions).catch(() => {});
    getStudentRoster(accessToken)
      .then((students) => {
        setRoster(students);
        const initial: Record<
          string,
          { status: "present" | "absent" | "late" | "excused"; notes?: string }
        > = {};
        students.forEach((s) => {
          initial[s.id] = { status: "present" };
        });
        setAttendanceMap(initial);
      })
      .catch(() => {});
  }

  useEffect(reload, [accessToken]);

  function markAll(status: "present" | "absent") {
    const updated: Record<
      string,
      { status: "present" | "absent" | "late" | "excused"; notes?: string }
    > = {};
    roster.forEach((s) => {
      updated[s.id] = { status, notes: attendanceMap[s.id]?.notes };
    });
    setAttendanceMap(updated);
  }

  function setStudentStatus(
    studentId: string,
    status: "present" | "absent" | "late" | "excused"
  ) {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
  }

  async function handleSaveAttendance(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) {
      setErrorMsg("Please enter the session/lecture topic.");
      return;
    }
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const records = roster.map((s) => ({
      student_id: s.id,
      student_email: s.email,
      status: attendanceMap[s.id]?.status || ("present" as const),
      notes: attendanceMap[s.id]?.notes,
    }));

    try {
      await recordAttendanceSession(accessToken, {
        course_code: courseCode,
        course_name: courseName,
        session_date: sessionDate,
        topic: topic.trim(),
        records,
      });
      setSuccessMsg(
        `Attendance recorded for ${records.length} students on ${sessionDate} (${topic})!`
      );
      setTopic("");
      reload();
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? String(err.detail) : "Failed to record attendance.");
    } finally {
      setIsSaving(false);
    }
  }

  const presentCount = Object.values(attendanceMap).filter((v) => v.status === "present").length;
  const lateCount = Object.values(attendanceMap).filter((v) => v.status === "late").length;
  const absentCount = Object.values(attendanceMap).filter((v) => v.status === "absent").length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>📊</span> Student Lecture Attendance Tracker
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Take daily class attendance, track excused absences, and maintain institutional records.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors cursor-pointer self-start sm:self-auto"
          >
            {showHistory ? "✕ Hide Sessions Log" : `📋 Past Sessions (${(sessions || []).length})`}
          </button>
        </div>

        {successMsg && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2">
            <span>✅</span> {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800 flex items-center gap-2">
            <span>⚠️</span> {errorMsg}
          </div>
        )}

        {/* Attendance Marker Form */}
        <form onSubmit={handleSaveAttendance} className="space-y-4">
          <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3.5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              1. Class Session Parameters
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Course
                </label>
                <select
                  value={courseCode}
                  onChange={(e) => {
                    setCourseCode(e.target.value);
                    if (e.target.value === "CS-401") setCourseName("Distributed Cloud Systems & Microservices");
                    else if (e.target.value === "CS-404") setCourseName("Cloud Systems Implementation Lab");
                    else if (e.target.value === "CS-406") setCourseName("Cybersecurity, Ethics & Digital Privacy");
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                >
                  <option value="CS-401">CS-401: Distributed Cloud Systems</option>
                  <option value="CS-404">CS-404: Cloud Systems Lab</option>
                  <option value="CS-406">CS-406: Cybersecurity & Ethics</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Session Date
                </label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lecture / Session Topic
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Lecture 14: Microservices & Event Bus"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  required
                />
              </div>
            </div>
          </div>

          {/* Quick Actions & Live Count Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 text-xs">
              <span className="font-bold text-slate-800">Current Session Roll Call:</span>
              <span className="rounded-lg bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5">
                {presentCount} Present
              </span>
              <span className="rounded-lg bg-amber-100 text-amber-800 font-bold px-2 py-0.5">
                {lateCount} Late
              </span>
              <span className="rounded-lg bg-rose-100 text-rose-800 font-bold px-2 py-0.5">
                {absentCount} Absent
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => markAll("present")}
                className="rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs px-3 py-1.5 transition-colors cursor-pointer"
              >
                ✓ Mark All Present
              </button>
              <button
                type="button"
                onClick={() => markAll("absent")}
                className="rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs px-3 py-1.5 transition-colors cursor-pointer"
              >
                ✕ Mark All Absent
              </button>
            </div>
          </div>

          {/* Student Roster Attendance Grid */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-3 px-4">Student & ID</th>
                  <th className="py-3 px-4">Enrolled Program</th>
                  <th className="py-3 px-4 text-center">Attendance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roster.map((s) => {
                  const currentStatus = attendanceMap[s.id]?.status || "present";
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{s.full_name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {s.email} · <span className="text-indigo-600">{s.student_id}</span>
                        </p>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {s.program}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {(
                            [
                              { key: "present", label: "Present", color: "bg-emerald-600 text-white" },
                              { key: "late", label: "Late", color: "bg-amber-600 text-white" },
                              { key: "absent", label: "Absent", color: "bg-rose-600 text-white" },
                              { key: "excused", label: "Excused", color: "bg-blue-600 text-white" },
                            ] as const
                          ).map((opt) => (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => setStudentStatus(s.id, opt.key)}
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                                currentStatus === opt.key
                                  ? `${opt.color} shadow-xs scale-105`
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Permanently archives session records to the university academic registry.
            </span>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-2.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {isSaving ? "Saving Record…" : "💾 Save Session Attendance"}
            </button>
          </div>
        </form>
      </div>

      {/* Past Sessions History */}
      {showHistory && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span>📅</span> Historical Recorded Sessions Log
          </h3>

          {sessions === null && <p className="text-xs text-slate-400">Loading session history...</p>}

          {sessions !== null && sessions.length === 0 && (
            <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl">
              No sessions recorded yet.
            </p>
          )}

          {sessions !== null && sessions.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Course</th>
                    <th className="py-2.5 px-3">Topic / Lecture</th>
                    <th className="py-2.5 px-3">Present</th>
                    <th className="py-2.5 px-3">Late</th>
                    <th className="py-2.5 px-3">Absent</th>
                    <th className="py-2.5 px-3">Attendance Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sessions.map((s) => {
                    const total = s.total_students || 1;
                    const rate = Math.round(((s.present_count + s.late_count) / total) * 100);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{s.session_date}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{s.course_code}</td>
                        <td className="py-2.5 px-3 text-slate-800">{s.topic}</td>
                        <td className="py-2.5 px-3 text-emerald-700 font-bold">{s.present_count}</td>
                        <td className="py-2.5 px-3 text-amber-700 font-bold">{s.late_count}</td>
                        <td className="py-2.5 px-3 text-rose-700 font-bold">{s.absent_count}</td>
                        <td className="py-2.5 px-3">
                          <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                            {rate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// Subcomponent: Student Roster Directory Tab + Quick Send Modal
// ----------------------------------------------------
function FacultyStudentRosterSection({
  accessToken,
  onNavigateToEmailTab,
}: {
  accessToken: string;
  onNavigateToEmailTab: (email: string) => void;
}) {
  const [roster, setRoster] = useState<StudentRosterItemOut[] | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Quick Send Email Modal State
  const [quickStudent, setQuickStudent] = useState<StudentRosterItemOut | null>(null);
  const [quickSubject, setQuickSubject] = useState("");
  const [quickBody, setQuickBody] = useState("");
  const [isSendingQuick, setIsSendingQuick] = useState(false);
  const [quickSuccess, setQuickSuccess] = useState<string | null>(null);
  const [quickError, setQuickError] = useState<string | null>(null);

  // SMTP status
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfigOut | null>(null);

  useEffect(() => {
    getStudentRoster(accessToken)
      .then((data) => {
        setRoster(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));

    getSmtpConfig(accessToken).then(setSmtpConfig).catch(() => {});
  }, [accessToken]);

  const filtered = (roster || []).filter((s) => {
    const q = search.toLowerCase();
    return (
      !q ||
      s.full_name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.student_id.toLowerCase().includes(q) ||
      s.program.toLowerCase().includes(q)
    );
  });

  function openQuickEmailModal(student: StudentRosterItemOut) {
    setQuickStudent(student);
    setQuickSubject(`Academic Advising & Course Guidance - ${student.full_name}`);
    setQuickBody(`Dear ${student.full_name},

I am contacting you regarding your coursework and academic progress.

Please review your course portal and feel free to visit my office during consultation hours if you have any questions.`);
    setQuickSuccess(null);
    setQuickError(null);
  }

  async function handleSendQuickEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!quickStudent || !quickSubject.trim() || !quickBody.trim()) return;
    setIsSendingQuick(true);
    setQuickError(null);
    setQuickSuccess(null);
    try {
      const res = await sendEmail(accessToken, {
        recipient_email: quickStudent.email,
        subject: quickSubject.trim(),
        body: quickBody.trim(),
      });
      if (res.status === "delivered_smtp") {
        setQuickSuccess(`✅ Email delivered to ${quickStudent.email} and real mailbox via SMTP!`);
      } else if (res.status === "portal_inbox_only") {
        setQuickSuccess(`📬 Email delivered to student's portal inbox. (Configure SMTP in the Email tab for external Gmail delivery).`);
      } else if (res.status.startsWith("smtp_error")) {
        setQuickError(`⚠️ Saved to student's portal inbox, but real mailbox delivery failed: ${res.status.replace("smtp_error: ", "")}`);
      }
      setTimeout(() => {
        if (!res.status.startsWith("smtp_error")) {
          setQuickStudent(null);
          setQuickSuccess(null);
        }
      }, 4000);
    } catch (err) {
      setQuickError(err instanceof ApiError ? String(err.detail) : "Failed to send email.");
    } finally {
      setIsSendingQuick(false);
    }
  }

  const isLiveSmtp = Boolean(smtpConfig?.is_active && smtpConfig?.smtp_host && smtpConfig?.smtp_user && smtpConfig?.has_password);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>👥</span> Enrolled Students Roster & Academic Directory
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Click <strong>&quot;✉️ Send Email&quot;</strong> on any student to open the instant dispatch composer.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateToEmailTab("BROADCAST_ALL")}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
          >
            <span>📢</span> Send Group Mail to All ({(roster || []).length})
          </button>
          <div className="relative min-w-[220px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, student ID..."
              className="w-full rounded-xl border border-slate-300 py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-indigo-600"
            />
          </div>
        </div>
      </div>

      {/* Quick Email Modal Popup */}
      {quickStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 text-lg">
                  ✉️
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Send Email to {quickStudent.full_name}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {quickStudent.email} · {quickStudent.student_id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickStudent(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {quickSuccess && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
                ✅ {quickSuccess}
              </div>
            )}

            {quickError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800">
                ⚠️ {quickError}
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-[11px] flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                {isLiveSmtp ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-800 font-bold">Live SMTP Delivery Active ({smtpConfig?.smtp_host})</span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="text-amber-800 font-semibold">Portal Inbox Mode (Configure Gmail in Email Tab to deliver to real inbox)</span>
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={() => {
                  onNavigateToEmailTab(quickStudent.email);
                  setQuickStudent(null);
                }}
                className="text-indigo-600 font-bold hover:underline text-[11px]"
              >
                Full Email Tab →
              </button>
            </div>

            <form onSubmit={handleSendQuickEmail} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={quickSubject}
                  onChange={(e) => setQuickSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Message Content
                </label>
                <textarea
                  rows={5}
                  value={quickBody}
                  onChange={(e) => setQuickBody(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-600 font-sans"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickStudent(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingQuick}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSendingQuick ? "Dispatching…" : "📤 Dispatch Email Now"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading && <p className="text-xs text-slate-400 py-6 text-center">Loading student roster...</p>}

      {!isLoading && filtered.length === 0 && (
        <div className="py-8 text-center text-xs text-slate-500 italic">
          No students found matching &quot;{search}&quot;.
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-xs scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-3 px-4">Student Name & Email</th>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Academic Program</th>
                <th className="py-3 px-4 text-center">Attendance %</th>
                <th className="py-3 px-4 text-center">Assignments</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">{s.full_name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{s.email}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-0.5 text-[11px]">
                      {s.student_id}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    <p className="font-semibold">{s.program}</p>
                    <p className="text-[10px] text-slate-400">{s.semester}</p>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                        s.attendance_percentage >= 85
                          ? "bg-emerald-100 text-emerald-800"
                          : s.attendance_percentage >= 75
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {s.attendance_percentage}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-semibold text-slate-700">
                    {s.assignments_submitted} / {s.total_assignments}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => openQuickEmailModal(s)}
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] px-3 py-1.5 shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>✉️</span> Send Email
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// Main Faculty Dashboard Page
// ----------------------------------------------------
export default function FacultyDashboardPage() {
  const accessToken = useRequireFaculty();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"inquiries" | "assignments" | "attendance" | "students" | "email">("inquiries");
  const [prefilledEmail, setPrefilledEmail] = useState<string>("");

  const [tickets, setTickets] = useState<FacultyTicketOut[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const [assignmentCount, setAssignmentCount] = useState<number>(0);
  const [studentCount, setStudentCount] = useState<number>(0);

  useEffect(() => {
    if (!accessToken) return;
    listRoutedTickets(accessToken)
      .then(setTickets)
      .catch((err) => setError(err instanceof ApiError ? String(err.detail) : "Failed to load faculty tickets."));

    listAssignments(accessToken)
      .then((data) => setAssignmentCount(data.length))
      .catch(() => {});

    getStudentRoster(accessToken)
      .then((data) => setStudentCount(data.length))
      .catch(() => {});
  }, [accessToken]);

  if (!accessToken) {
    return (
      <div className="py-20 text-center text-xs text-slate-400">
        Authenticating Faculty Session...
      </div>
    );
  }

  // Derive dynamic faculty profile
  const facultyEmail = user?.email || "faculty@university.edu";
  const facultyProfile =
    FACULTY_DIRECTORY[facultyEmail] || {
      name: `Prof. ${facultyEmail
        .split("@")[0]
        .split(/[._-]/)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ")}`,
      dept: "Department of Computing & Information Technologies",
      staffId: `FAC-2026-${facultyEmail.slice(0, 4).toUpperCase()}`,
      room: "Academic Wing · Room 412",
      hours: "Tue & Thu 2-4 PM",
    };

  // Filtered tickets
  const filteredTickets = (tickets || []).filter((t) => {
    const matchesStatus = selectedStatus === "all" || t.status === selectedStatus;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      (t.subject && t.subject.toLowerCase().includes(q)) ||
      (t.category && t.category.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  const openTicketsCount = (tickets || []).filter((t) => t.status === "open").length;

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Top Banner: Faculty Identity & Office Hours */}
      <div className="rounded-3xl bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#1e293b] p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-purple-500/20 blur-2xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-48 h-48 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md text-3xl border border-white/20 shadow-md">
              👨‍🏫
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-purple-400/20 px-2.5 py-0.5 text-[10px] font-bold text-purple-200 uppercase tracking-wide border border-purple-400/30">
                  Faculty & Academic Staff Portal
                </span>
                <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                  Term: Spring 2026
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {facultyProfile.name}
              </h1>
              <p className="text-xs text-indigo-200">
                {facultyProfile.dept} • Academic Advisor
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-white/5 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10">
            <div>
              <p className="text-[10px] uppercase font-bold text-indigo-300">Staff ID</p>
              <p className="font-mono font-bold text-white mt-0.5">{facultyProfile.staffId}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-indigo-300">Office Room</p>
              <p className="font-semibold text-white mt-0.5">{facultyProfile.room}</p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-[10px] uppercase font-bold text-indigo-300">Consultation</p>
              <p className="font-semibold text-emerald-300 mt-0.5">{facultyProfile.hours}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setActiveTab("inquiries")}
          className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3 cursor-pointer hover:border-indigo-300 transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 font-bold text-lg">
            📥
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pending Action</p>
            <p className="text-lg font-black text-slate-900">{openTicketsCount} Inquiries</p>
          </div>
        </div>

        <div
          onClick={() => setActiveTab("assignments")}
          className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3 cursor-pointer hover:border-indigo-300 transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 font-bold text-lg">
            📝
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active Coursework</p>
            <p className="text-lg font-black text-slate-900">{assignmentCount} Assignments</p>
          </div>
        </div>

        <div
          onClick={() => setActiveTab("attendance")}
          className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3 cursor-pointer hover:border-indigo-300 transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-bold text-lg">
            📊
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Avg Attendance</p>
            <p className="text-lg font-black text-slate-900">92.4% Rate</p>
          </div>
        </div>

        <div
          onClick={() => setActiveTab("students")}
          className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3 cursor-pointer hover:border-indigo-300 transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700 font-bold text-lg">
            👥
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Enrolled Scholars</p>
            <p className="text-lg font-black text-slate-900">{studentCount} Students</p>
          </div>
        </div>
      </div>

      {/* Main Tabbed Navigation Bar */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-2xl border border-slate-200 text-xs font-bold overflow-x-auto scrollbar-none sm:flex-wrap">
        {[
          { id: "inquiries", label: "📬 Inquiries & Advising", mobileLabel: "📬 Inquiries", count: openTicketsCount },
          { id: "assignments", label: "📝 Assignments & Grading", mobileLabel: "📝 Assignments", count: assignmentCount },
          { id: "attendance", label: "📊 Attendance Tracker", mobileLabel: "📊 Attendance" },
          { id: "students", label: "👥 Student Roster", mobileLabel: "👥 Roster", count: studentCount },
          { id: "email", label: "✉️ Direct Email Dispatch", mobileLabel: "✉️ Email" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === tab.id
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <span className="sm:hidden">{tab.mobileLabel}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`rounded-full px-1.5 sm:px-2 py-0.2 text-[9px] sm:text-[10px] ${
                  activeTab === tab.id ? "bg-indigo-100 text-indigo-800" : "bg-slate-300 text-slate-700"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab 1: Student Inquiries */}
      {activeTab === "inquiries" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Student Inquiries Routed to Your Faculty Desk
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review and respond to academic questions, advising requests, and mark answers as verified.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                {(tickets || []).length} Total Inquiries
              </span>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
              {[
                { id: "all", label: "All" },
                { id: "open", label: "Needs Response (Open)" },
                { id: "answered", label: "Answered" },
                { id: "escalated", label: "Escalated" },
                { id: "closed", label: "Closed" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedStatus(tab.id)}
                  className={`rounded-xl px-3 py-1.5 transition-all cursor-pointer ${
                    selectedStatus === tab.id
                      ? "bg-slate-900 text-white font-bold shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[240px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search subject or category..."
                className="w-full rounded-xl border border-slate-300 py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          {tickets === null && !error && (
            <div className="divide-y divide-slate-100">
              {[1, 2, 3].map((i) => (
                <div key={i} className="py-4 animate-pulse flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-64 bg-slate-200 rounded" />
                    <div className="h-3 w-40 bg-slate-100 rounded" />
                  </div>
                  <div className="h-6 w-20 bg-slate-200 rounded-full" />
                </div>
              ))}
            </div>
          )}

          {tickets !== null && filteredTickets.length > 0 && (
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              {filteredTickets.map((t) => (
                <Link
                  key={t.id}
                  href={`/faculty/${t.id}`}
                  className="group p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors block"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {t.subject || "(No Subject Provided)"}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                          STATUS_STYLES[t.status] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>
                        Category: <strong className="text-slate-700">{t.category || "Academic"}</strong>
                      </span>
                      <span>•</span>
                      <span>Received: {new Date(t.created_at).toLocaleString()}</span>
                    </div>
                    {(() => {
                      const triage = triageStudentQueryClient(t.subject, t.subject || "", t.category);
                      return (
                        <div className="flex items-center gap-2 pt-0.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 inline-flex items-center gap-1">
                            <span>🤖</span> Sorted by Clerk Assistant: {triage.department}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      Review Inquiry →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {tickets !== null && filteredTickets.length === 0 && (
            <div className="py-12 text-center rounded-2xl border-2 border-dashed border-slate-200 p-6 space-y-3">
              <span className="text-4xl">🎉</span>
              <h3 className="text-sm font-bold text-slate-800">
                {searchQuery || selectedStatus !== "all"
                  ? "No inquiries matched your filter"
                  : "All Caught Up! No Pending Inquiries"}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Student inquiries routed to your department will appear here for review and response.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Assignments & Grading */}
      {activeTab === "assignments" && (
        <FacultyAssignmentsSection accessToken={accessToken} />
      )}

      {/* Tab 3: Attendance Tracker */}
      {activeTab === "attendance" && (
        <FacultyAttendanceSection accessToken={accessToken} />
      )}

      {/* Tab 4: Student Roster Directory */}
      {activeTab === "students" && (
        <FacultyStudentRosterSection
          accessToken={accessToken}
          onNavigateToEmailTab={(email) => {
            setPrefilledEmail(email);
            setActiveTab("email");
          }}
        />
      )}

      {/* Tab 5: Direct Email Dispatch */}
      {activeTab === "email" && (
        <FacultyEmailComposerSection
          accessToken={accessToken}
          prefilledEmail={prefilledEmail}
          onClearPrefill={() => setPrefilledEmail("")}
        />
      )}
    </div>
  );
}
