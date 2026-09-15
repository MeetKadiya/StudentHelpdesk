import { apiFetch } from "@/lib/api/client";

export interface EmailOut {
  id: string;
  sender_id: string;
  sender_email: string;
  sender_role: string;
  recipient_email: string;
  recipient_id: string | null;
  subject: string;
  body: string;
  status: string;
  created_at: string;
}

export interface StudentRecipientOut {
  id: string;
  email: string;
  role: string;
}

export interface BroadcastEmailIn {
  subject: string;
  body: string;
  target_group?: string;
}

export interface BroadcastEmailResultOut {
  total_recipients: number;
  delivered_smtp_count: number;
  portal_saved_count: number;
  failed_smtp_count: number;
  recipient_emails: string[];
  subject: string;
  status_summary: string;
}


export interface SmtpConfigIn {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password?: string;
  smtp_tls: boolean;
  from_email?: string;
  from_name: string;
  is_active: boolean;
}

export interface SmtpConfigOut {
  id: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  has_password: boolean;
  smtp_tls: boolean;
  from_email: string;
  from_name: string;
  is_active: boolean;
  last_status: string | null;
  last_tested_at: string | null;
}

export function sendEmail(
  accessToken: string,
  input: { recipient_email: string; subject: string; body: string }
): Promise<EmailOut> {
  return apiFetch<EmailOut>("/emails/send", {
    method: "POST",
    body: input,
    accessToken,
  });
}

export function sendBroadcastEmail(
  accessToken: string,
  input: BroadcastEmailIn
): Promise<BroadcastEmailResultOut> {
  return apiFetch<BroadcastEmailResultOut>("/emails/broadcast", {
    method: "POST",
    body: input,
    accessToken,
  });
}


export function listSentEmails(accessToken: string): Promise<EmailOut[]> {
  return apiFetch<EmailOut[]>("/emails/sent", { accessToken });
}

export function listInboxEmails(accessToken: string): Promise<EmailOut[]> {
  return apiFetch<EmailOut[]>("/emails/inbox", { accessToken });
}

export function listStudentsDirectory(accessToken: string): Promise<StudentRecipientOut[]> {
  return apiFetch<StudentRecipientOut[]>("/emails/students", { accessToken });
}

export function getSmtpConfig(accessToken: string): Promise<SmtpConfigOut> {
  return apiFetch<SmtpConfigOut>("/emails/smtp", { accessToken });
}

export function updateSmtpConfig(
  accessToken: string,
  payload: SmtpConfigIn
): Promise<SmtpConfigOut> {
  return apiFetch<SmtpConfigOut>("/emails/smtp", {
    method: "POST",
    body: payload,
    accessToken,
  });
}

export function testSmtpConnection(
  accessToken: string,
  testRecipient: string
): Promise<{ success: boolean; message: string; host: string; recipient: string }> {
  return apiFetch<{ success: boolean; message: string; host: string; recipient: string }>(
    "/emails/smtp/test",
    {
      method: "POST",
      body: { test_recipient: testRecipient },
      accessToken,
    }
  );
}
