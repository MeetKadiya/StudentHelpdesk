"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { useRequireAuth } from "@/lib/auth/use-require-auth";
import { ApiError } from "@/lib/api/client";
import { getTicket, getTicketStatus, postTicketMessage, type TicketDetailOut } from "@/lib/api/tickets";
import { triageStudentQueryClient } from "@/lib/services/clerk-triage";

// Status polling interval. NFR-2 (requirements.md) requires the UI not block
// on long-running agent runs; requirements.md §5 leaves websocket-vs-polling
// open and api_contract.md's /status endpoint was added for polling. 5s is a
// reasonable default for a support-ticket use case (not chat-latency
// sensitive) — revisit via task_board.md if that changes.
const STATUS_POLL_MS = 5000;

const STATUS_STYLES: Record<string, string> = {
  open: "bg-status-pendingBg text-status-pending",
  in_progress: "bg-status-activeBg text-status-active",
  resolved: "bg-status-doneBg text-status-done",
  closed: "bg-status-closedBg text-status-closed",
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-status-closedBg text-status-closed";
  return <span className={`status-chip ${style}`}>{status.replace("_", " ")}</span>;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params.id;
  const accessToken = useRequireAuth();
  const { isAuthenticated, user } = useAuth();

  const [ticket, setTicket] = useState<TicketDetailOut | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [reply, setReply] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadTicket = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await getTicket(accessToken, ticketId);
      setTicket(data);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? String(err.detail) : "Could not load ticket.");
    }
  }, [accessToken, ticketId]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  // Poll status only (cheap) rather than re-fetching the whole thread on
  // every tick; re-fetch the full ticket only when status actually changes,
  // so a newly-posted AI/staff message shows up without spamming
  // GET /tickets/{id}.
  useEffect(() => {
    if (!accessToken) return;

    pollRef.current = setInterval(async () => {
      try {
        const { status } = await getTicketStatus(accessToken, ticketId);
        setTicket((current) => {
          if (current && current.status !== status) {
            loadTicket();
          }
          return current;
        });
      } catch {
        // Transient polling failures aren't worth surfacing as page errors;
        // the next tick will retry.
      }
    }, STATUS_POLL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [accessToken, ticketId, loadTicket]);

  async function handleReply(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || reply.trim().length === 0) return;
    setSendError(null);
    setIsSending(true);
    try {
      await postTicketMessage(accessToken, ticketId, reply.trim());
      setReply("");
      await loadTicket();
    } catch (err) {
      setSendError(err instanceof ApiError ? String(err.detail) : "Something went wrong.");
    } finally {
      setIsSending(false);
    }
  }

  if (!isAuthenticated) {
    return null;
  }

  const backHref = user?.role === "admin" ? "/admin" : user?.role === "faculty" ? "/faculty" : "/tickets";
  const backLabel = user?.role === "admin" ? "← Back to Admin Console" : user?.role === "faculty" ? "← Back to Faculty Desk" : "← Back to requests";

  if (loadError) {
    return (
      <div className="space-y-4">
        <p className="error-banner">{loadError}</p>
        <Link href={backHref} className="text-sm font-semibold text-ledger transition-standard hover:text-ledger-dark">
          {backLabel}
        </Link>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-4 w-24" />
        <div className="flex items-center justify-between">
          <div className="skeleton h-7 w-64" />
          <div className="skeleton h-5 w-20 rounded-full" />
        </div>
        <div className="space-y-3">
          <div className="skeleton ml-auto h-12 w-2/3" />
          <div className="skeleton h-16 w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={backHref} className="text-sm font-semibold text-ledger transition-standard hover:text-ledger-dark">
          {backLabel}
        </Link>
        <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                title={ticket.id}
                className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200"
              >
                Ticket #{ticket.id.slice(0, 8).toUpperCase()}
              </span>
              {ticket.category && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                  {ticket.category}
                </span>
              )}
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-medium text-ink">
              {ticket.subject || "(no subject)"}
            </h1>
          </div>
          <div className="self-start sm:self-auto shrink-0">
            <StatusBadge status={ticket.status} />
          </div>
        </div>

        {(() => {
          const triage = triageStudentQueryClient(ticket.subject, ticket.subject || "", ticket.category);
          return (
            <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3.5 sm:px-4 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">🤖</span>
                <span className="text-slate-700">
                  Sorted by <strong>Clerk Assistant</strong> to:{" "}
                  <strong className={triage.targetRole === "faculty" ? "text-purple-700" : "text-indigo-700"}>
                    {triage.targetRole === "faculty" ? "🎓 Academic Faculty" : "🏛️ University Administration"}
                  </strong>{" "}
                  · <span className="text-slate-600">{triage.department}</span>
                </span>
              </div>
              <span className="self-start sm:self-center text-[10px] uppercase font-bold text-indigo-900 bg-white px-2 py-0.5 rounded border border-indigo-200">
                Priority: {triage.priority}
              </span>
            </div>
          );
        })()}
      </div>

      <ul className="space-y-3">
        {ticket.messages.map((msg) => {
          const isStudent = msg.sender_type === "student";
          const isAi = msg.sender_type === "ai_agent";
          const isClerk = isAi && msg.content.includes("Clerk Assistant");
          return (
            <li
              key={msg.id}
              className={`max-w-[94%] sm:max-w-[85%] animate-fade-in rounded-2xl px-3.5 sm:px-5 py-3 sm:py-4 shadow-xs border ${
                isStudent
                  ? "ml-auto bg-slate-900 text-white border-slate-800"
                  : isClerk
                  ? "mr-auto bg-indigo-50/80 border-indigo-200 text-slate-900"
                  : isAi
                  ? "mr-auto bg-amber-50/70 border-amber-200 text-slate-900"
                  : "mr-auto bg-white border-slate-200 text-slate-900"
              }`}
            >
              {isClerk && (
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 uppercase tracking-wider mb-2">
                  <span>🤖</span> Clerk Assistant Intake &amp; Triage
                </div>
              )}
              {isAi && !isClerk && (
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-2">
                  <span>⚡</span> AI Automated Resolution
                </div>
              )}
              {!isStudent && !isAi && (
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-2">
                  <span>👨‍🏫</span> Official Department Response
                </div>
              )}
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
              <p className={`mt-2 text-[11px] ${isStudent ? "text-slate-400" : "text-slate-500"}`}>
                {msg.sender_type} &middot; {formatTimestamp(msg.created_at)}
              </p>
            </li>
          );
        })}
      </ul>

      <form onSubmit={handleReply} className="surface-card space-y-3 p-5">
        <label htmlFor="reply" className="field-label">
          {user?.role === "student" ? "Add a follow-up message" : "Reply to student inquiry"}
        </label>
        <textarea
          id="reply"
          rows={3}
          required
          minLength={1}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder={
            user?.role === "student"
              ? "Provide any further details or questions..."
              : "Write official response to the student..."
          }
          className="field-input"
        />
        {sendError && <p className="error-banner">{sendError}</p>}
        <button
          type="submit"
          disabled={isSending || reply.trim().length === 0}
          className="btn-primary"
        >
          {isSending ? "Sending…" : user?.role === "student" ? "Send Reply" : "Dispatch Staff Response"}
        </button>
      </form>
    </div>
  );
}
