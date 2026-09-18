/**
 * Admin API calls. Shapes match backend/app/schemas/admin.py exactly.
 * All routes require a bearer access token belonging to a role='admin'
 * user (require_admin, app/api/deps.py).
 *
 * NOTE (FRONTEND-03): BACKEND-06 only shipped routing-rules + user-role
 * management (FR-20/FR-21) — there is no generic "list all tickets /
 * override any ticket" admin endpoint yet, even though the original
 * FRONTEND-03 task description mentions "ticket list/filter, manual
 * response UI". Rather than build against mocked ticket data (which
 * state_claude3.md's prior session explicitly flagged as a choice to
 * surface, not make silently), this dashboard is built around the real,
 * shipped admin surface: routing rules and role management. A generic
 * admin ticket view is a real gap — flagged in task_board.md, not solved
 * here.
 */
import { apiFetch } from "@/lib/api/client";
import type { UserOut } from "@/lib/api/auth";

export interface RoutingRuleOut {
  id: string;
  category: string;
  faculty_id: string;
  created_by: string;
  created_at: string;
}

export function listRoutingRules(accessToken: string): Promise<RoutingRuleOut[]> {
  return apiFetch<RoutingRuleOut[]>("/admin/routing-rules", { accessToken });
}

export function createRoutingRule(
  accessToken: string,
  category: string,
  facultyId: string
): Promise<RoutingRuleOut> {
  return apiFetch<RoutingRuleOut>("/admin/routing-rules", {
    method: "POST",
    body: { category, faculty_id: facultyId },
    accessToken,
  });
}

export function deleteRoutingRule(accessToken: string, ruleId: string): Promise<void> {
  return apiFetch<void>(`/admin/routing-rules/${ruleId}`, {
    method: "DELETE",
    accessToken,
  });
}

export function listUsers(accessToken: string): Promise<UserOut[]> {
  return apiFetch<UserOut[]>("/admin/users", { accessToken });
}

export function updateUserRole(
  accessToken: string,
  userId: string,
  role: "student" | "faculty" | "admin"
): Promise<UserOut> {
  return apiFetch<UserOut>(`/admin/users/${userId}/role`, {
    method: "PATCH",
    body: { role },
    accessToken,
  });
}

export interface AnalyticsSummaryOut {
  total_tickets: number;
  tickets_by_status: Record<string, number>;
  escalation_rate: number | null;
  avg_first_response_seconds: number | null;
  avg_agent_confidence: number | null;
  ai_auto_resolution_rate: number | null;
}

export function getAnalyticsSummary(accessToken: string): Promise<AnalyticsSummaryOut> {
  return apiFetch<AnalyticsSummaryOut>("/admin/analytics/summary", { accessToken });
}

export interface PendingKbItemOut {
  message_id: string;
  ticket_id: string;
  category: string | null;
  question: string;
  answer: string;
  faculty_id: string | null;
  faculty_email: string | null;
  created_at: string;
}

export interface KbApprovalResultOut {
  status: string;
  message_id: string;
}

export function listPendingKbApprovals(accessToken: string): Promise<PendingKbItemOut[]> {
  return apiFetch<PendingKbItemOut[]>("/admin/knowledgebase/pending", { accessToken });
}

export function approveKbEntry(accessToken: string, messageId: string): Promise<KbApprovalResultOut> {
  return apiFetch<KbApprovalResultOut>(`/admin/knowledgebase/${messageId}/approve`, {
    method: "POST",
    accessToken,
  });
}

export function rejectKbEntry(accessToken: string, messageId: string): Promise<KbApprovalResultOut> {
  return apiFetch<KbApprovalResultOut>(`/admin/knowledgebase/${messageId}/reject`, {
    method: "POST",
    accessToken,
  });
}

// ---------------------------------------------------------------------------
// Admin Tickets & Clerk Assistant Triage
// ---------------------------------------------------------------------------

