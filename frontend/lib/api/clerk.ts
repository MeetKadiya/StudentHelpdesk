import { apiFetch } from "@/lib/api/client";

export interface ClerkTicket {
  id: string;
  student_id: string;
  student_email: string | null;
  subject: string | null;
  status: string;
  category: string | null;
  branch: string | null;
  semester: string | null;
  forwarded_to: string | null;
  clerk_notes: string | null;
  assigned_faculty_id: string | null;
  assigned_faculty_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClerkMessage {
  id: string;
  sender_type: string;
  sender_id: string | null;
  content: string;
  created_at: string;
}

export interface ClerkTicketDetail extends ClerkTicket {
  messages: ClerkMessage[];
}

export interface ClerkForwardPayload {
  target_role: "faculty" | "admin";
  assigned_faculty_id?: string | null;
  branch?: string | null;
  semester?: string | null;
  clerk_notes: string;
}

export interface ClerkRespondPayload {
  content: string;
  status?: string | null;
}

export interface ClerkStats {
  total_tickets: number;
  pending_tickets: number;
  forwarded_to_faculty: number;
  forwarded_to_admin: number;
  resolved_tickets: number;
  by_branch: Record<string, number>;
  by_semester: Record<string, number>;
}

export interface FacultyMember {
  id: string;
  email: string;
}

export function listClerkTickets(
  token: string,
  filters?: {
    branch?: string;
    semester?: string;
    status?: string;
    forwarded_to?: string;
  }
): Promise<ClerkTicket[]> {
  const params = new URLSearchParams();
  if (filters?.branch) params.set("branch", filters.branch);
  if (filters?.semester) params.set("semester", filters.semester);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.forwarded_to) params.set("forwarded_to", filters.forwarded_to);

  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<ClerkTicket[]>(`/clerk/tickets${query}`, { accessToken: token });
}

export function getClerkTicketDetail(token: string, ticketId: string): Promise<ClerkTicketDetail> {
  return apiFetch<ClerkTicketDetail>(`/clerk/tickets/${ticketId}`, { accessToken: token });
}

export function forwardClerkTicket(
  token: string,
  ticketId: string,
  payload: ClerkForwardPayload
): Promise<ClerkTicketDetail> {
  return apiFetch<ClerkTicketDetail>(`/clerk/tickets/${ticketId}/forward`, {
    method: "POST",
    accessToken: token,
    body: payload,
  });
}

export function respondClerkTicket(
  token: string,
  ticketId: string,
  payload: ClerkRespondPayload
): Promise<ClerkTicketDetail> {
  return apiFetch<ClerkTicketDetail>(`/clerk/tickets/${ticketId}/respond`, {
    method: "POST",
    accessToken: token,
    body: payload,
  });
}

export function getClerkStats(token: string): Promise<ClerkStats> {
  return apiFetch<ClerkStats>("/clerk/stats", { accessToken: token });
}

export function listFacultyMembers(token: string): Promise<FacultyMember[]> {
  return apiFetch<FacultyMember[]>("/clerk/faculty", { accessToken: token });
}
