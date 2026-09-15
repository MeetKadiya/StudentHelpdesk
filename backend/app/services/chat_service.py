"""Campus Reasoning & Conversational Engine for AI Assistant."""

from __future__ import annotations

import re
from typing import Any
from app.schemas.chat import ChatAction, ChatRequest, ChatResponse


def process_chat_message(request: ChatRequest, user_email: str | None = None) -> ChatResponse:
    query = request.message.lower().strip()

    # 1. Fee Payments, Billing, Receipts & Accounts
    if any(k in query for k in ["fee", "fees", "pay", "dues", "invoice", "receipt", "tuition", "cost", "installment"]):
        return ChatResponse(
            reply=(
                "**Student Accounts & Fee Payments Guide**:\n\n"
                "• **Current Term**: Spring Semester 2026\n"
                "• **Payment Deadline**: October 15, 2026 (without late fee surcharge).\n"
                "• **Accepted Methods**: Instant NetBanking, UPI, Debit/Credit Card via the Bursar Payment Gateway.\n"
                "• **Receipts**: Every successful transaction automatically generates an attested PDF receipt with an institutional verification QR code.\n\n"
                "You can view your itemized fee invoice and download verified receipts directly below."
            ),
            category="financial_aid_billing",
            confidence=0.98,
            actions=[
                ChatAction(
                    label="💳 Pay Fees & View Invoice",
                    action_type="pay_fees",
                    target="/fees/history",
                ),
                ChatAction(
                    label="🧾 Download Past Receipts",
                    action_type="navigate",
                    target="/fees/history",
                ),
            ],
            suggested_queries=[
                "What happens if I miss the fee deadline?",
                "Can I pay in two installments?",
                "How to remove financial hold?",
            ],
        )

    # 2. Examination, Hall Ticket, Seating & Marksheet
    if any(k in query for k in ["exam", "hall ticket", "admit card", "result", "grade", "marks", "spi", "cpi", "cgpa", "re-evaluation", "recheck"]):
        if any(k in query for k in ["hall ticket", "admit card"]):
            return ChatResponse(
                reply=(
                    "**Examination Hall Ticket Verification**:\n\n"
                    "• **Session**: Spring 2026 End-Semester Examinations\n"
                    "• **Commencement Date**: October 24, 2026\n"
                    "• **Eligibility**: Students with ≥ 75% overall attendance and cleared fee accounts.\n"
                    "• **Important**: You must carry a printed physical copy of this Hall Ticket along with your official Student ID Card to the exam hall.\n\n"
                    "Click below to generate and download your verified Hall Ticket."
                ),
                category="academic",
                confidence=0.99,
                actions=[
                    ChatAction(
                        label="🎫 Download Exam Hall Ticket",
                        action_type="download_hall_ticket",
                        target="/exam",
                    ),
                    ChatAction(
                        label="📅 View Exam Time-Table",
                        action_type="navigate",
                        target="/exam",
                    ),
                ],
                suggested_queries=[
                    "What is the exam seating arrangement?",
                    "How to apply for supplementary exams?",
                    "What are the exam hall rules?",
                ],
            )

        return ChatResponse(
            reply=(
                "**Examinations & Provisional Results**:\n\n"
                "• **Semester 6 Marksheets**: Provisional Results and SPI/CPI scorecards are available online.\n"
                "• **Attestation**: Digital grade cards carry university controller verification.\n"
                "• **Re-evaluation Window**: Students may apply for paper re-evaluation or mark attestation within 14 calendar days of score publication.\n\n"
                "Select an option below to view your marksheet or review upcoming exam schedules."
            ),
            category="academic",
            confidence=0.96,
            actions=[
                ChatAction(
                    label="📊 View Provisional Result",
                    action_type="navigate",
                    target="/exam/results",
                ),
                ChatAction(
                    label="🎫 Examination Hub & Hall Ticket",
                    action_type="navigate",
                    target="/exam",
                ),
            ],
            suggested_queries=[
                "How is CPI calculated?",
                "Download Exam Hall Ticket",
                "Apply for paper re-checking",
            ],
        )

    # 3. Attendance, Class Matrix & Shortage Rules
    if any(k in query for k in ["attendance", "present", "absent", "leave", "shortage", "classes attended"]):
        return ChatResponse(
            reply=(
                "**University Attendance Regulations**:\n\n"
                "• **Mandatory Requirement**: Minimum **75% overall attendance** is required across theory and practical modules to be eligible for end-semester exams.\n"
                "• **Medical Leave Policy**: Medical certificates must be submitted to the Registrar Office within 5 working days of resuming classes.\n"
                "• **Real-Time Tracking**: Attendance is updated daily by course faculty following each lecture slot.\n\n"
                "You can inspect your subject-wise theory/practical breakdown or datewise attendance below."
            ),
            category="academic",
            confidence=0.97,
            actions=[
                ChatAction(
                    label="📅 Datewise Attendance Matrix",
                    action_type="view_attendance",
                    target="/attendance/datewise",
                ),
                ChatAction(
                    label="📈 Overall Subject Attendance",
                    action_type="navigate",
                    target="/attendance",
                ),
            ],
            suggested_queries=[
                "What happens if my attendance is below 75%?",
                "How to submit a medical absence certificate?",
                "Who updates lecture attendance?",
            ],
        )

    # 4. Lecture Timetable & Daily Schedule
    if any(k in query for k in ["timetable", "schedule", "class", "classes", "lecture", "period", "routine"]):
        return ChatResponse(
            reply=(
                "**Weekly Academic Timetable & Lecture Schedule**:\n\n"
                "• **Daily Schedule Hours**: 09:35 AM – 04:35 PM (Monday through Friday).\n"
                "• **Core Lecture Modules**: Operating Systems (Hall B-201), Machine Learning (Hall B-202), Cloud Computing Lab (Lab 4).\n"
                "• **Lunch Recess**: 12:35 PM – 01:35 PM daily.\n\n"
                "You can inspect your complete interactive weekly timetable on your dashboard."
            ),
            category="academic",
            confidence=0.95,
            actions=[
                ChatAction(
                    label="🗓️ View Full Timetable",
                    action_type="navigate",
                    target="/",
                ),
            ],
            suggested_queries=[
                "Where is Hall B-201 located?",
                "Check today's lecture schedule",
                "When is the Cloud Lab session?",
            ],
        )

    # 5. Certificates, Bonafide & Transcripts
    if any(k in query for k in ["certificate", "bonafide", "transcript", "letter", "enrollment verification", "visa", "passport"]):
        return ChatResponse(
            reply=(
                "**Registrar & Student Documentation Cell**:\n\n"
                "• **Instant Bonafide Certificate**: Generated instantly with institutional QR verification for passport, education loans, and transit passes.\n"
                "• **Official Transcripts**: Available within 2 business days upon digital request.\n"
                "• **Office Location**: Student Services Center, Block B, Room 102 (Mon–Fri, 9:00 AM – 4:30 PM).\n\n"
                "Click below to generate an instant verified certificate."
            ),
            category="admissions_enrollment",
            confidence=0.97,
            actions=[
                ChatAction(
                    label="📜 Generate Instant Bonafide Certificate",
                    action_type="open_service",
                    target="registrar-records",
                ),
            ],
            suggested_queries=[
                "How long is a bonafide certificate valid?",
                "How to order duplicate student ID card?",
                "Get enrollment letter for bank loan",
            ],
        )

    # 6. Faculty Advising & Office Hours
    if any(k in query for k in ["faculty", "professor", "teacher", "advisor", "office hours", "consultation", "appointment", "cabin", "room 412"]):
        return ChatResponse(
            reply=(
                "**Faculty Academic Advising & Office Hours**:\n\n"
                "• **Department**: Computing & Information Technologies\n"
                "• **Faculty Office**: Block C · Room 412\n"
                "• **Walk-in Consultation Hours**: Tuesday & Thursday from 2:00 PM – 4:00 PM\n"
                "• **Online Advising**: Submit your question as a routed inquiry; faculty responds within 4 business hours.\n\n"
                "Would you like to submit a direct inquiry to your course faculty?"
            ),
            category="academic",
            confidence=0.96,
            actions=[
                ChatAction(
                    label="📩 Submit Inquiry to Faculty Desk",
                    action_type="create_ticket",
                    target="/tickets",
                ),
                ChatAction(
                    label="🏛️ Academic Advising Service",
                    action_type="open_service",
                    target="academic-advising",
                ),
            ],
            suggested_queries=[
                "Book 1-on-1 advisor appointment",
                "How to request course add/drop?",
                "Find my course instructor email",
            ],
        )

    # 7. Wi-Fi, IT Support & Campus Infrastructure
    if any(k in query for k in ["wifi", "wi-fi", "internet", "network", "password reset", "login issue", "it support", "laptop", "lab"]):
        return ChatResponse(
            reply=(
                "**Campus IT Services & Network Support**:\n\n"
                "• **Campus Wi-Fi**: Connect to network SSID `Campus-Student-Secure` using your institutional email credentials.\n"
                "• **Self-Service**: Password resets can be initiated anytime from the portal login recovery link.\n"
                "• **HelpDesk Counter**: Administration Tower, Room 204 (Mon–Fri, 8:30 AM – 6:00 PM).\n"
                "• **Emergency IT**: Call extension `4402` or open an IT support inquiry below."
            ),
            category="it_support",
            confidence=0.98,
            actions=[
                ChatAction(
                    label="💻 Open IT Support Request",
                    action_type="open_service",
                    target="it-helpdesk",
                ),
            ],
            suggested_queries=[
                "How to register a new laptop for campus Wi-Fi?",
                "Reset university account password",
                "Access campus cloud lab servers",
            ],
        )

    # 8. Greetings & General Inquiries
    if any(k in query for k in ["hi", "hello", "hey", "good morning", "good afternoon", "who are you", "help"]):
        return ChatResponse(
            reply=(
                "Hello! 👋 I'm your **University AI Campus Assistant**.\n\n"
                "I can instantly answer questions and assist you with:\n"
                "• 📅 Lecture schedules & timetables\n"
                "• 📈 Attendance monitoring & shortage rules\n"
                "• 💳 Tuition fee invoices & receipts\n"
                "• 🎫 Exam hall tickets & provisional results\n"
                "• 📜 Instant Bonafide certificates & transcripts\n"
                "• 👨‍🏫 Faculty office hours & departmental routing\n\n"
                "What would you like to explore or resolve right now?"
            ),
            category="general",
            confidence=0.99,
            actions=[
                ChatAction(label="💳 Check Fee Dues", action_type="pay_fees", target="/fees/history"),
                ChatAction(label="🎫 Download Hall Ticket", action_type="download_hall_ticket", target="/exam"),
                ChatAction(label="📅 View Attendance", action_type="view_attendance", target="/attendance/datewise"),
            ],
            suggested_queries=[
                "When is my next class?",
                "How do I pay my semester fees?",
                "Where can I download my exam hall ticket?",
                "How to contact my faculty advisor?",
            ],
        )

    # Fallback: General campus intelligence with 1-click ticket creation
    return ChatResponse(
        reply=(
            f"I analyzed your question regarding *\"{request.message}\"*. "
            "To give you the most accurate and official institutional guidance, would you like me to connect you directly with the concerned university department or course faculty?"
        ),
        category="general",
        confidence=0.85,
        actions=[
            ChatAction(
                label="📝 Submit Official Inquiry to Faculty / Desk",
                action_type="create_ticket",
                target="/tickets",
                payload={"subject": request.message, "category": "general"},
            ),
            ChatAction(
                label="🏛️ Browse Campus Services Directory",
                action_type="navigate",
                target="/services",
            ),
        ],
        suggested_queries=[
            "Check my semester fee dues",
            "When is the next exam?",
            "What is the minimum attendance requirement?",
            "How to get a Bonafide Certificate?",
        ],
    )
