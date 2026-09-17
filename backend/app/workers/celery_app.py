"""Celery worker application entrypoint for the backend service.

Used by docker-compose's celery-worker and email-worker services.
"""

from __future__ import annotations

import logging

from celery import Celery

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

celery_app = Celery(
    "helpdesk_backend",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_default_queue="default",
    task_track_started=True,
    broker_connection_retry_on_startup=False,
    broker_connection_max_retries=0,
    task_routes={
        "app.workers.send_email_notification": {"queue": "email"},
    },
)


import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

@celery_app.task(name="app.workers.send_email_notification", queue="email")
def send_email_notification(to_email: str, subject: str, body: str) -> dict:
    """Task for asynchronous email delivery via the email worker queue."""
    logger.info("==================================================")
    logger.info("[EMAIL NOTIFICATION DISPATCHED]")
    logger.info("Recipient: %s", to_email)
    logger.info("Subject: %s", subject)
    logger.info("Content:\n%s", body)
    logger.info("==================================================")

    smtp_host = os.getenv("SMTP_HOST")
    if smtp_host:
        try:
            smtp_port = int(os.getenv("SMTP_PORT", "587"))
            smtp_user = os.getenv("SMTP_USER", "")
            smtp_pass = os.getenv("SMTP_PASSWORD", "")
            sender = os.getenv("EMAILS_FROM_EMAIL", "helpdesk@university.edu")

            msg = MIMEMultipart()
            msg["From"] = sender
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "plain"))

            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                if os.getenv("SMTP_TLS", "true").lower() in ("true", "1"):
                    server.starttls()
                if smtp_user and smtp_pass:
                    server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            logger.info("Successfully delivered email via SMTP %s to %s", smtp_host, to_email)
        except Exception as err:
            logger.warning("SMTP delivery failed (logged to worker queue instead): %s", err)

    return {"status": "sent", "to": to_email, "subject": subject}


