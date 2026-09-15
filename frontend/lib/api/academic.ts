/**
 * Academic API Client: Assignments, Attendance, and Student Roster.
 */

import { apiFetch } from "@/lib/api/client";

export interface AssignmentSubmissionOut {
  id: string;
  assignment_id: string;
  student_id: string;
  student_email: string;
  submission_text: string;
  score: number | null;
  feedback: string | null;
  status: "submitted" | "graded";
  submitted_at: string;
  graded_at: string | null;
}

export interface AssignmentOut {
  id: string;
  faculty_id: string;
  course_code: string;
  course_name: string;
  title: string;
  description: string;
  due_date: string;
  total_points: number;
  status: string;
  created_at: string;
  submission_count: number;
  graded_count: number;
}

export interface AssignmentDetailOut extends AssignmentOut {
  submissions: AssignmentSubmissionOut[];
}

export interface AssignmentCreateIn {
  course_code: string;
  course_name: string;
  title: string;
  description: string;
  due_date: string;
  total_points: number;
}

export interface SubmissionGradeIn {
  submission_id: string;
  score: number;
  feedback?: string;
}

export interface AttendanceRecordIn {
  student_id: string;
  student_email: string;
  status: "present" | "absent" | "late" | "excused";
  notes?: string;
}

export interface AttendanceRecordOut {
  id: string;
  session_id: string;
  student_id: string;
  student_email: string;
  status: "present" | "absent" | "late" | "excused";
  notes: string | null;
  created_at: string;
}

export interface AttendanceSessionOut {
  id: string;
  faculty_id: string;
  course_code: string;
  course_name: string;
  session_date: string;
  topic: string;
  created_at: string;
  present_count: number;
  absent_count: number;
  late_count: number;
  total_students: number;
  records: AttendanceRecordOut[];
}

export interface AttendanceSessionCreateIn {
  course_code: string;
  course_name: string;
  session_date: string;
  topic: string;
  records: AttendanceRecordIn[];
}

export interface StudentRosterItemOut {
  id: string;
  email: string;
  full_name: string;
  student_id: string;
  program: string;
  semester: string;
  attendance_percentage: number;
  total_sessions_attended: number;
  total_sessions: number;
  assignments_submitted: number;
  total_assignments: number;
}

// API Functions

export function listAssignments(accessToken: string): Promise<AssignmentOut[]> {
  return apiFetch<AssignmentOut[]>("/faculty/academic/assignments", { accessToken });
}

export function createAssignment(
  accessToken: string,
  payload: AssignmentCreateIn
): Promise<AssignmentOut> {
  return apiFetch<AssignmentOut>("/faculty/academic/assignments", {
    method: "POST",
    body: payload,
    accessToken,
  });
}

export function getAssignmentDetail(
  accessToken: string,
  assignmentId: string
): Promise<AssignmentDetailOut> {
  return apiFetch<AssignmentDetailOut>(`/faculty/academic/assignments/${assignmentId}`, {
    accessToken,
  });
}

export function deleteAssignment(accessToken: string, assignmentId: string): Promise<void> {
  return apiFetch<void>(`/faculty/academic/assignments/${assignmentId}`, {
    method: "DELETE",
    accessToken,
  });
}

export function gradeSubmission(
  accessToken: string,
  assignmentId: string,
  payload: SubmissionGradeIn
): Promise<AssignmentSubmissionOut> {
  return apiFetch<AssignmentSubmissionOut>(`/faculty/academic/assignments/${assignmentId}/grade`, {
    method: "POST",
    body: payload,
    accessToken,
  });
}

export function listAttendanceSessions(accessToken: string): Promise<AttendanceSessionOut[]> {
  return apiFetch<AttendanceSessionOut[]>("/faculty/academic/attendance/sessions", {
    accessToken,
  });
}

export function recordAttendanceSession(
  accessToken: string,
  payload: AttendanceSessionCreateIn
): Promise<AttendanceSessionOut> {
  return apiFetch<AttendanceSessionOut>("/faculty/academic/attendance/sessions", {
    method: "POST",
    body: payload,
    accessToken,
  });
}

export function getStudentRoster(accessToken: string): Promise<StudentRosterItemOut[]> {
  return apiFetch<StudentRosterItemOut[]>("/faculty/academic/students", { accessToken });
}
