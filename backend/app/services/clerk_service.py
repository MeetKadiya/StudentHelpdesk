"""Clerk Assistant Service — Intelligently triages and sorts student inquiries
between University Faculty and University Administration.

Rules:
- Faculty: Academic queries, course syllabi, lecture attendance shortages, grades,
  GPA/marks, exam paper re-evaluation, lab submissions, professor consultations.
- Admin: Tuition fee invoices, payments, refunds, scholarships, bursar office,
  bonafide certificates, transcripts, enrollment verification, hostel room allocation,
  student ID cards, campus Wi-Fi / portal login accounts, health clinic, library cards.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Literal

logger = logging.getLogger(__name__)

TargetRole = Literal["faculty", "admin"]


@dataclass
class ClerkTriageResult:
    target_role: TargetRole
    department: str
    category_slug: str
    priority: str
    reason: str
    summary_banner: str


def triage_student_query(
    subject: str | None,
    message: str,
    category_hint: str | None = None,
) -> ClerkTriageResult:
    """Analyzes student query text and category hints to sort to either Faculty or Admin."""
    combined = f"{subject or ''} {message} {category_hint or ''}".lower().strip()

    # -------------------------------------------------------------
    # 1. ACADEMIC FACULTY ROUTING (Study, Assignments, Exams, Attendance)
    # -------------------------------------------------------------
    # Assignments, Homework, Lab Work & Course Submissions (handles common student typos like assingment/asigment)
    if any(k in combined for k in [
        "assign", "assing", "asig", "homework", "hw", "submit", "submision",
        "submission", "submitting", "practical", "lab file", "lab report",
        "project report", "viva", "lab work", "presentation", "assignment"
    ]):
        dept = "Academic Faculty & Course Instructors"
        if any(k in combined for k in ["ai and ds", "ai & ds", "ai/ds", "data science", "machine learning", "artificial intelligence"]):
            dept = "Faculty of AI & Data Science"
        elif any(k in combined for k in ["cs", "cse", "computer", "python", "java", "coding", "software"]):
            dept = "Faculty of Computer Science & Engineering"
        elif any(k in combined for k in ["math", "maths", "calculus", "discrete", "algebra"]):
            dept = "Department of Mathematics & Computing"
        return ClerkTriageResult(
            target_role="faculty",
            department=dept,
            category_slug="academic",
            priority="normal",
            reason="Inquiry relates to coursework assignments, project submissions, or academic deadlines.",
            summary_banner=f"🎓 Sorted to Academic Faculty — {dept}",
        )

    # Attendance Dispute, Lecture Absence & Medical Shortage
    if any(k in combined for k in [
        "attendance", "attend", "shortage", "absent", "medical leave", "condonation", "percentage",
        "75%", "attendance debarred", "detained", "lecture missed", "period", "missed class"
    ]):
        return ClerkTriageResult(
            target_role="faculty",
            department="Department Faculty & Attendance Committee",
            category_slug="academic",
            priority="high",
            reason="Inquiry concerns attendance shortage, lecture regularization, or course faculty review.",
            summary_banner="🎓 Sorted to Academic Faculty — Course Faculty & Attendance Cell",
        )

    # Examinations, Grading & Paper Re-evaluations
    if any(k in combined for k in [
        "exam", "hall ticket", "grade", "marks", "re-evaluation", "recheck", "rechecking",
        "spi", "cpi", "cgpa", "gpa", "marksheet", "supplementary", "mid-sem", "midsem",
        "end-sem", "endsem", "evaluation", "answer sheet", "backlog", "re-exam"
    ]):
        return ClerkTriageResult(
            target_role="faculty",
            department="Controller of Examinations & Course Faculty",
            category_slug="academic",
            priority="high" if any(k in combined for k in ["hall ticket", "admit card", "tomorrow", "urgent"]) else "normal",
            reason="Inquiry relates to examination scheduling, grade card disputes, or academic performance.",
            summary_banner="🎓 Sorted to Academic Faculty — Examination & Grading Faculty",
        )

    # Course Advising, Curriculum, Syllabus & Electives
    if any(k in combined for k in [
        "advising", "advisor", "add/drop", "add drop", "prerequisite", "waiver",
        "elective", "course registration", "syllabus", "credit", "credits", "curriculum",
        "major", "minor", "specialization"
    ]):
        return ClerkTriageResult(
            target_role="faculty",
            department="Academic Affairs & Department Faculty Advisor",
            category_slug="academic",
            priority="high" if any(k in combined for k in ["deadline", "graduation", "urgent"]) else "normal",
            reason="Inquiry involves course syllabus, elective selection, or academic advisor approvals.",
            summary_banner="🎓 Sorted to Academic Faculty — Department Faculty Advisor",
        )

    # Subject / Topic Query & Study Guidance (Maths, Programming, AI, Cloud, etc.)
    if any(k in combined for k in [
        "code", "python", "java", "math", "maths", "algorithm", "lecture", "homework",
        "project", "viva", "seminar", "thesis", "research", "lab", "study", "study material",
        "notes", "subject", "concept", "doubt", "unit", "chapter", "ai", "ds", "cse", "cs",
        "professor", "prof", "faculty", "teacher", "sir", "madam", "mam"
    ]):
        dept = "Subject Faculty & Academic Mentors"
        if any(k in combined for k in ["ai and ds", "ai & ds", "ai", "ds", "data science"]):
            dept = "Faculty of AI & Data Science"
        return ClerkTriageResult(
            target_role="faculty",
            department=dept,
            category_slug="academic",
            priority="normal",
            reason="Inquiry relates to academic course subject matter, study guidance, or professor consultation.",
            summary_banner=f"🎓 Sorted to Academic Faculty — {dept}",
        )

    # -------------------------------------------------------------
    # 2. UNIVERSITY ADMINISTRATION ROUTING (Fees, Facilities, IT, Records)
    # -------------------------------------------------------------
    # Financial & Fee Dues (Bursar / Accounts)
    if any(k in combined for k in [
        "fee", "fees", "tuition", "payment", "pay", "dues", "receipt", "invoice",
        "scholarship", "financial aid", "refund", "cost", "installment", "bursar",
        "challan", "bank loan", "bank transaction", "transaction id"
    ]):
        return ClerkTriageResult(
            target_role="admin",
            department="Bursar & Student Accounts Office",
            category_slug="financial_aid_billing",
            priority="high" if any(k in combined for k in ["deadline", "late fee", "hold", "overdue", "urgent"]) else "normal",
            reason="Inquiry relates to tuition payments, fee receipts, financial holds, or billing invoices.",
            summary_banner="🏛️ Sorted to University Administration — Bursar & Accounts Desk",
        )

    # Official Records, Certificates & Registration (Registrar)
    if any(k in combined for k in [
        "bonafide", "certificate", "transcript", "enrollment verification", "letter",
        "visa letter", "passport letter", "degree verification", "migration certificate",
        "duplicate id", "id card", "name change", "correction", "document attestation"
    ]):
        return ClerkTriageResult(
            target_role="admin",
            department="Office of the University Registrar",
            category_slug="admissions_enrollment",
            priority="urgent" if any(k in combined for k in ["visa", "passport", "urgent", "travel"]) else "normal",
            reason="Inquiry relates to official institutional certificates, transcripts, or registrar records.",
            summary_banner="🏛️ Sorted to University Administration — Registrar & Student Records",
        )

    # Campus IT, Wi-Fi & Accounts Access
    if any(k in combined for k in [
        "wifi", "wi-fi", "vpn", "mfa", "login", "password reset", "forgot password",
        "portal error", "canvas error", "network down", "mac address", "lan", "cloud lab",
        "email account", "student email", "authenticator", "otp"
    ]):
        return ClerkTriageResult(
            target_role="admin",
            department="Campus IT & Network Systems Desk",
            category_slug="it_support",
            priority="high" if any(k in combined for k in ["locked", "exam tomorrow", "cannot login", "urgent"]) else "normal",
            reason="Inquiry relates to campus network connectivity, authentication, or enterprise portal access.",
            summary_banner="🏛️ Sorted to University Administration — Campus IT Helpdesk",
        )

    # Campus Housing, Hostel & Facilities
    if any(k in combined for k in [
        "hostel", "dorm", "room", "mess", "canteen", "bed", "allotment", "laundry",
        "maintenance", "ac repair", "water", "electricity", "warden", "campus facilities",
        "cooler", "pipe", "cleaning", "clean"
    ]):
        return ClerkTriageResult(
            target_role="admin",
            department="Hostel Administration & Student Facilities",
            category_slug="general",
            priority="high" if any(k in combined for k in ["leak", "broken", "medical", "urgent", "bad water", "no water"]) else "normal",
            reason="Inquiry relates to campus residential facilities, mess services, or maintenance.",
            summary_banner="🏛️ Sorted to University Administration — Hostel & Student Facilities",
        )

    # Student Health Clinic
    if any(k in combined for k in [
        "health", "clinic", "doctor", "medical", "sick", "illness", "prescription",
        "medicine", "emergency", "fever", "counselor", "mental health", "wellness"
    ]):
        return ClerkTriageResult(
            target_role="admin",
            department="Student Health Clinic & Wellness Center",
            category_slug="general",
            priority="urgent",
            reason="Inquiry relates to student health assistance, medical leaves, or wellness consultations.",
            summary_banner="🏛️ Sorted to University Administration — Student Health Services",
        )

    # Default fallback: General university inquiry
    return ClerkTriageResult(
        target_role="admin",
        department="General Campus Student HelpDesk",
        category_slug="general",
        priority="normal",
        reason="General campus inquiry triaged by Clerk Assistant for administrative review.",
        summary_banner="🏛️ Sorted to University Administration — General Student Desk",
    )
