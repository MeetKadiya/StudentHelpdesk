/**
 * Faculty ticket API calls. Shapes match backend/app/schemas/faculty.py.
 * All routes require a bearer access token belonging to a role='faculty'
 * user and are scoped server-side to tickets routed to that user — a
 * ticket that exists but isn't routed to the caller 404s, same pattern as
 * lib/api/tickets.ts's student scoping.
 */
import { apiFetch } from "@/lib/api/client";
import type { TicketOut, MessageOut } from "@/lib/api/tickets";

export interface FacultyTicketOut extends TicketOut {
  assigned_faculty_id: string | null;
}

export interface FacultyMessageOut extends MessageOut {
  is_verified: boolean;
}

export interface FacultyTicketDetailOut extends FacultyTicketOut {
  messages: FacultyMessageOut[];
}

export function listRoutedTickets(accessToken: string): Promise<FacultyTicketOut[]> {
  return apiFetch<FacultyTicketOut[]>("/faculty/tickets", { accessToken });
}

export function getRoutedTicket(
  accessToken: string,
  ticketId: string
): Promise<FacultyTicketDetailOut> {
  return apiFetch<FacultyTicketDetailOut>(`/faculty/tickets/${ticketId}`, { accessToken });
}

export function respondToTicket(
  accessToken: string,
  ticketId: string,
  content: string
): Promise<FacultyMessageOut> {
  return apiFetch<FacultyMessageOut>(`/faculty/tickets/${ticketId}/respond`, {
    method: "POST",
    body: { content },
    accessToken,
  });
}

export function verifyMessage(
  accessToken: string,
  ticketId: string,
  messageId: string
): Promise<FacultyMessageOut> {
  return apiFetch<FacultyMessageOut>(
    `/faculty/tickets/${ticketId}/messages/${messageId}/verify`,
    {
      method: "POST",
      body: { verified: true },
      accessToken,
    }
  );
}
