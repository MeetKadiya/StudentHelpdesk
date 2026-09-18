"""Email service handling direct communication from Faculty and Admin to Students, with live SMTP delivery."""

import contextlib
import logging
import os
import smtplib
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.email_message import EmailMessage
from app.db.models.smtp_config import SmtpConfiguration
from app.db.models.user import User
from app.schemas.email import BroadcastEmailResultOut, SmtpConfigIn, SmtpConfigOut
from app.workers.celery_app import send_email_notification

logger = logging.getLogger(__name__)


class EmailServiceError(Exception):
    """Raised on invalid email operation."""


async def get_or_create_smtp_config(db: AsyncSession) -> SmtpConfiguration:
    config = await db.scalar(select(SmtpConfiguration).order_by(SmtpConfiguration.updated_at.desc()).limit(1))
    if not config:
        config = SmtpConfiguration(
            smtp_host=os.getenv("SMTP_HOST", ""),
            smtp_port=int(os.getenv("SMTP_PORT", "587")),
            smtp_user=os.getenv("SMTP_USER", ""),
            smtp_password=os.getenv("SMTP_PASSWORD", ""),
            smtp_tls=os.getenv("SMTP_TLS", "true").lower() in ("true", "1"),
            from_email=os.getenv("EMAILS_FROM_EMAIL", ""),
            from_name="University Faculty & Academic Advising",
            is_active=bool(os.getenv("SMTP_HOST") and os.getenv("SMTP_USER") and os.getenv("SMTP_PASSWORD")),
            last_status="Pending Configuration",
        )
        db.add(config)
        await db.commit()
        await db.refresh(config)
    return config


async def get_smtp_config_out(db: AsyncSession) -> SmtpConfigOut:
    config = await get_or_create_smtp_config(db)
    return SmtpConfigOut(
        id=config.id,
        smtp_host=config.smtp_host,
        smtp_port=config.smtp_port,
        smtp_user=config.smtp_user,
        has_password=bool(config.smtp_password),
        smtp_tls=config.smtp_tls,
        from_email=config.from_email,
        from_name=config.from_name,
        is_active=config.is_active,
        last_status=config.last_status,
        last_tested_at=config.last_tested_at,
    )


async def update_smtp_config(db: AsyncSession, data: SmtpConfigIn) -> SmtpConfigOut:
    config = await get_or_create_smtp_config(db)
    config.smtp_host = data.smtp_host.strip()
    config.smtp_port = data.smtp_port
    config.smtp_user = data.smtp_user.strip()
    if data.smtp_password is not None and data.smtp_password != "":
        # Remove any spaces commonly added in 16-character Google App Passwords
        config.smtp_password = data.smtp_password.replace(" ", "").strip()
    config.smtp_tls = data.smtp_tls
    config.from_email = (data.from_email or data.smtp_user).strip()
    config.from_name = data.from_name.strip()
    config.is_active = data.is_active
    config.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(config)
    return await get_smtp_config_out(db)


def _format_smtp_error(exc: Exception) -> str:
    err_str = str(exc)
    if "535" in err_str or "BadCredentials" in err_str or "Username and Password not accepted" in err_str:
        return "Authentication failed (535 Bad Credentials). For Gmail, generate a 16-character App Password at https://myaccount.google.com/apppasswords"
    if "Connection refused" in err_str:
        return "Connection refused by SMTP server. Verify host and port."
    if "timed out" in err_str.lower():
        return "SMTP connection timed out. Verify host network and firewall settings."
    return err_str[:120]


def _build_email_mime(
    sender_email: str,
    sender_name: str,
    recipient_email: str,
    subject: str,
    body: str,
) -> MIMEMultipart:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{sender_name} <{sender_email}>" if sender_name else sender_email
    msg["To"] = recipient_email

    # Plain text version
    msg.attach(MIMEText(body, "plain", "utf-8"))

    # HTML formatted version
    html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #1e1b4b; color: white; padding: 18px 24px; border-radius: 12px 12px 0 0;">
    <h2 style="margin: 0; font-size: 18px;">University HelpDesk & Academic Advising</h2>
    <p style="margin: 4px 0 0; font-size: 12px; color: #c7d2fe;">Official Faculty & Campus Communication</p>
  </div>
  <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px; background: #ffffff;">
    <h3 style="margin-top: 0; color: #0f172a; font-size: 16px;">{subject}</h3>
    <div style="background: #f8fafc; border-left: 4px solid #4f46e5; padding: 14px 18px; margin: 16px 0; border-radius: 4px; white-space: pre-wrap; font-size: 14px;">
{body}
    </div>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
    <p style="font-size: 11px; color: #64748b; margin: 0;">
      This is an official communication dispatched from the University Student HelpDesk System.
      You can also view this notice directly in your student portal at <a href="http://localhost/inbox" style="color: #4f46e5;">http://localhost/inbox</a>.
    </p>
  </div>
