/**
 * Student ticket API calls. Shapes match backend/app/schemas/ticket.py and
 * project-management/api_contract.md v0.4 — keep these two in sync; if the
 * backend contract changes, update both places in the same session.
 *
 * All routes require a bearer access token and are scoped server-side to
 * the authenticated student.
 */
import { apiFetch } from "@/lib/api/client";

export interface TicketOut {
  id: string;
  subject: string | null;
  status: string;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageOut {
  id: string;
  sender_type: string;
  sender_id: string | null;
  content: string;
  created_at: string;
}

export interface TicketDetailOut extends TicketOut {
  messages: MessageOut[];
}
export interface TicketStatusOut {
  id: string;
  status: string;
}

export function createTicket(
  accessToken: string,
  input: { subject?: string; message: string; category?: string }
): Promise<TicketOut> {
  return apiFetch<TicketOut>("/tickets", {
    method: "POST",
    body: input,
    accessToken,
  });
}

export function listTickets(accessToken: string): Promise<TicketOut[]> {
  return apiFetch<TicketOut[]>("/tickets", { accessToken });
}

export function getTicket(accessToken: string, ticketId: string): Promise<TicketDetailOut> {
  return apiFetch<TicketDetailOut>(`/tickets/${ticketId}`, { accessToken });
}
export function postTicketMessage(
  accessToken: string,
  ticketId: string,
  content: string
): Promise<MessageOut> {
  return apiFetch<MessageOut>(`/tickets/${ticketId}/messages`, {
    method: "POST",
    body: { content },
    accessToken,
  });
}

export function getTicketStatus(
  accessToken: string,
  ticketId: string
): Promise<TicketStatusOut> {
  return apiFetch<TicketStatusOut>(`/tickets/${ticketId}/status`, { accessToken });
}
