/**
 * Client-side Clerk Assistant Triage helper.
 * Mirrors backend clerk_service.py logic for instant real-time UI preview and badges.
 */

export interface ClerkTriageInfo {
  targetRole: "faculty" | "admin";
  department: string;
  categorySlug: string;
  priority: "urgent" | "high" | "normal";
  reason: string;
  summaryBanner: string;
  badgeLabel: string;
}

export function triageStudentQueryClient(
  subject: string | null | undefined,
  message: string,
  categoryHint: string | null | undefined
): ClerkTriageInfo {
  const combined = `${subject || ""} ${message} ${categoryHint || ""}`.toLowerCase().trim();

  // -------------------------------------------------------------
  // 1. UNIVERSITY ADMINISTRATION ROUTING
  // -------------------------------------------------------------
  // Financial & Fee Dues (Bursar / Accounts)
  if (
    [
      "fee", "fees", "tuition", "payment", "pay", "dues", "receipt", "invoice",
      "scholarship", "financial aid", "refund", "cost", "installment", "bursar",
      "challan", "bank loan", "bank transaction", "transaction id"
    ].some((k) => combined.includes(k))
  ) {
    const isUrgent = ["deadline", "late fee", "hold", "overdue", "urgent"].some((k) =>
      combined.includes(k)
    );
    return {
      targetRole: "admin",
      department: "Bursar & Student Accounts Office",
      categorySlug: "financial_aid_billing",
      priority: isUrgent ? "high" : "normal",
      reason: "Inquiry relates to tuition payments, fee receipts, financial holds, or billing invoices.",
      summaryBanner: "🏛️ Sorted to University Administration — Bursar & Accounts Desk",
      badgeLabel: "🏛️ Admin Desk (Accounts & Billing)",
    };
  }

  // Official Records, Certificates & Registration (Registrar)
  if (
    [
      "bonafide", "certificate", "transcript", "enrollment verification", "letter",
      "visa letter", "passport letter", "degree verification", "migration certificate",
      "duplicate id", "id card", "name change", "correction", "document attestation"
    ].some((k) => combined.includes(k))
  ) {
    const isUrgent = ["visa", "passport", "urgent", "travel"].some((k) => combined.includes(k));
    return {
      targetRole: "admin",
      department: "Office of the University Registrar",
      categorySlug: "admissions_enrollment",
      priority: isUrgent ? "urgent" : "normal",
      reason: "Inquiry relates to official institutional certificates, transcripts, or registrar records.",
      summaryBanner: "🏛️ Sorted to University Administration — Registrar & Student Records",
      badgeLabel: "🏛️ Admin Desk (Registrar & Records)",
    };
  }

  // Campus IT, Wi-Fi & Accounts Access
  if (
    [
      "wifi", "wi-fi", "vpn", "mfa", "login", "password reset", "forgot password",
      "portal error", "canvas error", "network down", "mac address", "lan", "cloud lab",
      "email account", "student email", "authenticator", "otp"
    ].some((k) => combined.includes(k))
  ) {
    const isUrgent = ["locked", "exam tomorrow", "cannot login", "urgent"].some((k) =>
      combined.includes(k)
    );
    return {
      targetRole: "admin",
      department: "Campus IT & Network Systems Desk",
      categorySlug: "it_support",
      priority: isUrgent ? "high" : "normal",
      reason: "Inquiry relates to campus network connectivity, authentication, or enterprise portal access.",
      summaryBanner: "🏛️ Sorted to University Administration — Campus IT Helpdesk",
      badgeLabel: "🏛️ Admin Desk (Campus IT)",
    };
  }

  // Campus Housing, Hostel & Facilities
  if (
    [
      "hostel", "dorm", "room", "mess", "canteen", "bed", "allotment", "laundry",
      "maintenance", "ac repair", "water", "electricity", "warden", "campus facilities",
      "cooler", "pipe", "clean", "cleaning"
    ].some((k) => combined.includes(k))
  ) {
    const isUrgent = ["leak", "broken", "medical", "urgent", "bad water", "no water"].some((k) =>
      combined.includes(k)
    );
    return {
      targetRole: "admin",
      department: "Hostel Administration & Student Facilities",
      categorySlug: "general",
      priority: isUrgent ? "high" : "normal",
      reason: "Inquiry relates to campus residential facilities, hostel maintenance, or amenities.",
      summaryBanner: "🏛️ Sorted to University Administration — Hostel & Student Facilities",
      badgeLabel: "🏛️ Admin Desk (Facilities & Hostel)",
    };
  }

  // Student Health Clinic
  if (
    [
      "health", "clinic", "doctor", "medical", "sick", "illness", "prescription",
      "medicine", "emergency", "fever", "counselor", "mental health", "wellness"
    ].some((k) => combined.includes(k))
  ) {
    return {
      targetRole: "admin",
      department: "Student Health Clinic & Wellness Center",
      categorySlug: "general",
      priority: "urgent",
      reason: "Inquiry relates to student health assistance, medical leaves, or wellness consultations.",
      summaryBanner: "🏛️ Sorted to University Administration — Student Health Services",
      badgeLabel: "🏛️ Admin Desk (Health Clinic)",
    };
  }

  // -------------------------------------------------------------
  // 2. FACULTY ROUTING (Academic, Curriculum, Advising & Exams)
  // -------------------------------------------------------------
  // Course Advising, Add/Drop & Prerequisite Waivers
  if (
    [
      "advising", "advisor", "add/drop", "add drop", "prerequisite", "waiver",
      "elective", "course registration", "syllabus", "credit", "credits", "curriculum",
      "major", "minor", "specialization"
    ].some((k) => combined.includes(k))
  ) {
    const isUrgent = ["deadline", "graduation", "urgent"].some((k) => combined.includes(k));
    return {
      targetRole: "faculty",
      department: "Academic Affairs & Department Faculty Advisor",
      categorySlug: "academic",
      priority: isUrgent ? "high" : "normal",
      reason: "Inquiry involves course syllabus, elective selection, or academic advisor approvals.",
      summaryBanner: "🎓 Sorted to Academic Faculty — Department Faculty Advisor",
      badgeLabel: "🎓 Faculty Desk (Course Advising)",
    };
  }

  // Attendance Dispute & Medical Shortage
  if (
    [
      "attendance", "shortage", "absent", "medical leave", "condonation", "percentage",
      "75%", "attendance debarred", "detained", "lecture missed"
    ].some((k) => combined.includes(k))
  ) {
    return {
      targetRole: "faculty",
      department: "Department Faculty & Attendance Committee",
      categorySlug: "academic",
      priority: "high",
      reason: "Inquiry concerns attendance shortage, lecture regularization, or course faculty review.",
      summaryBanner: "🎓 Sorted to Academic Faculty — Course Faculty & Attendance Cell",
      badgeLabel: "🎓 Faculty Desk (Attendance Cell)",
    };
  }

  // Examinations, Grading & Paper Re-evaluations
  if (
    [
      "exam", "hall ticket", "grade", "marks", "re-evaluation", "recheck", "spi",
      "cpi", "cgpa", "marksheet", "supplementary", "mid-sem", "end-sem", "evaluation",
      "professor", "assignment grade", "practical viva", "submission"
    ].some((k) => combined.includes(k))
  ) {
    return {
      targetRole: "faculty",
      department: "Controller of Examinations & Course Faculty",
      categorySlug: "academic",
      priority: "normal",
      reason: "Inquiry relates to examination scheduling, grade card disputes, or academic performance.",
      summaryBanner: "🎓 Sorted to Academic Faculty — Examination & Grading Faculty",
      badgeLabel: "🎓 Faculty Desk (Exams & Grading)",
    };
  }

  // Subject / Topic Query (Maths, Programming, AI, Cloud, etc.)
  if (
    [
      "code", "python", "java", "math", "algorithm", "lecture", "homework", "project",
      "viva", "seminar", "thesis", "research", "lab"
    ].some((k) => combined.includes(k))
  ) {
    return {
      targetRole: "faculty",
      department: "Subject Faculty & Academic Mentors",
      categorySlug: "academic",
      priority: "normal",
      reason: "Inquiry relates to academic course subject matter, lab exercises, or project guidance.",
      summaryBanner: "🎓 Sorted to Academic Faculty — Subject Specialist",
      badgeLabel: "🎓 Faculty Desk (Subject Faculty)",
    };
  }

  // Default fallback: General university inquiry
  return {
    targetRole: "admin",
    department: "General Campus Student HelpDesk",
    categorySlug: "general",
    priority: "normal",
    reason: "General campus inquiry triaged by Clerk Assistant for initial administrative review.",
    summaryBanner: "🏛️ Sorted to University Administration — General Student Desk",
    badgeLabel: "🏛️ Admin Desk (General Inquiries)",
  };
}
