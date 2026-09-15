"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { sendChatMessage, type ChatAction, type ChatMessageItem } from "@/lib/api/chat";
import { CAMPUS_SERVICES, getDynamicStudentProfile, type CampusService } from "@/data/student-services";
import { ServiceActionDialog } from "@/components/service-action-dialog";

const INITIAL_SUGGESTIONS = [
  "When is my next lecture?",
  "How do I pay my semester fees?",
  "Where can I download my exam hall ticket?",
  "What is the minimum attendance requirement?",
  "How to get a Bonafide Certificate?",
  "What are the faculty office hours?",
];

export function CampusChatbot() {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeServiceModal, setActiveServiceModal] = useState<CampusService | null>(null);

  const profile = getDynamicStudentProfile(user?.email);
  const studentName = profile.name.split(" ")[0];

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: "welcome-msg",
      sender: "assistant",
      content: `Hello **${studentName || "there"}**! 👋 I am your **Campus AI Assistant**.\n\nI can help you with lecture schedules, fee payments, attendance rules, exam hall tickets, bonafide certificates, and faculty advising.\n\nHow can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      suggested_queries: [
        "Check my fee dues",
        "When is my next lecture?",
        "Download Exam Hall Ticket",
        "View Attendance Rules",
      ],
    },
  ]);

  // Scroll to bottom whenever messages update or when chatbot opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized, isTyping]);

  async function handleSend(textToSend?: string) {
    const text = (textToSend || inputMessage).trim();
    if (!text || isTyping) return;

    setInputMessage("");

    const userMsg: ChatMessageItem = {
      id: `usr-${Date.now()}`,
      sender: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const response = await sendChatMessage(text, messages, accessToken);

      const assistantMsg: ChatMessageItem = {
        id: `ast-${Date.now()}`,
        sender: "assistant",
        content: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actions: response.actions,
        suggested_queries: response.suggested_queries,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      // Fallback friendly message if offline or backend hiccup
      const errorMsg: ChatMessageItem = {
        id: `err-${Date.now()}`,
        sender: "assistant",
        content:
          "I experienced a slight connection delay. You can check the **Campus Services Directory** or submit a direct inquiry to the student helpdesk.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actions: [
          {
            label: "🏛️ Browse Campus Services",
            action_type: "navigate",
            target: "/services",
          },
        ],
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  }

  function handleActionClick(action: ChatAction) {
    if (action.action_type === "navigate" && action.target) {
      router.push(action.target);
    } else if (action.action_type === "pay_fees") {
      const feeService = CAMPUS_SERVICES.find((s) => s.actionType === "fee_payment") || CAMPUS_SERVICES[0];
      setActiveServiceModal(feeService);
    } else if (action.action_type === "download_hall_ticket") {
      const examService = CAMPUS_SERVICES.find((s) => s.actionType === "hall_ticket") || CAMPUS_SERVICES[1];
      setActiveServiceModal(examService);
    } else if (action.action_type === "view_attendance") {
      router.push("/attendance/datewise");
    } else if (action.action_type === "open_service" && action.target) {
      const service = CAMPUS_SERVICES.find((s) => s.id === action.target) || CAMPUS_SERVICES[0];
      setActiveServiceModal(service);
    } else if (action.action_type === "create_ticket") {
      const targetUrl = action.target || "/tickets";
      router.push(targetUrl);
    }
  }

  function renderFormattedText(text: string) {
    // Simple markdown-style bold, bullet, and newline formatter
    return text.split("\n").map((line, idx) => {
      if (line.startsWith("• ") || line.startsWith("- ")) {
        const itemContent = line.slice(2);
        return (
          <li key={idx} className="ml-3 list-disc my-0.5 leading-relaxed">
            <span
              dangerouslySetInnerHTML={{
                __html: itemContent.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
              }}
            />
          </li>
        );
      }
      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }
      return (
        <p
          key={idx}
          className="leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
          }}
        />
      );
    });
  }

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          aria-label="Open AI Campus Assistant"
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 p-3.5 pr-4 text-white shadow-2xl hover:scale-105 hover:shadow-indigo-500/25 active:scale-95 transition-all duration-200 cursor-pointer ring-4 ring-white/30"
        >
          <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-lg shadow-inner">
            🤖
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-indigo-700 animate-pulse" />
          </div>
          <div className="text-left hidden sm:block">
            <span className="block text-[10px] uppercase font-bold tracking-wider text-indigo-200 leading-none">
              AI Support
            </span>
            <span className="block text-xs font-black tracking-wide leading-tight">
              Ask Campus Assistant
            </span>
          </div>
        </button>
      )}

      {/* Floating Chat Drawer Window */}
      {isOpen && (
        <div
          className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 transition-all duration-300 ${
            isMinimized
              ? "h-14 w-80 shadow-lg"
              : "h-[540px] max-h-[85vh] w-[95vw] sm:w-[410px]"
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-[#1e1b4b] to-indigo-950 p-3.5 px-4 text-white flex items-center justify-between shadow-xs select-none">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-base border border-white/20">
                🤖
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 border border-slate-900" />
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm font-bold tracking-tight">Campus AI Assistant</h3>
                  <span className="rounded-full bg-emerald-400/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-300">
                    Online
                  </span>
                </div>
                <p className="text-[10px] text-indigo-200">Instant University Advising & Help</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Minimize / Expand Button */}
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                title={isMinimized ? "Expand chat" : "Minimize chat"}
              >
                {isMinimized ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                title="Close chat"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Main Body (when not minimized) */}
          {!isMinimized && (
            <>
              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/70 text-xs scrollbar-thin">
                {messages.map((msg) => {
                  const isUser = msg.sender === "user";

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? "items-end" : "items-start"} animate-fade-in`}
                    >
                      <div
                        className={`max-w-[88%] rounded-2xl p-3 sm:p-3.5 shadow-xs ${
                          isUser
                            ? "bg-indigo-600 text-white rounded-br-xs"
                            : "bg-white text-slate-800 border border-slate-200 rounded-bl-xs"
                        }`}
                      >
                        {/* Message text */}
                        <div className="space-y-1 text-xs">{renderFormattedText(msg.content)}</div>

                        {/* Interactive Action Buttons */}
                        {msg.actions && msg.actions.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                            {msg.actions.map((act, aIdx) => (
                              <button
                                key={aIdx}
                                type="button"
                                onClick={() => handleActionClick(act)}
                                className="rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 px-2.5 py-1 text-[11px] font-bold transition-all shadow-2xs active:scale-95 cursor-pointer flex items-center gap-1"
                              >
                                {act.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Timestamp */}
                      {msg.timestamp && (
                        <span className="text-[9px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
                      )}

                      {/* Suggested query pills */}
                      {!isUser && msg.suggested_queries && msg.suggested_queries.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1 max-w-[90%]">
                          {msg.suggested_queries.map((sq, sIdx) => (
                            <button
                              key={sIdx}
                              type="button"
                              onClick={() => handleSend(sq)}
                              className="rounded-full bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10px] text-slate-600 font-medium transition-colors shadow-2xs cursor-pointer text-left"
                            >
                              💡 {sq}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex items-center gap-2 bg-white rounded-2xl p-3 max-w-[120px] border border-slate-200 shadow-xs animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-indigo-600 animate-bounce" />
                    <span className="h-2 w-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]" />
                    <span className="h-2 w-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.4s]" />
                    <span className="text-[10px] text-slate-400 font-medium ml-1">Thinking...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompt Pills Toolbar */}
              <div className="border-t border-slate-100 bg-white px-3 py-1.5 overflow-x-auto scrollbar-none flex items-center gap-1 text-[10px]">
                <span className="text-slate-400 font-bold shrink-0">Quick:</span>
                {INITIAL_SUGGESTIONS.slice(0, 3).map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(s)}
                    className="rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 px-2 py-0.5 shrink-0 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <form
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask about fees, exams, timetable, advising..."
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50/70 py-2 px-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-all shadow-inner"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isTyping}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 transition-all shadow-xs cursor-pointer"
                  title="Send message"
                >
                  <svg className="h-4 w-4 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* Embedded Service Action Modal (for 1-click Fee payment, Hall ticket generation) */}
      {activeServiceModal && (
        <ServiceActionDialog
          service={activeServiceModal}
          isOpen={true}
          onClose={() => setActiveServiceModal(null)}
        />
      )}
    </>
  );
}
