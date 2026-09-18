"""Schemas for Faculty Academic Workflow (Assignments, Attendance, Student Roster)."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

# --- Assignment Schemas ---


class AssignmentCreateIn(BaseModel):
    course_code: str = Field(..., min_length=1, max_length=50)
    course_name: str = Field(..., min_length=1, max_length=255)
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    due_date: datetime
    total_points: int = Field(default=100, ge=1, le=1000)


class AssignmentSubmissionOut(BaseModel):
    id: uuid.UUID
    assignment_id: uuid.UUID
    student_id: uuid.UUID
    student_email: str
    submission_text: str
    score: int | None
    feedback: str | None
    status: str
    submitted_at: datetime
    graded_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class AssignmentOut(BaseModel):
    id: uuid.UUID
    faculty_id: uuid.UUID
    course_code: str
    course_name: str
    title: str
    description: str
    due_date: datetime
    total_points: int
    status: str
    created_at: datetime
    submission_count: int = 0
    graded_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class AssignmentDetailOut(AssignmentOut):
    submissions: list[AssignmentSubmissionOut] = []


class SubmissionGradeIn(BaseModel):
    submission_id: uuid.UUID
    score: int = Field(..., ge=0, le=1000)
    feedback: str | None = None


# --- Attendance Schemas ---


class AttendanceRecordIn(BaseModel):
    student_id: uuid.UUID
    student_email: str
    status: str = Field(default="present", pattern="^(present|absent|late|excused)$")
    notes: str | None = None


class AttendanceSessionCreateIn(BaseModel):
    course_code: str = Field(..., min_length=1, max_length=50)
    course_name: str = Field(..., min_length=1, max_length=255)
    session_date: date
    topic: str = Field(..., min_length=1, max_length=255)
    records: list[AttendanceRecordIn]


class AttendanceRecordOut(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    student_id: uuid.UUID
    student_email: str
    status: str
    notes: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AttendanceSessionOut(BaseModel):
    id: uuid.UUID
    faculty_id: uuid.UUID
    course_code: str
    course_name: str
    session_date: date
    topic: str
    created_at: datetime
    present_count: int = 0
    absent_count: int = 0
    late_count: int = 0
    total_students: int = 0
    records: list[AttendanceRecordOut] = []

    model_config = ConfigDict(from_attributes=True)


# --- Student Roster Directory Schemas ---


class StudentRosterItemOut(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    student_id: str
    program: str
    semester: str
    attendance_percentage: float
    total_sessions_attended: int
    total_sessions: int
    assignments_submitted: int
    total_assignments: int

    model_config = ConfigDict(from_attributes=True)


# --- Student Marks & Enrollment Lookup Schemas ---


class StudentMarkOut(BaseModel):
    id: uuid.UUID
    subject_code: str
    subject_name: str
    semester: str
    internal_marks: float
    midterm_marks: float
    final_marks: float
    total_marks: float
    grade: str
    grade_points: int
    credits: int
    academic_year: str

    model_config = ConfigDict(from_attributes=True)


class StudentAssignmentSubmissionItem(BaseModel):
    assignment_id: uuid.UUID
    course_code: str
    course_name: str
    title: str
    total_points: int
    due_date: datetime
    submission_id: uuid.UUID | None = None
    submission_text: str | None = None
    score: int | None = None
    feedback: str | None = None
    status: str = "pending"
    submitted_at: datetime | None = None


class StudentAcademicLookupOut(BaseModel):
    student_id: uuid.UUID
    enrollment_number: str
    name: str
    email: str
    phone_number: str | None = None
    branch: str | None = None
    course: str | None = None
    semester: str | None = None
    marks: list[StudentMarkOut] = []
    spi: float | None = None
    cpi: float | None = None
    assignments: list[StudentAssignmentSubmissionItem] = []
    attendance_percentage: float = 92.5
    total_sessions_attended: int = 0
    total_sessions: int = 0


# --- Student Exam Form Schemas ---


class ExamFormStatusOut(BaseModel):
    is_active: bool
    session_name: str
    announcement: str | None = None
    fee_amount: int = 1200
    start_date: datetime | None = None
    end_date: datetime | None = None


class ExamFormRegisterIn(BaseModel):
    semester: str = "Semester 6"
    papers: list[dict[str, str]]
    payment_reference: str | None = None
