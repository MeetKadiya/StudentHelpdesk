"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { useRequireAuth } from "@/lib/auth/use-require-auth";
import { useRequireStudent } from "@/lib/auth/use-require-student";
import { ApiError } from "@/lib/api/client";
import { getTicket, getTicketStatus, postTicketMessage, type TicketDetailOut } from "@/lib/api/tickets";

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
  useRequireStudent();
  const params = useParams<{ id: string }>();
  const ticketId = params.id;
  const accessToken = useRequireAuth();
  const { isAuthenticated } = useAuth();

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

  if (loadError) {
    return (
      <div className="space-y-4">
        <p className="error-banner">{loadError}</p>
        <Link href="/tickets" className="text-sm text-ledger transition-standard hover:text-ledger-dark">
          &larr; Back to tickets
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
        <Link href="/tickets" className="text-sm text-ledger transition-standard hover:text-ledger-dark">
          &larr; Back to tickets
        </Link>
        <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                Ticket #{ticket.id}
              </span>
              {ticket.category && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                  {ticket.category}
                </span>
              )}
            </div>
            <h1 className="font-display text-2xl font-medium text-ink">
              {ticket.subject || "(no subject)"}
            </h1>
          </div>
          <StatusBadge status={ticket.status} />
        </div>
      </div>

      <ul className="space-y-3">
        {ticket.messages.map((msg) => {
          const isStudent = msg.sender_type === "student";
          return (
            <li
              key={msg.id}
              className={`max-w-[80%] animate-fade-in rounded-lg px-4 py-3 shadow-card ${
                isStudent
                  ? "ml-auto bg-ledger text-paper-raised"
                  : "border border-line bg-paper-raised text-ink"
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
              <p className={`mt-1.5 text-xs ${isStudent ? "text-paper-raised/60" : "text-ink-faint"}`}>
                {msg.sender_type} &middot; {formatTimestamp(msg.created_at)}
              </p>
            </li>
          );
        })}
      </ul>

      <form onSubmit={handleReply} className="surface-card space-y-3 p-5">
        <label htmlFor="reply" className="field-label">
          Add a follow-up message
        </label>
        <textarea
          id="reply"
          rows={3}
          required
          minLength={1}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          className="field-input"
        />
        {sendError && <p className="error-banner">{sendError}</p>}
        <button
          type="submit"
          disabled={isSending || reply.trim().length === 0}
          className="btn-primary"
        >
          {isSending ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}
