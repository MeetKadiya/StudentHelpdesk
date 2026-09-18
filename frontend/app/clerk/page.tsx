"use client";

import { useEffect, useState, useMemo } from "react";
import { useRequireClerk } from "@/lib/auth/use-require-clerk";
import { ApiError } from "@/lib/api/client";
import {
  listClerkTickets,
  getClerkTicketDetail,
  forwardClerkTicket,
  respondClerkTicket,
  getClerkStats,
  listFacultyMembers,
  type ClerkTicket,
  type ClerkTicketDetail,
  type ClerkStats,
  type FacultyMember,
} from "@/lib/api/clerk";

const BRANCH_OPTIONS = [
  "Computer Science & Engineering",
  "Information Technology",
  "Artificial Intelligence & Data Science",
  "Electronics & Communication",
  "Mechanical Engineering",
  "Civil Engineering",
  "Management Studies",
  "General",
];

const SEMESTER_OPTIONS = [
  "Semester 1",
  "Semester 2",
  "Semester 3",
  "Semester 4",
  "Semester 5",
  "Semester 6",
  "Semester 7",
  "Semester 8",
];

export default function ClerkDeskPage() {
  const token = useRequireClerk();

  const [tickets, setTickets] = useState<ClerkTicket[]>([]);
  const [stats, setStats] = useState<ClerkStats | null>(null);
  const [facultyMembers, setFacultyMembers] = useState<FacultyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedForwarded, setSelectedForwarded] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [activeDetailTicket, setActiveDetailTicket] = useState<ClerkTicketDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Forward modal
  const [forwardTicketTarget, setForwardTicketTarget] = useState<ClerkTicket | null>(null);
  const [forwardRole, setForwardRole] = useState<"faculty" | "admin">("faculty");
  const [forwardFacultyId, setForwardFacultyId] = useState<string>("");
  const [forwardBranch, setForwardBranch] = useState<string>("");
  const [forwardSemester, setForwardSemester] = useState<string>("");
  const [forwardNotes, setForwardNotes] = useState<string>("");
  const [isSubmittingForward, setIsSubmittingForward] = useState(false);
  const [forwardError, setForwardError] = useState<string | null>(null);

  // Respond modal
  const [respondTicketTarget, setRespondTicketTarget] = useState<ClerkTicket | null>(null);
  const [respondContent, setRespondContent] = useState<string>("");
  const [respondStatus, setRespondStatus] = useState<string>("in_progress");
  const [isSubmittingRespond, setIsSubmittingRespond] = useState(false);
  const [respondError, setRespondError] = useState<string | null>(null);

  async function loadData(accessToken: string) {
    setIsLoading(true);
    setError(null);
    try {
      const [ticketsData, statsData, facultyData] = await Promise.all([
        listClerkTickets(accessToken),
        getClerkStats(accessToken).catch(() => null),
        listFacultyMembers(accessToken).catch(() => []),
      ]);
      setTickets(ticketsData);
      setStats(statsData);
      setFacultyMembers(facultyData);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : "Failed to load Clerk Desk data.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      loadData(token);
    }
  }, [token]);

  function handleOpenForward(ticket: ClerkTicket) {
    setForwardTicketTarget(ticket);
    setForwardRole("faculty");
    setForwardFacultyId(ticket.assigned_faculty_id || "");
    setForwardBranch(ticket.branch || "");
    setForwardSemester(ticket.semester || "");
    setForwardNotes(ticket.clerk_notes || "");
    setForwardError(null);
  }

  async function submitForward() {
    if (!token || !forwardTicketTarget) return;
    if (!forwardNotes.trim()) {
      setForwardError("Please enter forwarding notes for the designated authority.");
      return;
    }
    setIsSubmittingForward(true);
    setForwardError(null);
    try {
      const updated = await forwardClerkTicket(token, forwardTicketTarget.id, {
        target_role: forwardRole,
        assigned_faculty_id: forwardRole === "faculty" && forwardFacultyId ? forwardFacultyId : null,
        branch: forwardBranch || null,
        semester: forwardSemester || null,
        clerk_notes: forwardNotes.trim(),
      });
      setTickets((prev) =>
        prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
      );
      if (activeDetailTicket?.id === updated.id) {
        setActiveDetailTicket(updated);
      }
      setForwardTicketTarget(null);
      getClerkStats(token).then((res) => setStats(res)).catch(() => null);
    } catch (err) {
      setForwardError(err instanceof ApiError ? String(err.detail) : "Failed to forward ticket.");
    } finally {
      setIsSubmittingForward(false);
    }
  }

  function handleOpenRespond(ticket: ClerkTicket) {
    setRespondTicketTarget(ticket);
    setRespondContent("");
    setRespondStatus(ticket.status === "open" ? "in_progress" : ticket.status);
    setRespondError(null);
  }

  async function submitRespond() {
    if (!token || !respondTicketTarget) return;
    if (!respondContent.trim()) {
      setRespondError("Please enter response content.");
      return;
    }
    setIsSubmittingRespond(true);
    setRespondError(null);
    try {
      const updated = await respondClerkTicket(token, respondTicketTarget.id, {
        content: respondContent.trim(),
        status: respondStatus || null,
      });
      setTickets((prev) =>
        prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
      );
      if (activeDetailTicket?.id === updated.id) {
        setActiveDetailTicket(updated);
      }
      setRespondTicketTarget(null);
      getClerkStats(token).then((res) => setStats(res)).catch(() => null);
    } catch (err) {
      setRespondError(err instanceof ApiError ? String(err.detail) : "Failed to send response.");
    } finally {
      setIsSubmittingRespond(false);
    }
  }

  async function handleOpenDetail(ticketId: string) {
    if (!token) return;
    setIsLoadingDetail(true);
    try {
      const detail = await getClerkTicketDetail(token, ticketId);
      setActiveDetailTicket(detail);
    } catch {
      // Fallback
    } finally {
      setIsLoadingDetail(false);
    }
  }

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (selectedBranch && t.branch !== selectedBranch) return false;
      if (selectedSemester && t.semester !== selectedSemester) return false;
      if (selectedStatus && t.status !== selectedStatus) return false;
      if (selectedForwarded) {
        if (selectedForwarded === "unforwarded" && t.forwarded_to) return false;
        if (selectedForwarded !== "unforwarded" && t.forwarded_to !== selectedForwarded) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSubject = t.subject?.toLowerCase().includes(q);
        const matchesEmail = t.student_email?.toLowerCase().includes(q);
        const matchesId = t.id.toLowerCase().includes(q);
        const matchesBranch = t.branch?.toLowerCase().includes(q);
        if (!matchesSubject && !matchesEmail && !matchesId && !matchesBranch) return false;
      }
      return true;
    });
  }, [tickets, selectedBranch, selectedSemester, selectedStatus, selectedForwarded, searchQuery]);

  function resetFilters() {
    setSelectedBranch("");
    setSelectedSemester("");
    setSelectedStatus("");
    setSelectedForwarded("");
    setSearchQuery("");
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="rounded-2xl bg-gradient-to-r from-amber-800 via-amber-700 to-amber-900 p-5 sm:p-7 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-base">
                📋
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-200">
                Official HelpDesk Desk Operations
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Clerk Query Triage &amp; Forwarding Portal
            </h1>
            <p className="text-xs sm:text-sm text-amber-100 max-w-2xl leading-relaxed">
              Review incoming student inquiries, assess requests, and route them to designated
              Department Faculties or Administration authorities filtered by <strong>Branch</strong> and <strong>Semester</strong>.
            </p>
          </div>

          <button
            onClick={() => token && loadData(token)}
            disabled={isLoading}
            className="self-start md:self-auto rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 px-3.5 py-2 text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs min-h-[44px]"
          >
            <span>🔄</span>
            <span>{isLoading ? "Refreshing..." : "Refresh Desk"}</span>
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Total Inquiries
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-black text-slate-900">
              {stats.total_tickets}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">All received cases</div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
              Pending Intake
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-black text-amber-900">
              {stats.pending_tickets}
            </div>
            <div className="text-[10px] text-amber-700 mt-0.5">Open &amp; unreviewed</div>
          </div>

          <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3.5 shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-purple-800">
              To Faculty
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-black text-purple-900">
              {stats.forwarded_to_faculty}
            </div>
            <div className="text-[10px] text-purple-700 mt-0.5">Academic routing</div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
              To Administration
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-black text-blue-900">
              {stats.forwarded_to_admin}
            </div>
            <div className="text-[10px] text-blue-700 mt-0.5">Campus governance</div>
          </div>

          <div className="col-span-2 sm:col-span-1 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              Resolved
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-black text-emerald-900">
              {stats.resolved_tickets}
            </div>
            <div className="text-[10px] text-emerald-700 mt-0.5">Closed inquiries</div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">🔍 Filter Queries by Academic Profile</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
              {filteredTickets.length} of {tickets.length} showing
            </span>
          </div>
          {(selectedBranch || selectedSemester || selectedStatus || selectedForwarded || searchQuery) && (
            <button
              onClick={resetFilters}
              className="text-xs text-amber-800 font-bold hover:underline self-start sm:self-auto cursor-pointer"
            >
              Reset all filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
          <div className="col-span-1 xs:col-span-2 lg:col-span-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Search Keywords
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search subject, email..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-amber-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-600 min-h-[40px]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Academic Branch
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-xs text-slate-800 focus:border-amber-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-600 min-h-[40px]"
            >
              <option value="">All Branches</option>
              {BRANCH_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Semester
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-xs text-slate-800 focus:border-amber-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-600 min-h-[40px]"
            >
              <option value="">All Semesters</option>
              {SEMESTER_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Forwarded To
            </label>
            <select
              value={selectedForwarded}
              onChange={(e) => setSelectedForwarded(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-xs text-slate-800 focus:border-amber-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-600 min-h-[40px]"
            >
              <option value="">All Forwarding</option>
              <option value="unforwarded">Pending Forwarding</option>
              <option value="faculty">Forwarded to Faculty</option>
              <option value="admin">Forwarded to Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Inquiry Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-xs text-slate-800 focus:border-amber-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-600 min-h-[40px]"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500 space-y-2">
            <div className="inline-block animate-spin text-2xl">⏳</div>
            <p className="font-semibold">Loading Clerk Desk inquiries...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500 space-y-2">
            <span className="text-3xl">📭</span>
            <p className="font-bold text-sm text-slate-800">No matching inquiries found</p>
            <p className="text-slate-500">Try adjusting your branch or semester filters above.</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Inquiry ID &amp; Student</th>
                      <th className="px-4 py-3">Subject &amp; Category</th>
                      <th className="px-4 py-3">Academic Routing</th>
                      <th className="px-4 py-3">Forwarded State</th>
                      <th className="px-4 py-3 text-right">Desk Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3.5 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              #{ticket.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ticket.status === "open"
                                ? "bg-amber-100 text-amber-900 border border-amber-200"
                                : ticket.status === "in_progress"
                                ? "bg-blue-100 text-blue-900 border border-blue-200"
                                : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                            }`}>
                              {ticket.status.replace("_", " ").toUpperCase()}
                            </span>
                          </div>
                          <div className="text-[11px] font-semibold text-slate-800">
                            {ticket.student_email || "Student"}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 space-y-1 max-w-xs">
                          <div className="font-bold text-slate-900 line-clamp-1">
                            {ticket.subject || "(No subject provided)"}
                          </div>
                          <div className="flex items-center gap-1 flex-wrap">
                            {ticket.category && (
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {ticket.category}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                              📍 {ticket.branch || "General / Unset"}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                              🎓 {ticket.semester || "Sem N/A"}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 space-y-1">
                          {ticket.forwarded_to === "faculty" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded border border-purple-200">
                              👨‍🏫 To Faculty {ticket.assigned_faculty_email ? `(${ticket.assigned_faculty_email})` : ""}
                            </span>
                          ) : ticket.forwarded_to === "admin" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
                              🏛️ To Central Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              ⚡ Pending Desk Triage
                            </span>
                          )}
                          {ticket.clerk_notes && (
                            <div className="text-[10px] text-slate-500 italic line-clamp-1">
                              Note: {ticket.clerk_notes}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenForward(ticket)}
                            className="rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs px-2.5 py-1.5 shadow-xs transition-all cursor-pointer"
                          >
                            Forward 🔀
                          </button>
                          <button
                            onClick={() => handleOpenRespond(ticket)}
                            className="rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-2.5 py-1.5 shadow-xs transition-all cursor-pointer"
                          >
                            Reply 💬
                          </button>
                          <button
                            onClick={() => handleOpenDetail(ticket.id)}
                            className="rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs px-2.5 py-1.5 transition-all cursor-pointer"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="md:hidden space-y-3">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        #{ticket.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ticket.status === "open"
                          ? "bg-amber-100 text-amber-900 border border-amber-200"
                          : ticket.status === "in_progress"
                          ? "bg-blue-100 text-blue-900 border border-blue-200"
                          : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                      }`}>
                        {ticket.status.replace("_", " ").toUpperCase()}
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-400">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 leading-snug">
                      {ticket.subject || "(No subject provided)"}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Student: <span className="font-semibold text-slate-700">{ticket.student_email || "N/A"}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap text-xs">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                      📍 {ticket.branch || "General / Unset"}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                      🎓 {ticket.semester || "Sem N/A"}
                    </span>
                  </div>

                  <div>
                    {ticket.forwarded_to === "faculty" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded border border-purple-200">
                        👨‍🏫 Forwarded to Faculty
                      </span>
                    ) : ticket.forwarded_to === "admin" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
                        🏛️ Forwarded to Central Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        ⚡ Pending Clerk Triage
                      </span>
                    )}
                  </div>

                  {ticket.clerk_notes && (
                    <div className="rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600 border border-slate-200/80">
                      <strong>Clerk Note:</strong> {ticket.clerk_notes}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleOpenForward(ticket)}
                      className="rounded-xl bg-amber-700 hover:bg-amber-800 active:scale-95 text-white font-bold text-xs py-2.5 shadow-xs transition-all text-center min-h-[44px]"
                    >
                      Forward 🔀
                    </button>
                    <button
                      onClick={() => handleOpenRespond(ticket)}
                      className="rounded-xl bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-bold text-xs py-2.5 shadow-xs transition-all text-center min-h-[44px]"
                    >
                      Reply 💬
                    </button>
                    <button
                      onClick={() => handleOpenDetail(ticket.id)}
                      className="rounded-xl border border-slate-300 hover:bg-slate-100 active:scale-95 text-slate-700 font-bold text-xs py-2.5 transition-all text-center min-h-[44px]"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {forwardTicketTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  Forward Query Authority
                </span>
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  Forward #{forwardTicketTarget.id.slice(0, 8).toUpperCase()}
                </h2>
              </div>
              <button
                onClick={() => setForwardTicketTarget(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 text-lg"
              >
                ✕
              </button>
            </div>

            {forwardError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                ⚠️ {forwardError}
              </div>
            )}

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subject &amp; Inquiry
                </label>
                <div className="rounded-xl bg-slate-50 p-2.5 text-xs text-slate-800 border border-slate-200">
                  <span className="font-bold block">{forwardTicketTarget.subject || "No Subject"}</span>
                  <span className="text-[11px] text-slate-500">Student: {forwardTicketTarget.student_email || "N/A"}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Forward Destination Authority *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForwardRole("faculty")}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      forwardRole === "faculty"
                        ? "border-purple-600 bg-purple-50/80 text-purple-900 ring-2 ring-purple-200 font-bold"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-base">👨‍🏫 Faculty Authority</div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                      Course, syllabus, grades, assignments, attendance
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForwardRole("admin")}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      forwardRole === "admin"
                        ? "border-rose-600 bg-rose-50/80 text-rose-900 ring-2 ring-rose-200 font-bold"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-base">🏛️ Central Administration</div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                      Fees, billing, registrar transcripts, IT &amp; hostel
                    </div>
                  </button>
                </div>
              </div>

              {forwardRole === "faculty" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Designated Faculty Member (Optional)
                  </label>
                  <select
                    value={forwardFacultyId}
                    onChange={(e) => setForwardFacultyId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 min-h-[42px]"
                  >
                    <option value="">Auto-route to Department Head / Routing Rule</option>
                    {facultyMembers.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Branch Tag
                  </label>
                  <select
                    value={forwardBranch}
                    onChange={(e) => setForwardBranch(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 min-h-[42px]"
                  >
                    <option value="">Select Branch</option>
                    {BRANCH_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Semester Tag
                  </label>
                  <select
                    value={forwardSemester}
                    onChange={(e) => setForwardSemester(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 min-h-[42px]"
                  >
                    <option value="">Select Semester</option>
                    {SEMESTER_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Official Clerk Forwarding Notes *
                </label>
                <textarea
                  required
                  rows={3}
                  value={forwardNotes}
                  onChange={(e) => setForwardNotes(e.target.value)}
                  placeholder="State reason for forwarding, student context, or specific action requested from professor or admin..."
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-800 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setForwardTicketTarget(null)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitForward}
                disabled={isSubmittingForward}
                className="rounded-xl bg-amber-700 hover:bg-amber-800 text-white px-5 py-2.5 text-xs font-bold shadow-md disabled:opacity-60 min-h-[44px]"
              >
                {isSubmittingForward ? "Forwarding Ticket..." : "Confirm & Forward Ticket →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {respondTicketTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Direct Clerk Response
                </span>
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  Reply to #{respondTicketTarget.id.slice(0, 8).toUpperCase()}
                </h2>
              </div>
              <button
                onClick={() => setRespondTicketTarget(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 text-lg"
              >
                ✕
              </button>
            </div>

            {respondError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                ⚠️ {respondError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Response Message *
                </label>
                <textarea
                  required
                  rows={4}
                  value={respondContent}
                  onChange={(e) => setRespondContent(e.target.value)}
                  placeholder="Type official response to the student..."
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-800 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Update Ticket Status
                </label>
                <select
                  value={respondStatus}
                  onChange={(e) => setRespondStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800 min-h-[42px]"
                >
                  <option value="in_progress">Keep In Progress</option>
                  <option value="resolved">Mark as Resolved</option>
                  <option value="open">Keep Open</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRespondTicketTarget(null)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRespond}
                disabled={isSubmittingRespond}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 text-xs font-bold shadow-md disabled:opacity-60 min-h-[44px]"
              >
                {isSubmittingRespond ? "Sending Response..." : "Send Response →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeDetailTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    #{activeDetailTicket.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    activeDetailTicket.status === "open"
                      ? "bg-amber-100 text-amber-900"
                      : activeDetailTicket.status === "in_progress"
                      ? "bg-blue-100 text-blue-900"
                      : "bg-emerald-100 text-emerald-900"
                  }`}>
                    {activeDetailTicket.status.toUpperCase()}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                  {activeDetailTicket.subject || "(No Subject)"}
                </h2>
              </div>
              <button
                onClick={() => setActiveDetailTicket(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                Student: {activeDetailTicket.student_email || "N/A"}
              </span>
              <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                📍 {activeDetailTicket.branch || "Branch Unset"}
              </span>
              <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                🎓 {activeDetailTicket.semester || "Semester Unset"}
              </span>
              {activeDetailTicket.forwarded_to && (
                <span className="font-bold text-purple-800 bg-purple-100 px-2.5 py-1 rounded-lg">
                  Forwarded to {activeDetailTicket.forwarded_to.toUpperCase()}
                </span>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Inquiry Messages ({activeDetailTicket.messages.length})
              </div>
              <div className="space-y-2.5 max-h-72 overflow-y-auto p-1">
                {activeDetailTicket.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-xl p-3 text-xs leading-relaxed border ${
                      msg.sender_type === "student"
                        ? "bg-slate-50 border-slate-200 text-slate-800"
                        : msg.sender_type === "ai_agent"
                        ? "bg-indigo-50/70 border-indigo-200 text-indigo-950"
                        : "bg-amber-50/70 border-amber-200 text-amber-950"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                      <span className="uppercase font-mono">
                        {msg.sender_type === "student"
                          ? "Student Inquiry"
                          : msg.sender_type === "ai_agent"
                          ? "🤖 Automated Triage Agent"
                          : "📋 Clerk Staff Note"}
                      </span>
                      <span>{new Date(msg.created_at).toLocaleString()}</span>
                    </div>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => setActiveDetailTicket(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 min-h-[44px]"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleOpenForward(activeDetailTicket);
                    setActiveDetailTicket(null);
                  }}
                  className="rounded-xl bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 text-xs font-bold shadow-xs min-h-[44px]"
                >
                  Forward 🔀
                </button>
                <button
                  onClick={() => {
                    handleOpenRespond(activeDetailTicket);
                    setActiveDetailTicket(null);
                  }}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs font-bold shadow-xs min-h-[44px]"
                >
                  Reply 💬
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