</body>
</html>"""
    msg.attach(MIMEText(html_body, "html", "utf-8"))
    return msg


def _deliver_smtp_message(
    host: str,
    port: int,
    user: str,
    password: str,
    use_tls: bool,
    sender_email: str,
    sender_name: str,
    recipient_email: str,
    subject: str,
    body: str,
) -> tuple[bool, str]:
    """Synchronous single-message SMTP delivery helper."""
    password = password.replace(" ", "").strip()
    msg = _build_email_mime(sender_email, sender_name, recipient_email, subject, body)

    try:
        if port == 465:
            server = smtplib.SMTP_SSL(host, port, timeout=12)
        else:
            server = smtplib.SMTP(host, port, timeout=12)

        with server:
            if port != 465 and use_tls:
                server.starttls()
            if user and password:
                server.login(user, password)
            server.send_message(msg)
        return True, "Delivered to real mailbox via SMTP"
    except Exception as exc:  # noqa: BLE001
        formatted_err = _format_smtp_error(exc)
        logger.warning("SMTP direct delivery failed: %s", formatted_err)
        return False, formatted_err


async def test_smtp_connection(db: AsyncSession, test_recipient: str) -> dict:
    config = await get_or_create_smtp_config(db)
    if not config.smtp_host or not config.smtp_user or not config.smtp_password:
        raise EmailServiceError("SMTP configuration is incomplete. Host, username, and password/app password are required.")

    sender = config.from_email or config.smtp_user
    success, msg = _deliver_smtp_message(
        host=config.smtp_host,
        port=config.smtp_port,
        user=config.smtp_user,
        password=config.smtp_password,
        use_tls=config.smtp_tls,
        sender_email=sender,
        sender_name=config.from_name,
        recipient_email=test_recipient,
        subject="[HelpDesk SMTP Test] Connection Verification Successful",
        body=f"""Hello,

This is a live test message from the University HelpDesk System.
Your SMTP connection to {config.smtp_host} was verified successfully at {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}.

Outbound email delivery to real student mailboxes is active and functioning correctly!""",
    )

    config.last_tested_at = datetime.now(timezone.utc)
    config.last_status = "Connection verified" if success else f"Error: {msg[:100]}"
    if success:
        config.is_active = True
    await db.commit()

    return {
        "success": success,
        "message": msg,
        "host": config.smtp_host,
        "recipient": test_recipient,
    }


async def send_email_to_student(
    db: AsyncSession,
    sender: User,
    recipient_email: str,
    subject: str,
    body: str,
) -> EmailMessage:
    if sender.role not in ("faculty", "admin"):
        raise EmailServiceError("Only faculty and admin can send direct emails to students.")

    # Check if recipient is a registered user
    recipient = await db.scalar(select(User).where(User.email == recipient_email))
    recipient_id = recipient.id if recipient else None

    # Retrieve SMTP settings
    smtp_config = await get_or_create_smtp_config(db)
    delivery_status = "portal_inbox_only"

    # Attempt live SMTP delivery if active and configured
    if smtp_config.is_active and smtp_config.smtp_host and smtp_config.smtp_user and smtp_config.smtp_password:
        from_addr = smtp_config.from_email or smtp_config.smtp_user
        from_lbl = f"{sender.email} via {smtp_config.from_name}"
        ok, res_msg = _deliver_smtp_message(
            host=smtp_config.smtp_host,
            port=smtp_config.smtp_port,
            user=smtp_config.smtp_user,
            password=smtp_config.smtp_password,
            use_tls=smtp_config.smtp_tls,
            sender_email=from_addr,
            sender_name=from_lbl,
            recipient_email=recipient_email,
            subject=f"[{sender.role.upper()} NOTICE] {subject}",
            body=f"""Official Notice from {sender.email} ({sender.role.upper()}):

{body}