export interface AdminTicketOut {
  id: string;
  student_id: string;
  student_email: string | null;
  subject: string | null;
  category: string | null;
  status: string;
  assigned_faculty_id: string | null;
  assigned_name: string | null;
  target_role: "admin" | "faculty" | null;
  department: string | null;
  priority: string;
  snippet: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminTicketDetailOut extends AdminTicketOut {
  messages: Array<{
    id: string;
    ticket_id: string;
    sender_type: "student" | "staff" | "ai_agent";
    sender_id: string | null;
    content: string;
    created_at: string;
    is_verified?: boolean;
  }>;
}

export function listAdminTickets(
  accessToken: string,
  params?: { target_role?: string; category?: string; status?: string }
): Promise<AdminTicketOut[]> {
  const query = new URLSearchParams();
  if (params?.target_role) query.set("target_role", params.target_role);
  if (params?.category) query.set("category", params.category);
  if (params?.status) query.set("status", params.status);
  const qs = query.toString();
  return apiFetch<AdminTicketOut[]>(`/admin/tickets${qs ? `?${qs}` : ""}`, {
    accessToken,
  });
}

export function getAdminTicket(
  accessToken: string,
  ticketId: string
): Promise<AdminTicketDetailOut> {
  return apiFetch<AdminTicketDetailOut>(`/admin/tickets/${ticketId}`, {
    accessToken,
  });
}

export function respondAdminTicket(
  accessToken: string,
  ticketId: string,
  content: string
): Promise<any> {
  return apiFetch<any>(`/admin/tickets/${ticketId}/respond`, {
    method: "POST",
    body: { content },
    accessToken,
  });
}

export function reassignAdminTicket(
  accessToken: string,
  ticketId: string,
  payload: { assigned_to_id?: string | null; category?: string; status?: string }
): Promise<AdminTicketOut> {
  return apiFetch<AdminTicketOut>(`/admin/tickets/${ticketId}/reassign`, {
    method: "PATCH",
    body: payload,
    accessToken,
  });
}

// ---------------------------------------------------------------------------
// Student & Faculty Provisioning & CSV Import
// ---------------------------------------------------------------------------

export interface ImportedStudentItem {
  name: string;
  email: string;
  enrollment_number: string;
  phone_number: string;
  branch: string;
  course: string;
  semester: string;
  temp_password: string;
  email_dispatched: boolean;
  sms_dispatched: boolean;
}

export interface StudentCsvImportResult {
  total_rows: number;
  created_count: number;
  skipped_count: number;
  created_students: ImportedStudentItem[];
  errors: string[];
}

export interface StudentCreateIn {
  name: string;
  email: string;
  enrollment_number: string;
  phone_number: string;
  branch: string;
  course?: string;
  semester?: string;
  password?: string;
}

export interface FacultyCreateIn {
  name: string;
  email: string;
  department: string;
  phone_number?: string;
  title?: string;
  password?: string;
}

export function importStudentsCsv(
  accessToken: string,
  csvContent: string
): Promise<StudentCsvImportResult> {
  return apiFetch<StudentCsvImportResult>("/admin/students/import-csv", {
    method: "POST",
    body: { csv_content: csvContent },
    accessToken,
  });
}

export function createSingleStudent(
  accessToken: string,
  payload: StudentCreateIn
): Promise<UserOut> {
  return apiFetch<UserOut>("/admin/users/create-student", {
    method: "POST",
    body: payload,
    accessToken,
  });
}

export function createSingleFaculty(
  accessToken: string,
  payload: FacultyCreateIn
): Promise<UserOut> {
  return apiFetch<UserOut>("/admin/users/create-faculty", {
    method: "POST",
    body: payload,
    accessToken,
  });
}

// ---------------------------------------------------------------------------
// Exam Form Controller
// ---------------------------------------------------------------------------

export interface ExamControlStatusOut {
  id: number;
  is_active: boolean;
  session_name: string;
  start_date?: string | null;
  end_date?: string | null;
  announcement?: string | null;
  fee_amount: number;
  total_registrations: number;
  updated_at: string;
}

export interface ExamControlToggleIn {
  is_active: boolean;
  session_name?: string;
  announcement?: string;
  fee_amount?: number;
}

export interface ExamRegistrationItemOut {
  id: string;
  student_id: string;
  enrollment_number: string;
  student_name: string;
  student_email: string;
  branch: string;
  semester: string;
  papers: string;
  status: string;
  submitted_at: string;
}

export function getExamControlStatus(accessToken: string): Promise<ExamControlStatusOut> {
  return apiFetch<ExamControlStatusOut>("/admin/exam-form/status", {
    accessToken,
  });
}

export function toggleExamControl(
  accessToken: string,
  payload: ExamControlToggleIn
): Promise<ExamControlStatusOut> {
  return apiFetch<ExamControlStatusOut>("/admin/exam-form/toggle", {
    method: "POST",
    body: payload,
    accessToken,
  });
}

export function listExamRegistrations(
  accessToken: string
): Promise<ExamRegistrationItemOut[]> {
  return apiFetch<ExamRegistrationItemOut[]>("/admin/exam-form/registrations", {
    accessToken,
  });
}

// ---------------------------------------------------------------------------
// Student 360 Records Inspection
// ---------------------------------------------------------------------------

export interface Student360OverviewOut {
  student: UserOut;
  fees_summary: {
    total_assessed: number;
    total_paid: number;
    balance_pending: number;
    status: string;
    transactions: Array<{
      id: string;
      order_id: string;
      payment_id?: string;
      amount: number;
      fee_type: string;
      status: string;
      payment_method?: string;
      receipt_no?: string;
      created_at?: string;
    }>;
  };
  marks: Array<{
    id: string;
    subject_code: string;
    subject_name: string;
    semester: string;
    internal_marks: number;
    midterm_marks: number;
    final_marks: number;
    total_marks: number;
    grade: string;
    grade_points: number;
    credits: number;
    academic_year: string;
  }>;
  spi?: number | null;
  cpi?: number | null;
  assignments: Array<{
    submission_id?: string | null;
    assignment_id: string;
    course_code: string;
    course_name: string;
    title: string;
    score?: number | null;
    total_points: number;
    status: string;
    feedback?: string | null;
    submitted_at?: string | null;
  }>;
  attendance: {
    percentage: number;
    attended: number;
    total: number;
  };
  exam_registration?: {
    id: string;
    session: string;
    status: string;
    submitted_at: string;
  } | null;
}

export function getStudent360Overview(
  accessToken: string,
  identifier: string
): Promise<Student360OverviewOut> {
  return apiFetch<Student360OverviewOut>(
    `/admin/students/${encodeURIComponent(identifier)}/overview`,
    { accessToken }
  );
}



