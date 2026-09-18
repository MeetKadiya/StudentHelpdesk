"""Aggregates all v1 route modules under a single router."""

from fastapi import APIRouter

from app.api.v1 import (
    academic,
    admin,
    auth,
    chat,
    clerk,
    emails,
    faculty,
    health,
    payments,
    tickets,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(tickets.router, prefix="/tickets", tags=["tickets"])
api_router.include_router(clerk.router, prefix="/clerk", tags=["clerk"])
api_router.include_router(faculty.router, prefix="/faculty/tickets", tags=["faculty"])
api_router.include_router(academic.router, prefix="/faculty/academic", tags=["faculty-academic"])
api_router.include_router(academic.router, prefix="/academic", tags=["academic"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(emails.router, prefix="/emails", tags=["emails"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
