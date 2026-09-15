/**
 * API client for the Campus AI Chatbot.
 */
import { apiFetch } from "@/lib/api/client";

export interface ChatAction {
  label: string;
  action_type:
    | "navigate"
    | "open_service"
    | "create_ticket"
    | "pay_fees"
    | "download_hall_ticket"
    | "view_attendance";
  target?: string;
  payload?: Record<string, unknown>;
}

export interface ChatMessageItem {
  id?: string;
  sender: "user" | "assistant";
  content: string;
  timestamp?: string;
  actions?: ChatAction[];
  suggested_queries?: string[];
}

export interface ChatRequest {
  message: string;
  history?: ChatMessageItem[];
  user_context?: Record<string, unknown>;
}

export interface ChatResponse {
  reply: string;
  category: string;
  confidence: number;
  actions: ChatAction[];
  suggested_queries: string[];
}

export async function sendChatMessage(
  message: string,
  history: ChatMessageItem[] = [],
  accessToken?: string | null
): Promise<ChatResponse> {
  return apiFetch<ChatResponse>("/chat", {
    method: "POST",
    body: {
      message,
      history: history.map((h) => ({
        sender: h.sender,
        content: h.content,
        timestamp: h.timestamp,
      })),
    },
    accessToken: accessToken || undefined,
  });
}
