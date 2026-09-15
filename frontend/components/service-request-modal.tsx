"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { createTicket } from "@/lib/api/tickets";
import { ApiError } from "@/lib/api/client";
import type { CampusService } from "@/data/student-services";

interface ServiceRequestModalProps {
  service: CampusService | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ServiceRequestModal({
  service,
  isOpen,
  onClose,
  onSuccess,
}: ServiceRequestModalProps) {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);

  if (!isOpen || !service) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!accessToken || !service) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const ticket = await createTicket(accessToken, {
        subject: subject.trim() || `${service.title} Request`,
        message: message.trim(),
        category: service.title,
      });

      setCreatedTicketId(ticket.id);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? String(err.detail)
          : "Failed to submit request. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    setSubject("");
    setMessage("");
    setError(null);
    setCreatedTicketId(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm animate-fade-in">
      <div className="surface-card w-full max-w-xl overflow-hidden border border-line bg-paper shadow-2xl animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line bg-paper-raised px-6 py-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-stamp">
              {service.category} Service
            </span>
            <h3 className="font-display text-lg font-medium text-ink">
              {service.title}
            </h3>
            <p className="text-xs text-ink-muted">{service.department}</p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-paper hover:text-ink"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        {createdTicketId ? (
          <div className="space-y-4 px-6 py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-status-doneBg text-status-done">
              ✓
            </div>
            <h4 className="font-display text-xl font-medium text-ink">
              Request Submitted Successfully!
            </h4>
            <p className="text-sm text-ink-muted">
              Your inquiry has been submitted to the {service.department}. The AI assistant is reviewing your request, and department staff will follow up.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  handleClose();
                  router.push(`/tickets/${createdTicketId}`);
                }}
                className="btn-primary !py-2 !px-4"
              >
                View Ticket Details
              </button>
              <button
                onClick={handleClose}
                className="btn-secondary !py-2 !px-4"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
            {/* Quick Common Requests */}
            {service.commonRequests.length > 0 && (
              <div>
                <p className="text-xs font-medium text-ink-muted">
                  Common Service Inquiries:
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {service.commonRequests.map((req, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSubject(req)}
                      className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                        subject === req
                          ? "bg-ledger text-paper-raised"
                          : "border border-line bg-paper-raised text-ink-muted hover:border-ledger/50 hover:text-ink"
                      }`}
                    >
                      {req}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="modal-subject" className="field-label">
                Subject / Request Title
              </label>
              <input
                id="modal-subject"
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Scholarship status or Course override"
                className="field-input mt-1"
              />
            </div>

            <div>
              <label htmlFor="modal-message" className="field-label">
                Details / Inquiry
              </label>
              <textarea
                id="modal-message"
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Provide specific details about what you need from this office..."
                className="field-input mt-1"
              />
            </div>

            <div className="rounded-md border border-dashed border-line bg-paper-raised/60 p-3 text-xs text-ink-muted">
              <span className="font-semibold text-ink">Office Info:</span> {service.location} • {service.hours}
              <br />
              <span className="font-semibold text-ink">Direct Contact:</span> {service.contact}
            </div>

            {error && <p className="error-banner">{error}</p>}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="btn-secondary !py-2 !px-4"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || message.trim().length === 0}
                className="btn-primary !py-2 !px-5"
              >
                {isSubmitting ? "Submitting…" : "Submit Request"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
