"use client";

import { useEffect, useState, type FormEvent, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { useRequireAuth } from "@/lib/auth/use-require-auth";
import { useRequireStudent } from "@/lib/auth/use-require-student";
import { ApiError } from "@/lib/api/client";
import { createTicket, listTickets, type TicketOut } from "@/lib/api/tickets";
import { CAMPUS_SERVICES } from "@/data/student-services";

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

function TicketRowSkeleton() {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div className="skeleton h-4 w-48" />
      <div className="skeleton h-5 w-20 rounded-full" />
    </div>
  );
}

function TicketsContent() {
  useRequireStudent();
  const accessToken = useRequireAuth();
  const { isAuthenticated } = useAuth();
  const searchParams = useSearchParams();

  const [tickets, setTickets] = useState<TicketOut[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [subject, setSubject] = useState(searchParams.get("subject") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [message, setMessage] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function refreshTickets(token: string) {
    try {
      const data = await listTickets(token);
      setTickets(data);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? String(err.detail) : "Could not load tickets.");
    }
  }

  useEffect(() => {
    if (accessToken) {
      refreshTickets(accessToken);
    }
  }, [accessToken]);

  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    setSubmitError(null);
    setCreatedTicketId(null);
    setIsSubmitting(true);
    try {
      const newTicket = await createTicket(accessToken, {
        subject: subject.trim() || undefined,
        message: message.trim(),
        category: category || undefined,
      });
      setCreatedTicketId(newTicket.id);
      setSubject("");
      setMessage("");
      setCategory("");
      await refreshTickets(accessToken);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? String(err.detail) : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-sm italic text-ledger">Student HelpDesk</p>
            <h1 className="mt-1 font-display text-2xl font-medium text-ink">
              Open a Service Request
            </h1>
          </div>
          <Link href="/services" className="text-xs font-medium text-stamp hover:underline">
            Browse Campus Services Directory →
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="surface-card space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="service-category" className="field-label">
                Department / Campus Service
              </label>
              <select
                id="service-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="field-input mt-1.5"
              >
                <option value="">General Support Inquiry</option>
                {CAMPUS_SERVICES.map((s) => (
                  <option key={s.id} value={s.title}>
                    {s.title} ({s.department})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="subject" className="field-label">
                Subject <span className="font-normal text-ink-faint">(optional)</span>
              </label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="field-input mt-1.5"
                placeholder="e.g. Financial aid deadline or Course override"
              />
            </div>
          </div>

          <div>
            <label htmlFor="message" className="field-label">
              Your Question / Request Details
            </label>
            <textarea
              id="message"
              required
              minLength={1}
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="field-input mt-1.5"
              placeholder="Describe what you need help with in detail..."
            />
          </div>

          {createdTicketId && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
              <div className="space-y-0.5">
                <p className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <span>✅</span> Request Created & ID Generated Successfully!
                </p>
                <p className="text-[11px] text-emerald-700">
                  Ticket ID: <span className="font-mono font-bold bg-white/80 px-2 py-0.5 rounded border border-emerald-300">#{createdTicketId}</span>
                </p>
              </div>
              <Link
                href={`/tickets/${createdTicketId}`}
                className="rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs px-3.5 py-1.5 transition-colors self-start sm:self-auto shrink-0"
              >
                View Ticket &rarr;
              </Link>
            </div>
          )}

          {submitError && <p className="error-banner">{submitError}</p>}

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-ink-faint">
              An AI specialist will answer immediately. Inquiries needing staff review are escalated to the department.
            </span>
            <button
              type="submit"
              disabled={isSubmitting || message.trim().length === 0}
              className="btn-primary shrink-0 cursor-pointer"
            >
              {isSubmitting ? "Submitting…" : "Submit Request"}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-medium text-ink">Your Support Requests</h2>
        {loadError && <p className="error-banner">{loadError}</p>}

        {tickets === null && !loadError && (
          <div className="surface-card divide-y divide-line">
            <TicketRowSkeleton />
            <TicketRowSkeleton />
            <TicketRowSkeleton />
          </div>
        )}

        {tickets !== null && tickets.length === 0 && (
          <div className="surface-card px-5 py-8 text-center">
            <p className="text-sm text-ink-muted">
              No tickets yet — select a campus service above to submit an inquiry.
            </p>
          </div>
        )}

        {tickets !== null && tickets.length > 0 && (
          <ul className="surface-card divide-y divide-line">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <Link href={`/tickets/${ticket.id}`} className="surface-row flex items-center justify-between">
                  <div className="min-w-0 pr-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        #{ticket.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className="truncate text-sm font-semibold text-ink">
                        {ticket.subject || "(no subject)"}
                      </span>
                    </div>
                    {ticket.category && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 inline-block">
                        {ticket.category}
                      </span>
                    )}
                  </div>
                  <StatusBadge status={ticket.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function TicketsPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-ink-muted">Loading requests...</div>}>
      <TicketsContent />
    </Suspense>
  );
}
