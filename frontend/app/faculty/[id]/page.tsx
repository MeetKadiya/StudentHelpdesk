"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRequireFaculty } from "@/lib/auth/use-require-faculty";
import {
  getRoutedTicket,
  respondToTicket,
  verifyMessage,
  type FacultyTicketDetailOut,
  type FacultyMessageOut,
} from "@/lib/api/faculty";
import { ApiError } from "@/lib/api/client";

function MessageBubble({
  message,
  onVerify,
  verifying,
}: {
  message: FacultyMessageOut;
  onVerify: (messageId: string) => void;
  verifying: boolean;
}) {
  const isStaff = message.sender_type === "staff";
  return (
    <div className={`flex ${isStaff ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-md animate-fade-in rounded-lg px-4 py-2.5 shadow-card ${
          isStaff ? "bg-ledger text-paper-raised" : "border border-line bg-paper-raised text-ink"
        }`}
      >
        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        <div
          className={`mt-1.5 flex items-center gap-2 text-xs ${
            isStaff ? "text-paper-raised/70" : "text-ink-faint"
          }`}
        >
          <span>{new Date(message.created_at).toLocaleString()}</span>
          {isStaff && message.is_verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs text-emerald-100 border border-emerald-500/40">
              <span>✓</span> Verified (Pending Admin Approval)
            </span>
          )}
          {isStaff && !message.is_verified && (
            <button
              onClick={() => onVerify(message.id)}
              disabled={verifying}
              className="rounded-full bg-paper-raised/15 hover:bg-paper-raised/25 px-2.5 py-0.5 text-xs transition-standard disabled:opacity-50 cursor-pointer flex items-center gap-1 text-paper-raised font-medium"
            >
              <span>★</span> {verifying ? "Submitting…" : "Mark Verified for KB"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FacultyTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const accessToken = useRequireFaculty();
  const [ticket, setTicket] = useState<FacultyTicketDetailOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  function reload() {
    if (!accessToken) return;
    getRoutedTicket(accessToken, params.id)
      .then(setTicket)
      .catch((err) =>
        setError(err instanceof ApiError ? String(err.detail) : "Failed to load ticket.")
      );
  }

  useEffect(reload, [accessToken, params.id]);

  async function handleReply(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !reply.trim()) return;
    setIsSending(true);
    setError(null);
    try {
      await respondToTicket(accessToken, params.id, reply.trim());
      setReply("");
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : "Failed to send response.");
    } finally {
      setIsSending(false);
    }
  }

  async function handleVerify(messageId: string) {
    if (!accessToken) return;
    setVerifyingId(messageId);
    setError(null);
    try {
      await verifyMessage(accessToken, params.id, messageId);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : "Failed to verify response.");
    } finally {
      setVerifyingId(null);
    }
  }

  if (error && !ticket) {
    return <p className="error-banner">{error}</p>;
  }
  if (!ticket) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-4 w-40" />
        <div className="skeleton h-7 w-64" />
        <div className="skeleton h-16 w-3/4" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/faculty" className="text-sm text-ledger transition-standard hover:text-ledger-dark">
          &larr; Back to routed tickets
        </Link>
        <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h1 className="font-display text-2xl font-medium text-ink">
            {ticket.subject ?? "(no subject)"}
          </h1>
          <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
            Ticket #{ticket.id}
          </span>
        </div>
        <p className="mt-1.5 text-xs text-ink-muted flex items-center gap-2">
          <span className="rounded-md bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200 uppercase tracking-wider">
            {ticket.category ?? "General"}
          </span>
          <span>&middot; Status: <strong className="uppercase">{ticket.status}</strong></span>
        </p>
      </div>

      <div className="space-y-3">
        {ticket.messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onVerify={handleVerify}
            verifying={verifyingId === message.id}
          />
        ))}
      </div>

      {error && <p className="error-banner">{error}</p>}

      <form onSubmit={handleReply} className="surface-card space-y-3 p-5">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Write a response..."
          rows={3}
          className="field-input"
        />
        <button type="submit" disabled={isSending || !reply.trim()} className="btn-primary">
          {isSending ? "Sending…" : "Send response"}
        </button>
      </form>
      <p className="text-xs text-ink-faint">
        Marking a response verified feeds it back into the AI&apos;s knowledge base so it
        can answer similar questions automatically next time.
      </p>
    </div>
  );
}
