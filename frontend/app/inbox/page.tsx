"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { useRequireAuth } from "@/lib/auth/use-require-auth";
import { listInboxEmails, type EmailOut } from "@/lib/api/emails";
import { ApiError } from "@/lib/api/client";

export default function StudentInboxPage() {
  const accessToken = useRequireAuth();
  const { user } = useAuth();
  const [emails, setEmails] = useState<EmailOut[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailOut | null>(null);

  const reload = () => {
    if (!accessToken) return;
    listInboxEmails(accessToken)
      .then((data) => {
        setEmails(data);
        if (data.length > 0) {
          setSelectedEmail((prev) => prev || data[0]);
        }
      })
      .catch((err) =>
        setError(err instanceof ApiError ? String(err.detail) : "Failed to load communications.")
      );
  };

  useEffect(() => {
    reload();
  }, [accessToken]);


  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-800 p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur text-2xl border border-white/20 shadow-md">
              📬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-indigo-400/20 px-2.5 py-0.5 text-[10px] font-bold text-indigo-300 uppercase tracking-wider border border-indigo-400/30">
                  Student Communications
                </span>
                <span className="text-xs text-slate-300">
                  {user?.email}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
                Official Campus Messages & Email Inbox
              </h1>
              <p className="text-xs text-slate-300">
                Direct official notices, advising responses, and announcements from University Faculty and Administration.
              </p>
            </div>
          </div>
          <button
            onClick={reload}
            className="rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs px-4 py-2 transition-all shrink-0 cursor-pointer"
          >
            ↻ Refresh Inbox
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
          {error}
        </div>
      )}

      {/* Main Inbox Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Email List (Left Column) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              All Communications ({(emails || []).length})
            </h2>
            <span className="text-[11px] text-slate-400">Chronological</span>
          </div>

          {emails === null && (
            <div className="space-y-2 animate-pulse">
              <div className="h-20 bg-slate-100 rounded-xl" />
              <div className="h-20 bg-slate-100 rounded-xl" />
              <div className="h-20 bg-slate-100 rounded-xl" />
            </div>
          )}

          {emails !== null && emails.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center space-y-2">
              <span className="text-3xl">📭</span>
              <p className="text-xs font-bold text-slate-700">No Messages Yet</p>
              <p className="text-[11px] text-slate-400">
                When Faculty advisors or Campus Administrators send you direct emails or updates, they will appear here.
              </p>
            </div>
          )}

          {emails !== null && emails.length > 0 && (
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
              {emails.map((e) => {
                const isSelected = selectedEmail?.id === e.id;
                const isAdmin = e.sender_role === "admin";
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setSelectedEmail(e)}
                    className={`w-full text-left rounded-2xl p-4 transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-indigo-50/80 border-indigo-300 shadow-sm"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border ${
                          isAdmin
                            ? "bg-rose-100 text-rose-800 border-rose-200"
                            : "bg-purple-100 text-purple-800 border-purple-200"
                        }`}
                      >
                        {e.sender_role}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(e.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 truncate">
                      {e.subject}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                      {e.body}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-2">
                      From: <span className="font-semibold text-slate-600">{e.sender_email}</span>
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Email Detail Reading Pane (Right Column) */}
        <div className="lg:col-span-7">
          {selectedEmail ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5 sticky top-20">
              <div className="border-b border-slate-100 pb-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                      selectedEmail.sender_role === "admin"
                        ? "bg-rose-100 text-rose-800 border-rose-200"
                        : "bg-purple-100 text-purple-800 border-purple-200"
                    }`}
                  >
                    {selectedEmail.sender_role} Official Notice
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {new Date(selectedEmail.created_at).toLocaleString()}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  {selectedEmail.subject}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="font-bold text-slate-700">From:</span>
                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-800">
                    {selectedEmail.sender_email}
                  </span>
                  <span className="text-slate-400">&bull;</span>
                  <span className="font-bold text-slate-700">To:</span>
                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-800">
                    {selectedEmail.recipient_email}
                  </span>
                </div>
              </div>

              <div className="prose prose-sm text-slate-800 whitespace-pre-wrap leading-relaxed py-2 font-sans">
                {selectedEmail.body}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✓</span> Verified Campus Delivery
                </span>
                <Link
                  href="/tickets"
                  className="font-bold text-indigo-600 hover:text-indigo-800"
                >
                  Need further help? Open Support Ticket &rarr;
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center text-slate-400 space-y-2">
              <span className="text-4xl block">📩</span>
              <p className="text-xs font-semibold">Select an email to view its full details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