---
University HelpDesk & Academic Advising System
Portal Inbox: http://localhost/inbox""",
        )
        if ok:
            delivery_status = "delivered_smtp"
        else:
            delivery_status = f"smtp_error: {res_msg}"
    else:
        delivery_status = "portal_inbox_only"

    email_record = EmailMessage(
        sender_id=sender.id,
        sender_email=sender.email,
        sender_role=sender.role,
        recipient_email=recipient_email,
        recipient_id=recipient_id,
        subject=subject,
        body=body,
        status=delivery_status,
    )
    db.add(email_record)
    await db.commit()
    await db.refresh(email_record)

    # Queue background task for Celery logging
    try:
        send_email_notification.apply_async(
            args=[recipient_email, f"[{sender.role.upper()} NOTICE] {subject}", body],
            queue="email"
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Celery enqueue fallback warning: %s", exc)

    return email_record


async def send_broadcast_email(
    db: AsyncSession,
    sender: User,
    subject: str,
    body: str,
    target_group: str = "all_students",
) -> BroadcastEmailResultOut:
    """Dispatches a broadcast announcement to all registered students."""
    if sender.role not in ("faculty", "admin"):
        raise EmailServiceError("Only faculty and admin can send group announcement emails.")

    # Retrieve all registered student accounts
    students = (await db.execute(select(User).where(User.role == "student"))).scalars().all()
    if not students:
        raise EmailServiceError("No registered students found in the database to broadcast to.")

    smtp_config = await get_or_create_smtp_config(db)
    is_smtp_ready = bool(
        smtp_config.is_active and
        smtp_config.smtp_host and
        smtp_config.smtp_user and
        smtp_config.smtp_password
    )

    delivered_smtp_count = 0
    failed_smtp_count = 0
    portal_saved_count = 0
    recipient_emails = [s.email for s in students]

    # Pre-open SMTP connection for batch delivery if configured
    smtp_server = None
    smtp_global_error = None
    if is_smtp_ready:
        try:
            clean_pwd = smtp_config.smtp_password.replace(" ", "").strip()
            if smtp_config.smtp_port == 465:
                smtp_server = smtplib.SMTP_SSL(smtp_config.smtp_host, smtp_config.smtp_port, timeout=15)
            else:
                smtp_server = smtplib.SMTP(smtp_config.smtp_host, smtp_config.smtp_port, timeout=15)
                if smtp_config.smtp_tls:
                    smtp_server.starttls()
            if smtp_config.smtp_user and clean_pwd:
                smtp_server.login(smtp_config.smtp_user, clean_pwd)
        except Exception as exc:  # noqa: BLE001
            smtp_global_error = _format_smtp_error(exc)
            logger.warning("SMTP session setup failed for broadcast: %s", smtp_global_error)
            smtp_server = None

    from_addr = smtp_config.from_email or smtp_config.smtp_user
    from_lbl = f"{sender.email} via {smtp_config.from_name}"

    email_records = []
    for student in students:
        student_status = "portal_inbox_only"
        if smtp_server is not None:
            try:
                mime = _build_email_mime(
                    sender_email=from_addr,
                    sender_name=from_lbl,
                    recipient_email=student.email,
                    subject=f"[{sender.role.upper()} ANNOUNCEMENT] {subject}",
                    body=f"""Official Group Announcement from {sender.email} ({sender.role.upper()}):

{body}

---
University HelpDesk & Academic Advising System
Portal Inbox: http://localhost/inbox""",
                )
                smtp_server.send_message(mime)
                student_status = "delivered_smtp"
                delivered_smtp_count += 1
            except Exception as item_err:  # noqa: BLE001
                formatted_item_err = _format_smtp_error(item_err)
                student_status = f"smtp_error: {formatted_item_err}"
                failed_smtp_count += 1
        elif smtp_global_error:
            student_status = f"smtp_error: {smtp_global_error}"
            failed_smtp_count += 1
        else:
            student_status = "portal_inbox_only"
            portal_saved_count += 1

        record = EmailMessage(
            sender_id=sender.id,
            sender_email=sender.email,
            sender_role=sender.role,
            recipient_email=student.email,
            recipient_id=student.id,
            subject=f"[ANNOUNCEMENT] {subject}",
            body=body,
            status=student_status,
        )
        email_records.append(record)

    if smtp_server is not None:
        with contextlib.suppress(Exception):
            smtp_server.quit()

    # Save all messages in bulk to PostgreSQL so all students see it in /inbox
    db.add_all(email_records)
    await db.commit()

    # Queue background task for Celery logging
    for r in email_records:
        with contextlib.suppress(Exception):
            send_email_notification.apply_async(
                args=[r.recipient_email, r.subject, r.body],
                queue="email",
            )

    if delivered_smtp_count > 0:
        status_summary = f"Delivered to {delivered_smtp_count} real student mailboxes via SMTP and stored in {len(students)} portal inboxes."
    elif failed_smtp_count > 0:
        status_summary = f"Stored in {len(students)} portal inboxes. SMTP delivery failed for {failed_smtp_count} recipients ({smtp_global_error or 'bad credentials'})."
    else:
        status_summary = f"Saved in all {len(students)} student portal inboxes. (SMTP not configured for external delivery)."

    return BroadcastEmailResultOut(
        total_recipients=len(students),
        delivered_smtp_count=delivered_smtp_count,
        portal_saved_count=len(students),
        failed_smtp_count=failed_smtp_count,
        recipient_emails=recipient_emails,
        subject=subject,
        status_summary=status_summary,
    )


async def list_sent_emails(db: AsyncSession, sender: User) -> list[EmailMessage]:
    """Lists emails sent by the user (or all if admin)."""
    if sender.role == "admin":
        result = await db.scalars(select(EmailMessage).order_by(EmailMessage.created_at.desc()).limit(100))
    else:
        result = await db.scalars(
            select(EmailMessage)
            .where(EmailMessage.sender_id == sender.id)
            .order_by(EmailMessage.created_at.desc())
            .limit(100)
        )
    return list(result)


async def list_inbox_emails(db: AsyncSession, current_user: User) -> list[EmailMessage]:
    """Lists emails received by the current student/user."""
    result = await db.scalars(
        select(EmailMessage)
        .where(
            (EmailMessage.recipient_email == current_user.email)
            | (EmailMessage.recipient_id == current_user.id)
        )
        .order_by(EmailMessage.created_at.desc())
    )
    return list(result)


async def list_students_directory(db: AsyncSession) -> list[User]:
    """Returns registered students for recipient selection."""
    result = await db.scalars(
        select(User).where(User.role == "student").order_by(User.email)
    )
    return list(result)
