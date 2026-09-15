"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireAdmin } from "@/lib/auth/use-require-admin";
import { getAnalyticsSummary, type AnalyticsSummaryOut } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";

function formatPercent(value: number | null): string {
  return value === null ? "Not enough data" : `${(value * 100).toFixed(1)}%`;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "Not enough data";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)} min`;
  return `${(seconds / 3600).toFixed(1)} hr`;
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="surface-card p-4">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-medium text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="surface-card space-y-2 p-4">
      <div className="skeleton h-3 w-24" />
      <div className="skeleton h-7 w-16" />
    </div>
  );
}

function StatusBreakdown({ byStatus, total }: { byStatus: Record<string, number>; total: number }) {
  const entries = Object.entries(byStatus).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return <p className="text-sm text-ink-muted">No tickets yet.</p>;
  }
  return (
    <div className="space-y-3">
      {entries.map(([status, count]) => {
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={status}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="capitalize text-ink">{status.replace(/_/g, " ")}</span>
              <span className="text-ink-faint">{count}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-ledger transition-standard"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const accessToken = useRequireAdmin();
  const [summary, setSummary] = useState<AnalyticsSummaryOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    getAnalyticsSummary(accessToken)
      .then(setSummary)
      .catch((err) =>
        setError(err instanceof ApiError ? String(err.detail) : "Failed to load analytics.")
      );
  }, [accessToken]);

  if (!accessToken) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin" className="text-sm text-ledger transition-standard hover:text-ledger-dark">
          &larr; Back to admin
        </Link>
        <h1 className="mt-2 font-display text-2xl font-medium text-ink">Analytics</h1>
        <p className="mt-1 max-w-lg text-sm text-ink-muted">
          Live aggregates over real ticket/message/agent-run data. Fields with no
          underlying data yet show &quot;Not enough data&quot; rather than a
          misleading zero.
        </p>
      </div>

      {error && <p className="error-banner">{error}</p>}

      {!summary && !error && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      )}

      {summary && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total tickets" value={String(summary.total_tickets)} />
            <StatCard
              label="Escalation rate"
              value={formatPercent(summary.escalation_rate)}
              hint="Tickets routed to a faculty member"
            />
            <StatCard
              label="Avg. first response"
              value={formatDuration(summary.avg_first_response_seconds)}
              hint="Ticket created &rarr; first staff/AI reply"
            />
            <StatCard
              label="AI auto-resolution rate"
              value={formatPercent(summary.ai_auto_resolution_rate)}
              hint="AI runs that completed without escalating"
            />
          </div>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-medium text-ink">Tickets by status</h2>
            <div className="surface-card p-4">
              <StatusBreakdown byStatus={summary.tickets_by_status} total={summary.total_tickets} />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-medium text-ink">AI confidence</h2>
            <div className="surface-card p-4">
              <p className="text-sm text-ink-muted">
                Average model confidence across AI runs:{" "}
                <span className="font-medium text-ink">
                  {summary.avg_agent_confidence === null
                    ? "Not enough data"
                    : summary.avg_agent_confidence.toFixed(2)}
                </span>
              </p>
              <p className="mt-1.5 text-xs text-ink-faint">
                This reflects the AI&apos;s own reported confidence, not a measured
                correctness rate &mdash; there&apos;s no human-graded accuracy check in this
                system yet.
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
