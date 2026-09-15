import { apiFetch } from "@/lib/api/client";

export interface PaymentOrderCreateIn {
  amount: number;
  fee_type?: string;
  semester?: string;
  academic_year?: string;
  notes?: string;
}

export interface PaymentOrderOut {
  order_id: string;
  amount: number;
  currency: string;
  fee_type: string;
  semester: string;
  academic_year: string;
  gateway_provider: string;
  key_id?: string | null;
}

export interface PaymentVerifyIn {
  order_id: string;
  payment_id: string;
  signature?: string | null;
  payment_method: string;
  payer_details?: string | null;
}

export interface PaymentTransactionOut {
  id: string;
  student_id: string | null;
  student_email: string;
  order_id: string;
  payment_id: string | null;
  amount: number;
  currency: string;
  fee_type: string;
  semester: string;
  academic_year: string;
  status: string;
  payment_method: string | null;
  gateway_provider: string;
  receipt_no: string | null;
  receipt_hash: string | null;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface PaymentGatewayConfigIn {
  provider: "sandbox" | "razorpay" | "stripe";
  razorpay_key_id?: string;
  razorpay_key_secret?: string;
  stripe_publishable_key?: string;
  stripe_secret_key?: string;
  is_test_mode?: boolean;
  currency?: string;
}

export interface PaymentGatewayConfigOut {
  id: string;
  provider: "sandbox" | "razorpay" | "stripe";
  razorpay_key_id: string | null;
  has_razorpay_secret: boolean;
  stripe_publishable_key: string | null;
  has_stripe_secret: boolean;
  is_test_mode: boolean;
  currency: string;
  updated_at: string;
}

export interface PaymentSummaryStatsOut {
  total_collected: number;
  total_transactions: number;
  successful_count: number;
  pending_count: number;
  active_provider: string;
}

export function createPaymentOrder(
  accessToken: string,
  input: PaymentOrderCreateIn
): Promise<PaymentOrderOut> {
  return apiFetch<PaymentOrderOut>("/payments/create-order", {
    method: "POST",
    body: input,
    accessToken,
  });
}

export function verifyPayment(
  accessToken: string,
  input: PaymentVerifyIn
): Promise<PaymentTransactionOut> {
  return apiFetch<PaymentTransactionOut>("/payments/verify", {
    method: "POST",
    body: input,
    accessToken,
  });
}

export function listMyPayments(accessToken: string): Promise<PaymentTransactionOut[]> {
  return apiFetch<PaymentTransactionOut[]>("/payments/history", { accessToken });
}

export function listAllPayments(accessToken: string): Promise<PaymentTransactionOut[]> {
  return apiFetch<PaymentTransactionOut[]>("/payments/all", { accessToken });
}

export function getPaymentStats(accessToken: string): Promise<PaymentSummaryStatsOut> {
  return apiFetch<PaymentSummaryStatsOut>("/payments/stats", { accessToken });
}

export function getGatewayConfig(accessToken: string): Promise<PaymentGatewayConfigOut> {
  return apiFetch<PaymentGatewayConfigOut>("/payments/config", { accessToken });
}

export function updateGatewayConfig(
  accessToken: string,
  payload: PaymentGatewayConfigIn
): Promise<PaymentGatewayConfigOut> {
  return apiFetch<PaymentGatewayConfigOut>("/payments/config", {
    method: "POST",
    body: payload,
    accessToken,
  });
}
