"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRequireAdmin } from "@/lib/auth/use-require-admin";
import {
  listRoutingRules,
  createRoutingRule,
  deleteRoutingRule,
  listUsers,
  updateUserRole,
  listPendingKbApprovals,
  approveKbEntry,
  rejectKbEntry,
  listAdminTickets,
  getAdminTicket,
  respondAdminTicket,
  reassignAdminTicket,
  type RoutingRuleOut,
  type PendingKbItemOut,
  type AdminTicketOut,
  type AdminTicketDetailOut,
} from "@/lib/api/admin";
import type { UserOut } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { triageStudentQueryClient } from "@/lib/services/clerk-triage";
import {
  listAllPayments,
  getPaymentStats,
  getGatewayConfig,
  updateGatewayConfig,
  type PaymentTransactionOut,
  type PaymentSummaryStatsOut,
  type PaymentGatewayConfigOut,
} from "@/lib/api/payments";
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



const CATEGORIES = [
  "academic",
  "it_support",
  "admissions_enrollment",
  "financial_aid_billing",
  "general",
] as const;

const ROLES = ["student", "faculty", "admin"] as const;

function ClerkAssistantTriageSection({ accessToken }: { accessToken: string }) {
  const [tickets, setTickets] = useState<AdminTicketOut[] | null>(null);
  const [users, setUsers] = useState<UserOut[]>([]);
  const [roleTab, setRoleTab] = useState<"all" | "admin" | "faculty" | "urgent">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState<AdminTicketDetailOut | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [replySuccess, setReplySuccess] = useState<string | null>(null);

  // Reassignment state
  const [reassignUserId, setReassignUserId] = useState<string>("");
  const [isReassigning, setIsReassigning] = useState(false);

  // Live Query Analyzer state
  const [testInput, setTestInput] = useState("");
  const testResult =
    testInput.trim().length >= 3 ? triageStudentQueryClient(testInput, testInput, null) : null;

  function reload() {
    listAdminTickets(accessToken)
      .then(setTickets)
      .catch((err) =>
        setError(err instanceof ApiError ? String(err.detail) : "Failed to load triage inquiries.")
      );

    listUsers(accessToken)
      .then(setUsers)
      .catch(() => {});
  }

  useEffect(reload, [accessToken]);

  async function openTicketModal(ticketId: string) {
    setSelectedTicketId(ticketId);
    setLoadingDetail(true);
    setReplyText("");
    setReplySuccess(null);
    try {
      const detail = await getAdminTicket(accessToken, ticketId);
      setActiveTicket(detail);
      setReassignUserId(detail.assigned_faculty_id || "");
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : "Failed to load ticket details.");
    } finally {
      setLoadingDetail(false);
    }
  }

  function closeTicketModal() {
    setSelectedTicketId(null);
    setActiveTicket(null);
    setReplyText("");
    setReplySuccess(null);
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTicketId || !replyText.trim()) return;
    setIsReplying(true);
    try {
      await respondAdminTicket(accessToken, selectedTicketId, replyText.trim());
      setReplySuccess("Official administrative response dispatched to student successfully!");
      setReplyText("");
      const updated = await getAdminTicket(accessToken, selectedTicketId);
      setActiveTicket(updated);
      reload();
      setTimeout(() => setReplySuccess(null), 4000);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : "Failed to send reply.");
    } finally {
      setIsReplying(false);
    }
  }

  async function handleReassign() {
    if (!selectedTicketId) return;
    setIsReassigning(true);
    try {
      await reassignAdminTicket(accessToken, selectedTicketId, {
        assigned_to_id: reassignUserId || null,
      });
      const updated = await getAdminTicket(accessToken, selectedTicketId);
      setActiveTicket(updated);
      reload();
      setReplySuccess("Ticket assignment updated successfully!");
      setTimeout(() => setReplySuccess(null), 4000);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : "Failed to reassign ticket.");
    } finally {
      setIsReassigning(false);
    }
  }

  const allTickets = tickets || [];
  const adminCount = allTickets.filter((t) => t.target_role === "admin").length;
  const facultyCount = allTickets.filter((t) => t.target_role === "faculty").length;
  const urgentCount = allTickets.filter((t) => t.priority === "urgent" || t.priority === "high").length;
  const openCount = allTickets.filter((t) => t.status === "open").length;

  const filteredTickets = allTickets.filter((t) => {
    if (roleTab === "admin" && t.target_role !== "admin") return false;
    if (roleTab === "faculty" && t.target_role !== "faculty") return false;
    if (roleTab === "urgent" && t.priority !== "urgent" && t.priority !== "high") return false;

    if (statusFilter !== "all" && t.status !== statusFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchEmail = t.student_email?.toLowerCase().includes(q);
      const matchSubject = t.subject?.toLowerCase().includes(q);
      const matchDept = t.department?.toLowerCase().includes(q);
      const matchCategory = t.category?.toLowerCase().includes(q);
      const matchSnippet = t.snippet?.toLowerCase().includes(q);
      if (!matchEmail && !matchSubject && !matchDept && !matchCategory && !matchSnippet) {
        return false;
      }
    }
    return true;
  });

  return (
    <div id="clerk-triage" className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>🤖</span> Clerk Assistant — Inquiry Triage &amp; Sorting Desk
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated intelligence sorts student inquiries into <strong>University Administration</strong> or <strong>Academic Faculty</strong> desks with priority scoring.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-200">
            {allTickets.length} Inquiries Triaged
          </span>
        </div>
      </div>

      {/* Clerk Assistant Interactive Sandbox / Sorter */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/80 via-purple-50/60 to-blue-50/80 p-4 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <div>
              <h3 className="text-xs font-black text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
                Clerk Assistant Intelligent Sorter — Live Query Analyzer
              </h3>
              <p className="text-[11px] text-slate-600">
                Test any sample student query to see how the Clerk Assistant automatically classifies and routes between <strong>Faculty</strong> and <strong>Administration</strong>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setTestInput("I have attendance shortage in Calculus course due to medical reasons")}
              className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors shadow-2xs"
            >
              🎓 Test Faculty (Attendance)
            </button>
            <button
              type="button"
              onClick={() => setTestInput("Need fee receipt for tuition payment to submit for education loan")}
              className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors shadow-2xs"
            >
              🏛️ Test Admin (Bursar / Fee)
            </button>
            <button
              type="button"
              onClick={() => setTestInput("Water cooler in hostel block 3 is leaking bad water")}
              className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors shadow-2xs"
            >
              🏛️ Test Admin (Hostel Facilities)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="Type any student query (e.g. syllabus, marks recheck, wifi down, tuition fee, hostel bed)..."
            className="flex-1 rounded-xl border border-indigo-200 bg-white py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
          />
          {testInput && (
            <button
              type="button"
              onClick={() => setTestInput("")}
              className="text-xs text-slate-500 hover:text-slate-700 font-bold px-2 py-1"
            >
              Clear
            </button>
          )}
        </div>

        {testResult && (
          <div className="rounded-xl border border-white bg-white/95 p-3 text-xs shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-xs font-black uppercase px-2.5 py-1 rounded-lg border ${
                  testResult.targetRole === "faculty"
                    ? "bg-purple-100 text-purple-900 border-purple-300"
                    : "bg-blue-100 text-blue-900 border-blue-300"
                }`}
              >
                {testResult.targetRole === "faculty" ? "🎓 Sorted to Academic Faculty" : "🏛️ Sorted to University Administration"}
              </span>
              <span className="text-slate-900 font-bold">
                {testResult.department}
              </span>
              <span className="text-slate-500 text-[11px]">
                · {testResult.reason}
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 self-start sm:self-auto shrink-0">
              Priority: {testResult.priority}
            </span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setRoleTab("all")}
          className={`rounded-2xl border p-3.5 cursor-pointer transition-all ${
            roleTab === "all" ? "border-slate-800 bg-slate-900 text-white shadow-sm" : "border-slate-200 bg-slate-50/70 hover:bg-slate-100/70"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">Total Inquiries</span>
          <span className="text-xl sm:text-2xl font-black mt-1 block">{allTickets.length}</span>
          <span className="text-[10px] mt-0.5 block opacity-80">{openCount} Needs Attention</span>
        </div>

        <div
          onClick={() => setRoleTab("admin")}
          className={`rounded-2xl border p-3.5 cursor-pointer transition-all ${
            roleTab === "admin" ? "border-indigo-600 bg-indigo-600 text-white shadow-sm" : "border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/60"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">🏛️ Admin Queue</span>
          <span className="text-xl sm:text-2xl font-black mt-1 block">{adminCount}</span>
          <span className="text-[10px] mt-0.5 block opacity-80">Bursar, Registrar, IT, Hostel</span>
        </div>

        <div
          onClick={() => setRoleTab("faculty")}
          className={`rounded-2xl border p-3.5 cursor-pointer transition-all ${
            roleTab === "faculty" ? "border-purple-600 bg-purple-600 text-white shadow-sm" : "border-purple-200 bg-purple-50/60 hover:bg-purple-100/60"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">🎓 Faculty Queue</span>
          <span className="text-xl sm:text-2xl font-black mt-1 block">{facultyCount}</span>
          <span className="text-[10px] mt-0.5 block opacity-80">Academic, Advising, Exams</span>
        </div>

        <div
          onClick={() => setRoleTab("urgent")}
          className={`rounded-2xl border p-3.5 cursor-pointer transition-all ${
            roleTab === "urgent" ? "border-rose-600 bg-rose-600 text-white shadow-sm" : "border-rose-200 bg-rose-50/60 hover:bg-rose-100/60"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">⚡ High Priority</span>
          <span className="text-xl sm:text-2xl font-black mt-1 block">{urgentCount}</span>
          <span className="text-[10px] mt-0.5 block opacity-80">Urgent &amp; Deadline-Critical</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-1">
        {/* Filter tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none md:flex-wrap text-xs font-semibold">
          {[
            { id: "all", label: `All Desks (${allTickets.length})`, mobileLabel: `All (${allTickets.length})` },
            { id: "admin", label: `🏛️ Administration (${adminCount})`, mobileLabel: `🏛️ Admin (${adminCount})` },
            { id: "faculty", label: `🎓 Faculty (${facultyCount})`, mobileLabel: `🎓 Faculty (${facultyCount})` },
            { id: "urgent", label: `⚡ Urgent / High (${urgentCount})`, mobileLabel: `⚡ Urgent (${urgentCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRoleTab(tab.id as any)}
              className={`rounded-xl px-2.5 sm:px-3 py-1.5 transition-all cursor-pointer shrink-0 ${
                roleTab === tab.id
                  ? "bg-slate-900 text-white font-bold shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span className="sm:hidden">{tab.mobileLabel}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="answered">Answered</option>
            <option value="escalated">Escalated</option>
            <option value="closed">Closed</option>
          </select>

          <div className="relative w-full sm:w-56">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search query, email, dept..."
              className="w-full rounded-xl border border-slate-300 py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-indigo-600"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          {error}
        </div>
      )}

      {/* Inquiries Table */}
      {tickets === null && (
        <div className="divide-y divide-slate-100 py-6 animate-pulse space-y-3">
          <div className="h-6 w-56 bg-slate-200 rounded" />
          <div className="h-10 w-full bg-slate-100 rounded" />
          <div className="h-10 w-full bg-slate-100 rounded" />
        </div>
      )}

      {tickets !== null && filteredTickets.length === 0 && (
        <div className="py-10 text-center rounded-2xl border-2 border-dashed border-slate-200 p-6 space-y-2">
          <span className="text-3xl">📭</span>
          <p className="text-xs font-bold text-slate-700">No Student Inquiries Found</p>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            No queries match your current filter criteria. Student submissions from the portal will appear here automatically.
          </p>
        </div>
      )}

      {tickets !== null && filteredTickets.length > 0 && (
        <div>
          <p className="sm:hidden text-[10px] text-slate-500 italic flex items-center gap-1 mb-1.5">
            <span>👉</span> Swipe sideways to review all inquiry columns &amp; actions
          </p>
          <div className="border border-slate-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[800px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
              <tr>
                <th className="py-3 px-4">Student &amp; Ticket</th>
                <th className="py-3 px-4">Subject &amp; Inquiry Snippet</th>
                <th className="py-3 px-4">Clerk Destination Desk</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTickets.map((t) => {
                const isAdmin = t.target_role === "admin";
                return (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 align-top">
                      <p className="font-bold text-slate-900">{t.student_email || "Student"}</p>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">#{t.id.slice(0, 8)}</p>
                      <p className="text-[10px] text-slate-400">{new Date(t.created_at).toLocaleDateString()}</p>
                    </td>

                    <td className="py-3 px-4 align-top max-w-[280px]">
                      <p className="font-semibold text-slate-900 truncate">
                        {t.subject || "(No Subject)"}
                      </p>
                      {t.snippet && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                          {t.snippet}
                        </p>
                      )}
                    </td>

                    <td className="py-3 px-4 align-top">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          isAdmin
                            ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                            : "bg-purple-100 text-purple-800 border border-purple-200"
                        }`}
                      >
                        {isAdmin ? "🏛️ Admin Desk" : "🎓 Faculty Desk"}
                      </span>
                      <p className="text-[11px] font-medium text-slate-700 mt-1">
                        {t.department || (isAdmin ? "General Admin Desk" : "Academic Affairs")}
                      </p>
                      {t.assigned_name && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Assigned: <span className="font-semibold text-slate-600">{t.assigned_name}</span>
                        </p>
                      )}
                    </td>

                    <td className="py-3 px-4 align-top">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          t.priority === "urgent"
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : t.priority === "high"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {t.priority}
                      </span>
                    </td>

                    <td className="py-3 px-4 align-top">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          t.status === "open"
                            ? "bg-amber-100 text-amber-800"
                            : t.status === "answered"
                            ? "bg-blue-100 text-blue-800"
                            : t.status === "escalated"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 align-top text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => openTicketModal(t.id)}
                        className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        Review &amp; Reply →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Detail & Reply Modal */}
      {selectedTicketId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-6 py-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                    Ticket #{selectedTicketId.slice(0, 8)}
                  </span>
                  {activeTicket?.target_role && (
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                        activeTicket.target_role === "admin"
                          ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                          : "bg-purple-100 text-purple-800 border border-purple-200"
                      }`}
                    >
                      {activeTicket.target_role === "admin" ? "🏛️ Admin Queue" : "🎓 Faculty Queue"}
                    </span>
                  )}
                  {activeTicket?.priority && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase bg-slate-200 text-slate-700">
                      {activeTicket.priority} Priority
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {activeTicket?.subject || "Student Inquiry Details"}
                </h3>
                <p className="text-xs text-slate-500">
                  From: <strong>{activeTicket?.student_email || "Student"}</strong> &middot; Department Desk: <strong>{activeTicket?.department || "General"}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={closeTicketModal}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Content / Conversation Thread */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {loadingDetail && (
                <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                  Loading full conversation thread...
                </div>
              )}

              {replySuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2">
                  <span>✅</span> {replySuccess}
                </div>
              )}

              {activeTicket && !loadingDetail && (
                <div className="space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Conversation &amp; Intake Trail
                  </p>
                  <ul className="space-y-3">
                    {activeTicket.messages.map((msg) => {
                      const isStudent = msg.sender_type === "student";
                      const isAi = msg.sender_type === "ai_agent";
                      const isClerk = isAi && msg.content.includes("Clerk Assistant");
                      return (
                        <li
                          key={msg.id}
                          className={`rounded-2xl p-4 text-xs border leading-relaxed ${
                            isStudent
                              ? "bg-slate-900 text-white border-slate-800 ml-6"
                              : isClerk
                              ? "bg-indigo-50/80 border-indigo-200 text-slate-900 mr-6"
                              : isAi
                              ? "bg-amber-50/80 border-amber-200 text-slate-900 mr-6"
                              : "bg-emerald-50/80 border-emerald-200 text-slate-900 mr-6"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="font-bold text-[10px] uppercase tracking-wider opacity-80">
                              {isClerk
                                ? "🤖 Clerk Assistant Triage Note"
                                : isStudent
                                ? "👤 Student Inquiry"
                                : isAi
                                ? "⚡ AI Autonomous Resolution"
                                : "👨‍💼 Staff / Admin Response"}
                            </span>
                            <span className="text-[10px] opacity-60 font-mono">
                              {new Date(msg.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Reassignment / Routing Controls */}
              {activeTicket && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>🔀</span> Triage Reassignment &amp; Destination Control
                  </h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <select
                        value={reassignUserId}
                        onChange={(e) => setReassignUserId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      >
                        <option value="">-- Reassign Authority / Specialist --</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.email} ({u.role.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      disabled={isReassigning}
                      onClick={handleReassign}
                      className="rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-2 cursor-pointer transition-colors disabled:opacity-50"
                    >
                      {isReassigning ? "Updating..." : "Update Assignment"}
                    </button>
                  </div>
                </div>
              )}

              {/* Administrator Response Composer */}
              {activeTicket && (
                <form onSubmit={handleSendReply} className="space-y-3 pt-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Dispatch Official Administrative Response
                  </label>
                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write official resolution or guidance for this student..."
                    className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                    required
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={closeTicketModal}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isReplying || !replyText.trim()}
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isReplying ? "Dispatching..." : "Send Response to Student"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RoutingRulesSection({ accessToken }: { accessToken: string }) {
  const [rules, setRules] = useState<RoutingRuleOut[] | null>(null);
  const [faculty, setFaculty] = useState<UserOut[]>([]);
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [facultyId, setFacultyId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reload() {
    listRoutingRules(accessToken)
      .then(setRules)
      .catch((err) => setError(err instanceof ApiError ? String(err.detail) : "Failed to load routing rules."));
    listUsers(accessToken)
      .then((users) => setFaculty(users.filter((u) => u.role === "faculty")))
      .catch(() => {});
  }

  useEffect(reload, [accessToken]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!facultyId) {
      setError("Select an assigned faculty member first.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await createRoutingRule(accessToken, category, facultyId);
      setFacultyId("");
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : "Failed to create routing rule.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(ruleId: string) {
    setError(null);
    try {
      await deleteRoutingRule(accessToken, ruleId);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : "Failed to delete routing rule.");
    }
  }

  return (
    <div id="routing" className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>🔀</span> Automated Escalation & Routing Rules
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Incoming inquiries in specific academic or administrative categories are automatically assigned to designated faculty specialists.
          </p>
        </div>
        <span className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-200">
          {(rules || []).length} Active Rules
        </span>
      </div>

      <form onSubmit={handleCreate} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="category" className="block text-xs font-bold text-slate-700 mb-1">
            Category Taxonomy
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ").toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[240px]">
          <label htmlFor="faculty" className="block text-xs font-bold text-slate-700 mb-1">
            Assigned Faculty Specialist
          </label>
          <select
            id="faculty"
            value={facultyId}
            onChange={(e) => setFacultyId(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          >
            <option value="">Select faculty member...</option>
            {faculty.map((f) => (
              <option key={f.id} value={f.id}>
                {f.email}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? "Adding Rule..." : "+ Add Routing Rule"}
        </button>
      </form>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          {error}
        </div>
      )}

      {rules === null && (
        <div className="divide-y divide-slate-100 py-4 animate-pulse">
          <div className="h-4 w-48 bg-slate-200 rounded" />
        </div>
      )}

      {rules !== null && rules.length === 0 && (
        <div className="py-8 text-center rounded-xl border-2 border-dashed border-slate-200 p-4">
          <p className="text-xs text-slate-500">No routing rules configured. Inquiries default to general triage.</p>
        </div>
      )}

      {rules !== null && rules.length > 0 && (
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
          {rules.map((rule) => {
            const assignedFacultyEmail = faculty.find((f) => f.id === rule.faculty_id)?.email ?? rule.faculty_id;
            return (
              <div key={rule.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-indigo-100 px-2.5 py-1 text-[11px] font-bold text-indigo-900 uppercase">
                    {rule.category.replace(/_/g, " ")}
                  </span>
                  <span className="text-slate-400 text-xs">&rarr;</span>
                  <span className="text-xs font-semibold text-slate-800">
                    {assignedFacultyEmail}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(rule.id)}
                  className="rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-700 transition-colors cursor-pointer"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UserManagementSection({ accessToken }: { accessToken: string }) {
  const [users, setUsers] = useState<UserOut[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  function reload() {
    listUsers(accessToken)
      .then(setUsers)
      .catch((err) => setError(err instanceof ApiError ? String(err.detail) : "Failed to load users."));
  }

  useEffect(reload, [accessToken]);

  async function handleRoleChange(userId: string, role: (typeof ROLES)[number]) {
    setUpdatingId(userId);
    setError(null);
    try {
      await updateUserRole(accessToken, userId, role);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : "Failed to update role.");
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredUsers = (users || []).filter((u) => {
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesSearch = !searchQuery || u.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div id="users" className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>👥</span> Central User Directory & Access Control (RBAC)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage system permissions. Assign or change roles between Student, Faculty / Staff, and System Administrator.
          </p>
        </div>
        <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
          {(users || []).length} Registered Accounts
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          {[
            { id: "all", label: "All Users" },
            { id: "student", label: "Students" },
            { id: "faculty", label: "Faculty" },
            { id: "admin", label: "Admins" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRoleFilter(tab.id)}
              className={`rounded-xl px-3 py-1.5 transition-all cursor-pointer ${
                roleFilter === tab.id
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
            placeholder="Search by email..."
            className="w-full rounded-xl border border-slate-300 py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-indigo-600"
          />
        </div>
      </div>

      {/* Users Table */}
      {users === null && (
        <div className="p-6 text-center animate-pulse">
          <div className="h-6 w-48 bg-slate-200 rounded mx-auto" />
        </div>
      )}

      {users !== null && (
        <div className="border border-slate-200 rounded-xl overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-3 px-4">User Account</th>
                <th className="py-3 px-4">Current Role</th>
                <th className="py-3 px-4 text-right">Access Level Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => {
                const initials = u.email.slice(0, 2).toUpperCase();
                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-white shadow-xs">
                          {initials}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900">{u.email}</p>
                          <p className="text-[10px] text-slate-400 font-mono">ID: {u.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          u.role === "admin"
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : u.role === "faculty"
                            ? "bg-purple-100 text-purple-800 border border-purple-200"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <select
                        value={u.role}
                        disabled={updatingId === u.id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as (typeof ROLES)[number])}
                        className="rounded-xl border border-slate-300 bg-white py-1 px-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:opacity-50 cursor-pointer shadow-xs"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            Set to {r.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function KnowledgeBaseApprovalsSection({ accessToken }: { accessToken: string }) {
  const [pendingItems, setPendingItems] = useState<PendingKbItemOut[] | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    listPendingKbApprovals(accessToken)
      .then(setPendingItems)
      .catch((err) =>
        setError(err instanceof ApiError ? String(err.detail) : "Failed to load knowledge base approvals.")
      );
  }

  useEffect(reload, [accessToken]);

  async function handleApprove(messageId: string) {
    setProcessingId(messageId);
    setError(null);
    setSuccessMessage(null);
    try {
      await approveKbEntry(accessToken, messageId);
      setSuccessMessage("Entry successfully approved and ingested into the AI Knowledge Base!");
      reload();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : "Failed to approve knowledge base entry.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(messageId: string) {
    setProcessingId(messageId);
    setError(null);
    setSuccessMessage(null);
    try {
      await rejectKbEntry(accessToken, messageId);
      setSuccessMessage("Verification rejected. Item removed from approval queue.");
      reload();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : "Failed to reject item.");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div id="kb-approvals" className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>🧠</span> Knowledge Base Curation & Approvals (Admin Verification)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Faculty-verified solutions submitted for knowledge base indexing. Review and approve Q&A pairs to update the campus AI vector database.
          </p>
        </div>
        <span className={`rounded-lg px-3 py-1 text-xs font-bold border ${
          (pendingItems || []).length > 0 
            ? "bg-amber-50 text-amber-800 border-amber-300 animate-pulse" 
            : "bg-slate-100 text-slate-600 border-slate-200"
        }`}>
          {(pendingItems || []).length} Pending Review
        </span>
      </div>

      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2">
          <span>✅</span> {successMessage}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800 flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {pendingItems === null && (
        <div className="p-6 text-center animate-pulse">
          <div className="h-6 w-48 bg-slate-200 rounded mx-auto" />
        </div>
      )}

      {pendingItems !== null && pendingItems.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center space-y-2">
          <div className="text-2xl">✨</div>
          <p className="text-xs font-bold text-slate-700">No Pending Approvals</p>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
            When faculty specialists verify high-value resolutions in their support queue, they will appear here for administrator verification and knowledge base ingestion.
          </p>
        </div>
      )}

      {pendingItems !== null && pendingItems.length > 0 && (
        <div className="space-y-4">
          {pendingItems.map((item) => (
            <div
              key={item.message_id}
              className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3 transition-all hover:border-slate-300"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                    {item.category || "general"}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Ticket #{item.ticket_id.slice(0, 8)}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Verified by: <span className="font-semibold text-slate-700">{item.faculty_email || "Faculty"}</span> &middot; {new Date(item.created_at).toLocaleDateString()}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="rounded-lg bg-white p-3 border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                    Student Inquiry / Question
                  </span>
                  <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap">
                    {item.question}
                  </p>
                </div>
                <div className="rounded-lg bg-emerald-50/60 p-3 border border-emerald-200/80 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 block tracking-wider">
                    Faculty Verified Resolution
                  </span>
                  <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap">
                    {item.answer}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                <button
                  type="button"
                  disabled={processingId === item.message_id}
                  onClick={() => handleReject(item.message_id)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Decline
                </button>
                <button
                  type="button"
                  disabled={processingId === item.message_id}
                  onClick={() => handleApprove(item.message_id)}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-1.5 text-xs font-bold text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {processingId === item.message_id ? (
                    <span>Ingesting into KB…</span>
                  ) : (
                    <>
                      <span>✓</span> Approve & Update Knowledge Base
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function AdminEmailCommunicationsSection({ accessToken }: { accessToken: string }) {
  const [students, setStudents] = useState<StudentRecipientOut[]>([]);
  const [sendMode, setSendMode] = useState<"individual" | "broadcast">("individual");
  const [recipientEmail, setRecipientEmail] = useState("");
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
  const [fromName, setFromName] = useState("University Administration");
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [testRecipient, setTestRecipient] = useState("");
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpFeedback, setSmtpFeedback] = useState<string | null>(null);

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
      setErrorMsg("Please complete subject and announcement body.");
      return;
    }
    if (sendMode === "individual" && !recipientEmail) {
      setErrorMsg("Please specify a student recipient email address.");
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
            `📢 Campus-Wide Announcement sent! Delivered live to ${res.delivered_smtp_count} student mailboxes via SMTP and stored in all ${res.total_recipients} student portal inboxes.`
          );
        } else if (res.failed_smtp_count > 0) {
          setErrorMsg(
            `⚠️ Campus Notice saved in all ${res.total_recipients} student portal inboxes, but external mailbox delivery failed for ${res.failed_smtp_count} students. (Check SMTP settings: Gmail 16-character App Password required).`
          );
        } else {
          setSuccessMsg(
            `📢 Campus Notice saved to all ${res.total_recipients} student portal inboxes! (Configure Real Mailbox / SMTP below to deliver to external inboxes like Gmail).`
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
            `✅ Official notice delivered to both student portal inbox and external mailbox (${recipientEmail}) via SMTP!`
          );
        } else if (res.status.startsWith("smtp_error")) {
          setErrorMsg(
            `⚠️ Notice saved to student portal inbox, but real mailbox delivery failed: ${res.status.replace("smtp_error: ", "")}`
          );
        } else {
          setSuccessMsg(
            `📬 Official notice saved to student portal inbox. (Real mailbox delivery inactive; configure SMTP in settings below).`
          );
        }
      }

      setSubject("");
      setBody("");
      reload();
      setTimeout(() => {
        setSuccessMsg(null);
        setErrorMsg(null);
      }, 10000);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? String(err.detail) : "Failed to dispatch email.");
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
    <div id="admin-email" className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>📢</span> Official Campus Email Communications & Broadcast Dispatch
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Broadcast official administrative notices, fee notifications, or direct messages to registered students.
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
            className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors cursor-pointer self-start sm:self-auto"
          >
            {showHistory ? "✕ Hide Sent History" : `📜 View Sent History (${(sentEmails || []).length})`}
          </button>
        </div>
      </div>

      {/* SMTP Notice Banner */}
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

      {/* SMTP Configuration Drawer */}
      {showSmtpConfig && (
        <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>⚙️</span> Campus Outgoing Mail Relay Settings (Gmail / Custom SMTP)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Configure SMTP credentials to ensure official notices land directly in students&apos; real inboxes.
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
              <span>💡</span> Gmail Setup Instructions:
            </p>
            <p className="text-[11px] text-indigo-300">
              1. For personal or Google Workspace accounts with 2-Step Verification, generate a <strong>16-character App Password</strong> at{" "}
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 underline font-semibold"
              >
                myaccount.google.com/apppasswords
              </a>
              .
            </p>
            <p className="text-[11px] text-indigo-300">
              2. Enter your Gmail address as Username, paste the 16-character code as Password, and click &quot;Save & Activate SMTP&quot;.
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
                  placeholder="admin.helpdesk@gmail.com"
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
                  placeholder="University Administration Directorate"
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
        {/* Delivery Scope Mode Selector */}
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-200/60">
          <span className="text-xs font-bold text-slate-700 mr-1">Dispatch Scope:</span>
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
            <span>📢</span> Campus-Wide Broadcast ({students.length} Students)
          </button>
        </div>

        {/* Recipient Selection */}
        {sendMode === "individual" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Student Recipient
              </label>
              <select
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              >
                <option value="">-- Choose registered student --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.email}>
                    {s.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Or Enter Direct Email Address
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
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <span>📢</span> Broadcasting Official Campus Notice to All {students.length} Enrolled Students
              </span>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                Campus-Wide Announcement
              </span>
            </div>
            <p className="text-[11px] text-indigo-800/90 leading-relaxed">
              This notice will be recorded into every student&apos;s portal inbox (<code className="font-mono bg-indigo-100/80 px-1 py-0.5 rounded">/inbox</code>) and dispatched to their real mailbox if live SMTP is active.
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
            {sendMode === "broadcast" ? "Campus Announcement Subject" : "Official Notice Subject"}
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Important Update: Semester Schedule & Course Registration Timetable"
            className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Official Body / Notice Content
          </label>
          <textarea
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Compose official institutional message to students..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            required
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <p className="text-[11px] text-slate-500">
            {sendMode === "broadcast" ? (
              <span>
                📢 Will broadcast to <strong>{students.length} students</strong> simultaneously.
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
                : "bg-rose-600 hover:bg-rose-500"
            }`}
          >
            {isSending
              ? "Dispatching…"
              : sendMode === "broadcast"
              ? `📢 Broadcast to All ${students.length} Students`
              : "📨 Send Official Email"}
          </button>
        </div>
      </form>

      {showHistory && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Institutional Email Dispatch Log
          </h3>
          {sentEmails === null && (
            <p className="text-xs text-slate-400">Loading email logs...</p>
          )}
          {sentEmails !== null && sentEmails.length === 0 && (
            <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl">No emails dispatched yet.</p>
          )}
          {sentEmails !== null && sentEmails.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-2.5 px-3">Sender</th>
                    <th className="py-2.5 px-3">Recipient</th>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Delivery Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sentEmails.map((se) => (
                    <tr key={se.id} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3 font-semibold text-slate-800">
                        {se.sender_email} <span className="text-[10px] text-slate-400 font-mono">({se.sender_role})</span>
                      </td>
                      <td className="py-2 px-3 text-slate-800">{se.recipient_email}</td>
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
// Subcomponent: Payment Gateway & Campus Fee Revenue Management
// ----------------------------------------------------
function AdminPaymentManagementSection({ accessToken }: { accessToken: string }) {
  const [payments, setPayments] = useState<PaymentTransactionOut[]>([]);
  const [stats, setStats] = useState<PaymentSummaryStatsOut | null>(null);
  const [config, setConfig] = useState<PaymentGatewayConfigOut | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Edit config states
  const [provider, setProvider] = useState<"sandbox" | "razorpay" | "stripe">("sandbox");
  const [rzpKey, setRzpKey] = useState("");
  const [rzpSecret, setRzpSecret] = useState("");
  const [stripePub, setStripePub] = useState("");
  const [stripeSec, setStripeSec] = useState("");
  const [isTestMode, setIsTestMode] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [configFeedback, setConfigFeedback] = useState<string | null>(null);

  function reload() {
    setIsLoading(true);
    listAllPayments(accessToken)
      .then((data) => {
        setPayments(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));

    getPaymentStats(accessToken)
      .then(setStats)
      .catch(() => {});

    getGatewayConfig(accessToken)
      .then((cfg) => {
        setConfig(cfg);
        setProvider(cfg.provider);
        if (cfg.razorpay_key_id) setRzpKey(cfg.razorpay_key_id);
        if (cfg.stripe_publishable_key) setStripePub(cfg.stripe_publishable_key);
        setIsTestMode(cfg.is_test_mode);
      })
      .catch(() => {});
  }

  useEffect(reload, [accessToken]);

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setConfigFeedback(null);
    try {
      const updated = await updateGatewayConfig(accessToken, {
        provider,
        razorpay_key_id: rzpKey || undefined,
        razorpay_key_secret: rzpSecret || undefined,
        stripe_publishable_key: stripePub || undefined,
        stripe_secret_key: stripeSec || undefined,
        is_test_mode: isTestMode,
        currency: "INR",
      });
      setConfig(updated);
      setConfigFeedback("✅ Payment Gateway settings saved and activated successfully!");
      setTimeout(() => setConfigFeedback(null), 5000);
    } catch (err) {
      setConfigFeedback(err instanceof ApiError ? `❌ ${err.detail}` : "❌ Failed to update gateway settings.");
    } finally {
      setIsSaving(false);
    }
  }

  const filtered = payments.filter((p) => {
    const q = search.toLowerCase();
    return (
      !q ||
      p.student_email.toLowerCase().includes(q) ||
      p.order_id.toLowerCase().includes(q) ||
      (p.payment_id && p.payment_id.toLowerCase().includes(q)) ||
      (p.receipt_no && p.receipt_no.toLowerCase().includes(q))
    );
  });

  return (
    <div id="admin-payments" className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>💳</span> Campus Fee Collections & Payment Gateway Hub
            </h2>
            <span className="rounded-full bg-indigo-50 text-indigo-700 font-mono font-bold text-[10px] px-2.5 py-0.5 border border-indigo-200">
              {config?.provider.toUpperCase() || "GATEWAY"} ACTIVE
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit student tuition fee settlements, verified official receipts, and configure Razorpay / Stripe / Sandbox gateway keys.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
          >
            {showConfig ? "✕ Close Gateway Settings" : "⚙️ Gateway Configuration"}
          </button>
          <button
            type="button"
            onClick={reload}
            className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-1.5 transition-colors cursor-pointer"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Gateway Settings Drawer */}
      {showConfig && (
        <div className="bg-slate-950 text-white p-5 rounded-2xl border border-slate-800 space-y-4 shadow-lg animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>⚙️</span> Payment Gateway Integration & API Credentials
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Switch between Sandbox Simulator (instant testing), Razorpay, or Stripe without redeploying code.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowConfig(false)}
              className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
            >
              ✕ Close
            </button>
          </div>

          {configFeedback && (
            <div className="rounded-xl border border-indigo-500/50 bg-indigo-950/60 p-3 text-xs font-bold text-indigo-200">
              {configFeedback}
            </div>
          )}

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: "sandbox", label: "Interactive Sandbox", desc: "Built-in simulator with instant QR & Card OTP testing" },
                { id: "razorpay", label: "Razorpay (India)", desc: "Supports live UPI, RuPay, NetBanking & Cards" },
                { id: "stripe", label: "Stripe (Global)", desc: "Credit/Debit Cards & Apple/Google Pay" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setProvider(m.id as any)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    provider === m.id
                      ? "border-indigo-500 bg-indigo-950/70 ring-2 ring-indigo-500/30 text-white"
                      : "border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                  }`}
                >
                  <span className="block text-xs font-bold">{m.label}</span>
                  <span className="block text-[10px] text-slate-400 mt-1 leading-snug">{m.desc}</span>
                </button>
              ))}
            </div>

            {provider === "razorpay" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Razorpay Key ID</label>
                  <input
                    type="text"
                    value={rzpKey}
                    onChange={(e) => setRzpKey(e.target.value)}
                    placeholder="rzp_test_..."
                    className="w-full rounded-xl bg-slate-900 border border-slate-800 py-2 px-3 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Razorpay Key Secret {config?.has_razorpay_secret && "(Saved)"}
                  </label>
                  <input
                    type="password"
                    value={rzpSecret}
                    onChange={(e) => setRzpSecret(e.target.value)}
                    placeholder={config?.has_razorpay_secret ? "••••••••••••••••" : "Key secret"}
                    className="w-full rounded-xl bg-slate-900 border border-slate-800 py-2 px-3 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {provider === "stripe" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Stripe Publishable Key</label>
                  <input
                    type="text"
                    value={stripePub}
                    onChange={(e) => setStripePub(e.target.value)}
                    placeholder="pk_test_..."
                    className="w-full rounded-xl bg-slate-900 border border-slate-800 py-2 px-3 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Stripe Secret Key {config?.has_stripe_secret && "(Saved)"}
                  </label>
                  <input
                    type="password"
                    value={stripeSec}
                    onChange={(e) => setStripeSec(e.target.value)}
                    placeholder={config?.has_stripe_secret ? "••••••••••••••••" : "sk_test_..."}
                    className="w-full rounded-xl bg-slate-900 border border-slate-800 py-2 px-3 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTestMode}
                  onChange={(e) => setIsTestMode(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0"
                />
                <span>Enable Sandbox / Test Mode</span>
              </label>

              <button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2 cursor-pointer transition-colors disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save & Activate Gateway"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Collections</span>
          <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
            ₹ {(stats?.total_collected || 0).toLocaleString()}
          </span>
          <span className="text-[10px] text-emerald-600 font-bold mt-0.5 block">Settled & Cleared</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Successful Orders</span>
          <span className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 block">
            {stats?.successful_count || 0}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Verified Receipts</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Pending / In-Flight</span>
          <span className="text-xl sm:text-2xl font-black text-amber-600 mt-1 block">
            {stats?.pending_count || 0}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Awaiting Authorization</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Attempts</span>
          <span className="text-xl sm:text-2xl font-black text-indigo-700 mt-1 block">
            {stats?.total_transactions || 0}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Audit Trail Entries</span>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            All Student Fee Transactions ({filtered.length})
          </h3>
          <div className="relative min-w-[240px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search email, order ID, receipt..."
              className="w-full rounded-xl border border-slate-300 py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-indigo-600"
            />
          </div>
        </div>

        {isLoading ? (
          <p className="text-xs text-slate-400 py-6 text-center">Loading campus fee ledger...</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
            No fee payment transactions found matching search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-600 min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Student Email</th>
                  <th className="py-2.5 px-3">Order & Payment ID</th>
                  <th className="py-2.5 px-3">Fee Category</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Receipt No</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="py-2 px-3 font-semibold text-slate-800">{p.student_email}</td>
                    <td className="py-2 px-3 font-mono text-[11px]">
                      <div>{p.order_id}</div>
                      <div className="text-[10px] text-slate-400">{p.payment_id || "—"}</div>
                    </td>
                    <td className="py-2 px-3 uppercase text-[11px] font-semibold text-slate-700">{p.fee_type}</td>
                    <td className="py-2 px-3 font-black text-slate-900">₹ {p.amount.toLocaleString()}</td>
                    <td className="py-2 px-3 uppercase text-[10px] font-bold text-slate-600">{p.payment_method || "—"}</td>
                    <td className="py-2 px-3 font-mono font-bold text-indigo-700 text-[11px]">
                      {p.receipt_no || "—"}
                    </td>
                    <td className="py-2 px-3 text-slate-500 text-[11px]">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-3">
                      {p.status === "success" ? (
                        <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                          ✓ Settled
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold">
                          Pending
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
    </div>
  );
}

export default function AdminDashboardPage() {
  const accessToken = useRequireAdmin();

  if (!accessToken) {
    return null;
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Top Banner: Admin Console Overview */}
      <div className="rounded-3xl bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-rose-500/20 blur-2xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-48 h-48 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md text-3xl border border-white/20 shadow-md">
              🛡️
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-rose-400/20 px-2.5 py-0.5 text-[10px] font-bold text-rose-200 uppercase tracking-wide border border-rose-400/30">
                  Campus Central Administrator
                </span>
                <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                  System Health: 100% Operational
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Institutional Management & Access Control
              </h1>
              <p className="text-xs text-slate-300">
                Manage user role assignments, automated ticket routing taxonomies, and view live system performance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/analytics"
              className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2.5 transition-all shadow-md flex items-center gap-2"
            >
              <span>📊</span> View Detailed Analytics
            </Link>
          </div>
        </div>
      </div>

      {/* Admin Sections */}
      <ClerkAssistantTriageSection accessToken={accessToken} />
      <KnowledgeBaseApprovalsSection accessToken={accessToken} />
      <AdminPaymentManagementSection accessToken={accessToken} />
      <AdminEmailCommunicationsSection accessToken={accessToken} />
      <RoutingRulesSection accessToken={accessToken} />
      <UserManagementSection accessToken={accessToken} />
    </div>
  );
}

