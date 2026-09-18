import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.db.models.message import Message
from app.db.models.ticket import Ticket
from app.db.models.user import User
from app.schemas.clerk import (
    ClerkForwardIn,
    ClerkRespondIn,
    ClerkStatsOut,
    ClerkTicketDetailOut,
    ClerkTicketOut,
)
from app.schemas.ticket import MessageOut


async def list_clerk_tickets(
    db: AsyncSession,
    branch: str | None = None,
    semester: str | None = None,
    status_filter: str | None = None,
    forwarded_to: str | None = None,
) -> list[ClerkTicketOut]:
    student_alias = aliased(User)
    faculty_alias = aliased(User)

    query = (
        select(
            Ticket,
            student_alias.email.label("student_email"),
            faculty_alias.email.label("faculty_email"),
        )
        .outerjoin(student_alias, Ticket.student_id == student_alias.id)
        .outerjoin(faculty_alias, Ticket.assigned_faculty_id == faculty_alias.id)
    )

    if branch:
        query = query.where(Ticket.branch == branch)
    if semester:
        query = query.where(Ticket.semester == semester)
    if status_filter:
        query = query.where(Ticket.status == status_filter)
    if forwarded_to:
        query = query.where(Ticket.forwarded_to == forwarded_to)

    query = query.order_by(Ticket.created_at.desc())
    result = await db.execute(query)
    rows = result.all()

    output = []
    for ticket, student_email, faculty_email in rows:
        output.append(
            ClerkTicketOut(
                id=ticket.id,
                student_id=ticket.student_id,
                student_email=student_email,
                subject=ticket.subject,
                status=ticket.status,
                category=ticket.category,
                branch=ticket.branch,
                semester=ticket.semester,
                forwarded_to=ticket.forwarded_to,
                clerk_notes=ticket.clerk_notes,
                assigned_faculty_id=ticket.assigned_faculty_id,
                assigned_faculty_email=faculty_email,
                created_at=ticket.created_at,
                updated_at=ticket.updated_at,
            )
        )
    return output


async def get_clerk_ticket_detail(
    db: AsyncSession, ticket_id: uuid.UUID
) -> ClerkTicketDetailOut | None:
    ticket = await db.get(Ticket, ticket_id)
    if not ticket:
        return None

    student = await db.get(User, ticket.student_id)
    faculty = await db.get(User, ticket.assigned_faculty_id) if ticket.assigned_faculty_id else None

    messages_result = await db.execute(
        select(Message).where(Message.ticket_id == ticket_id).order_by(Message.created_at.asc())
    )
    messages = messages_result.scalars().all()

    return ClerkTicketDetailOut(
        id=ticket.id,
        student_id=ticket.student_id,
        student_email=student.email if student else None,
        subject=ticket.subject,
        status=ticket.status,
        category=ticket.category,
        branch=ticket.branch,
        semester=ticket.semester,
        forwarded_to=ticket.forwarded_to,
        clerk_notes=ticket.clerk_notes,
        assigned_faculty_id=ticket.assigned_faculty_id,
        assigned_faculty_email=faculty.email if faculty else None,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        messages=[MessageOut.model_validate(m) for m in messages],
    )


async def forward_ticket(
    db: AsyncSession,
    ticket_id: uuid.UUID,
    clerk_user: User,
    payload: ClerkForwardIn,
) -> ClerkTicketDetailOut | None:
    ticket = await db.get(Ticket, ticket_id)
    if not ticket:
        return None

    if payload.target_role == "faculty":
        ticket.forwarded_to = "faculty"
        if payload.assigned_faculty_id:
            ticket.assigned_faculty_id = payload.assigned_faculty_id
        else:
            first_fac = await db.scalar(select(User).where(User.role == "faculty"))
            if first_fac:
                ticket.assigned_faculty_id = first_fac.id
    elif payload.target_role == "admin":
        ticket.forwarded_to = "admin"
        first_admin = await db.scalar(select(User).where(User.role == "admin"))
        if first_admin:
            ticket.assigned_faculty_id = first_admin.id

    if payload.branch:
        ticket.branch = payload.branch
    if payload.semester:
        ticket.semester = payload.semester

    ticket.clerk_notes = payload.clerk_notes
    ticket.status = "in_progress"

    destination_title = (
        "Faculty Authority" if payload.target_role == "faculty" else "Administration Authority"
    )
    forward_message_content = (
        f"📋 **Official Clerk Desk Forwarding Note**\n\n"
        f"• **Forwarded To**: {destination_title}\n"
        f"• **Branch**: {ticket.branch or 'General'}\n"
        f"• **Semester**: {ticket.semester or 'N/A'}\n"
        f"• **Handling Clerk**: {clerk_user.email}\n"
        f"• **Forwarding Instructions / Rationale**:\n{payload.clerk_notes}"
    )

    message = Message(
        ticket_id=ticket.id,
        sender_type="clerk",
        sender_id=clerk_user.id,
        content=forward_message_content,
    )
    db.add(message)

    await db.commit()
    await db.refresh(ticket)
    return await get_clerk_ticket_detail(db, ticket_id)


async def respond_to_ticket(
    db: AsyncSession,
    ticket_id: uuid.UUID,
    clerk_user: User,
    payload: ClerkRespondIn,
) -> ClerkTicketDetailOut | None:
    ticket = await db.get(Ticket, ticket_id)
    if not ticket:
        return None

    if payload.status:
        ticket.status = payload.status

    message = Message(
        ticket_id=ticket.id,
        sender_type="clerk",
        sender_id=clerk_user.id,
        content=payload.content,
    )
    db.add(message)

    await db.commit()
    await db.refresh(ticket)
    return await get_clerk_ticket_detail(db, ticket_id)


async def get_clerk_stats(db: AsyncSession) -> ClerkStatsOut:
    tickets_res = await db.execute(select(Ticket))
    all_tickets = tickets_res.scalars().all()

    total = len(all_tickets)
    pending = sum(1 for t in all_tickets if t.status == "open")
    forwarded_fac = sum(1 for t in all_tickets if t.forwarded_to == "faculty")
    forwarded_adm = sum(1 for t in all_tickets if t.forwarded_to == "admin")
    resolved = sum(1 for t in all_tickets if t.status == "resolved")

    by_branch: dict[str, int] = {}
    by_semester: dict[str, int] = {}

    for t in all_tickets:
        b = t.branch or "General / Unassigned"
        by_branch[b] = by_branch.get(b, 0) + 1

        s = t.semester or "Unassigned"
        by_semester[s] = by_semester.get(s, 0) + 1

    return ClerkStatsOut(
        total_tickets=total,
        pending_tickets=pending,
        forwarded_to_faculty=forwarded_fac,
        forwarded_to_admin=forwarded_adm,
        resolved_tickets=resolved,
        by_branch=by_branch,
        by_semester=by_semester,
    )


async def list_faculty_members(db: AsyncSession) -> list[dict[str, str]]:
    result = await db.execute(select(User).where(User.role == "faculty"))
    faculty_list = result.scalars().all()
    return [{"id": str(f.id), "email": f.email} for f in faculty_list]
