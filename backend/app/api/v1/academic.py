"""API Router for Faculty Academic Workflow (Assignments, Attendance, Student Directory)."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_faculty
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.academic import (
    AssignmentCreateIn,
    AssignmentDetailOut,
    AssignmentOut,
    AssignmentSubmissionOut,
    AttendanceSessionCreateIn,
    AttendanceSessionOut,
    StudentRosterItemOut,
    SubmissionGradeIn,
)
from app.services import academic_service

router = APIRouter()


# --- Assignments Endpoints ---

@router.get("/assignments", response_model=list[AssignmentOut])
async def list_assignments(
    user: User = Depends(require_faculty),
    db: AsyncSession = Depends(get_db),
) -> list[AssignmentOut]:
    """Lists all assignments created for courses."""
    return await academic_service.list_faculty_assignments(db, user.id)


@router.post("/assignments", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    payload: AssignmentCreateIn,
    user: User = Depends(require_faculty),
    db: AsyncSession = Depends(get_db),
) -> AssignmentOut:
    """Creates a new course assignment."""
    return await academic_service.create_assignment(db, user.id, payload)


@router.get("/assignments/{assignment_id}", response_model=AssignmentDetailOut)
async def get_assignment_detail(
    assignment_id: uuid.UUID,
    user: User = Depends(require_faculty),
    db: AsyncSession = Depends(get_db),
) -> AssignmentDetailOut:
    """Retrieves assignment details and student submissions."""
    assignment = await academic_service.get_assignment_detail(db, assignment_id)
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")
    return assignment


@router.delete("/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment(
    assignment_id: uuid.UUID,
    user: User = Depends(require_faculty),
    db: AsyncSession = Depends(get_db),
):
    """Deletes an assignment and associated submissions."""
    success = await academic_service.delete_assignment(db, assignment_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")


@router.post("/assignments/{assignment_id}/grade", response_model=AssignmentSubmissionOut)
async def grade_submission(
    assignment_id: uuid.UUID,
    payload: SubmissionGradeIn,
    user: User = Depends(require_faculty),
    db: AsyncSession = Depends(get_db),
) -> AssignmentSubmissionOut:
    """Grades a student's assignment submission."""
    graded = await academic_service.grade_assignment_submission(db, assignment_id, payload)
    if not graded:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found.")
    return graded


# --- Attendance Endpoints ---

@router.get("/attendance/sessions", response_model=list[AttendanceSessionOut])
async def list_attendance_sessions(
    user: User = Depends(require_faculty),
    db: AsyncSession = Depends(get_db),
) -> list[AttendanceSessionOut]:
    """Lists past recorded attendance sessions."""
    return await academic_service.list_attendance_sessions(db)


@router.post(
    "/attendance/sessions",
    response_model=AttendanceSessionOut,
    status_code=status.HTTP_201_CREATED,
)
async def record_attendance_session(
    payload: AttendanceSessionCreateIn,
    user: User = Depends(require_faculty),
    db: AsyncSession = Depends(get_db),
) -> AttendanceSessionOut:
    """Records attendance for a lecture session with student status list."""
    return await academic_service.record_attendance_session(db, user.id, payload)


# --- Student Roster Directory ---

@router.get("/students", response_model=list[StudentRosterItemOut])
async def get_student_roster(
    user: User = Depends(require_faculty),
    db: AsyncSession = Depends(get_db),
) -> list[StudentRosterItemOut]:
    """Returns full student directory with enrollment, attendance, and assignment metrics."""
    return await academic_service.get_student_roster(db)
