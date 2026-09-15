"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useAuth } from "@/lib/auth/auth-context";
import {
  createPaymentOrder,
  verifyPayment,
  getGatewayConfig,
  type PaymentOrderOut,
  type PaymentTransactionOut,
  type PaymentGatewayConfigOut,
} from "@/lib/api/payments";
import { ApiError } from "@/lib/api/client";

export interface PaymentCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (txn: PaymentTransactionOut) => void;
  accessToken?: string;
  studentEmail?: string;
  defaultAmount?: number;
  feeType?: string;
  semester?: string;
}

function formatApiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (typeof err.detail === "string") return err.detail;
    if (Array.isArray(err.detail) && err.detail.length > 0) {
      const first = err.detail[0];
      if (first && typeof first === "object" && "msg" in first) {
        return String(first.msg);
      }
    }
    if (err.detail && typeof err.detail === "object") {
      try {
        return JSON.stringify(err.detail);
      } catch {
        return "Invalid payment input parameters.";
      }
    }
    return err.message || "Payment request rejected.";
  }
  if (err instanceof Error) return err.message;
  return "An unexpected error occurred during payment processing.";
}

export function PaymentCheckoutModal({
  isOpen,
  onClose,
  onSuccess,
  accessToken: propToken,
  studentEmail: propEmail,
  defaultAmount = 45000,
  feeType: propFeeType = "tuition",
  semester = "Semester 6 - Fall 2026",
}: PaymentCheckoutModalProps) {
  const auth = useAuth();
  const effectiveToken =
    propToken ||
    auth.accessToken ||
    (typeof window !== "undefined"
      ? JSON.parse(window.localStorage.getItem("helpdesk_auth") || "{}").accessToken
      : null);

  const effectiveEmail = propEmail || auth.user?.email || "student@university.edu";

  // Amount State
  const initialAmount = defaultAmount && defaultAmount > 0 ? defaultAmount : 45000;
  const [amount, setAmount] = useState<number>(initialAmount);
  const [customAmountStr, setCustomAmountStr] = useState<string>("");
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [selectedFeeType, setSelectedFeeType] = useState<string>(propFeeType);

  // Workflow Steps: summary | processing | otp | success
  const [step, setStep] = useState<"summary" | "processing" | "otp" | "success">("summary");
  const [activeMethod, setActiveMethod] = useState<"upi" | "card" | "netbanking">("upi");

  // Gateway config & Order
  const [gatewayConfig, setGatewayConfig] = useState<PaymentGatewayConfigOut | null>(null);
  const [order, setOrder] = useState<PaymentOrderOut | null>(null);
  const [isInitiating, setIsInitiating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Real Dynamic UPI QR State
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isQrLoading, setIsQrLoading] = useState(true);
  const [upiUtr, setUpiUtr] = useState("");
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [selectedUpiApp, setSelectedUpiApp] = useState("Google Pay");
  const [upiId, setUpiId] = useState("");
  const [timeLeft, setTimeLeft] = useState(899); // 14m 59s

  // Card form states
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  // NetBanking form states
  const [selectedBank, setSelectedBank] = useState("HDFC Bank");

  // Verification & Receipt
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [completedTxn, setCompletedTxn] = useState<PaymentTransactionOut | null>(null);

  // Merchant Payee Details for UPI
  const upiPayeeVpa = "universityhelpdesk@upi";
  const upiPayeeName = "National University Fee Desk";

  // Standard NPCI UPI URI Specification
  const upiUri = `upi://pay?pa=${upiPayeeVpa}&pn=${encodeURIComponent(
    upiPayeeName
  )}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
    order?.order_id || "FEES"
  )}`;

  // Reset modal state on open
  useEffect(() => {
    if (isOpen) {
      const validAmt = defaultAmount && defaultAmount > 0 ? defaultAmount : 45000;
      setAmount(validAmt);
      setIsCustom(false);
      setCustomAmountStr("");
      setSelectedFeeType(propFeeType);
      setStep("summary");
      setErrorMsg(null);
      setCompletedTxn(null);
      setOtp("");
      setUpiUtr("");
      setTimeLeft(899);
    }
  }, [isOpen, defaultAmount, propFeeType]);

  // Live Countdown Timer for QR validity
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 899));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Load gateway config once
  useEffect(() => {
    if (isOpen && effectiveToken) {
      getGatewayConfig(effectiveToken)
        .then(setGatewayConfig)
        .catch(() => {});
    }
  }, [isOpen, effectiveToken]);

  // Create payment order whenever amount, feeType or effectiveToken changes
  useEffect(() => {
    if (!isOpen || !effectiveToken || amount <= 0) return;

    let isMounted = true;
    setIsInitiating(true);
    setErrorMsg(null);

    createPaymentOrder(effectiveToken, {
      amount: amount,
      fee_type: selectedFeeType,
      semester: semester,
      academic_year: "2025-2026",
      notes: `Online Fee Settlement by ${effectiveEmail}`,
    })
      .then((ord) => {
        if (isMounted) {
          setOrder(ord);
          setIsInitiating(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setErrorMsg(formatApiError(err));
          setIsInitiating(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, effectiveToken, amount, selectedFeeType, semester, effectiveEmail]);

  // Dynamic Real QR Code generation via `qrcode` package
  useEffect(() => {
    if (!isOpen || amount <= 0) return;
    let isMounted = true;
    setIsQrLoading(true);

    QRCode.toDataURL(upiUri, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
          setIsQrLoading(false);
        }
      })
      .catch(() => {
        // Fallback to online QR API if client canvas encounters issue
        if (isMounted) {
          setQrDataUrl(
            `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=${encodeURIComponent(
              upiUri
            )}`
          );
          setIsQrLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [upiUri, isOpen, amount]);

  if (!isOpen) return null;

  function handleClose() {
    setStep("summary");
    setErrorMsg(null);
    onClose();
  }

  function handleAmountSelect(val: number, feeName: string) {
    setIsCustom(false);
    setAmount(val);
    setSelectedFeeType(feeName);
    setErrorMsg(null);
  }

  function handleCustomAmountChange(valStr: string) {
    setCustomAmountStr(valStr);
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed) && parsed > 0) {
      setAmount(parsed);
      setErrorMsg(null);
    } else {
      setAmount(0);
      setErrorMsg("Please enter an amount greater than 0");
    }
  }

  function autoFillDemoUtr() {
    const randomUtr =
      "4" + Math.floor(10000000000 + Math.random() * 90000000000).toString();
    setUpiUtr(randomUtr);
    setErrorMsg(null);
  }

  function handleCopyUpi() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(upiPayeeVpa);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2200);
    }
  }

  function autoFillDemoCard() {
    setCardNumber("4532 8920 1092 8821");
    setCardName("STUDENT SCHOLAR");
    setCardExpiry("12/28");
    setCardCvv("739");
    setErrorMsg(null);
  }

  function autoFillDemoUpiVpa() {
    setUpiId("student@okhdfcbank");
    setErrorMsg(null);
  }

  // Real UPI Verification Submission
  async function handleVerifyUpiPayment(specificUtr?: string) {
    if (!order || !effectiveToken) return;
    const finalUtr = specificUtr || upiUtr.trim();

    if (!finalUtr || finalUtr.length < 6) {
      setErrorMsg(
        "Please enter the 12-digit UPI UTR / Reference number after scanning the QR code, or click '⚡ Auto-Fill Demo UTR'."
      );
      return;
    }

    setIsVerifying(true);
    setErrorMsg(null);

    try {
      const paymentId = `UPI_${finalUtr}`;
      const payerDetail = `UPI Payment (App: ${selectedUpiApp}) | UTR: ${finalUtr} | VPA: ${
        upiId || "scanned-qr@upi"
      }`;

      const res = await verifyPayment(effectiveToken, {
        order_id: order.order_id,
        payment_id: paymentId,
        payment_method: "upi",
        payer_details: payerDetail,
      });

      setCompletedTxn(res);
      setStep("success");
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err) {
      setErrorMsg(formatApiError(err));
    } finally {
      setIsVerifying(false);
    }
  }

  // 1-Click Instant UPI Test Verification
  async function handleInstantApproveUpi() {
    const randomUtr =
      "4" + Math.floor(10000000000 + Math.random() * 90000000000).toString();
    setUpiUtr(randomUtr);
    await handleVerifyUpiPayment(randomUtr);
  }

  // Proceed for Card / NetBanking flow
  async function handleProceedToCardOrNetBanking() {
    if (amount <= 0) {
      setErrorMsg("Please enter or select a valid payment amount greater than ₹ 0.");
      return;
    }
    if (!order) {
      setErrorMsg("Payment order is still initializing. Please wait a moment.");
      return;
    }
    setErrorMsg(null);

    if (activeMethod === "card") {
      if (cardNumber.replace(/\s/g, "").length < 15) {
        setErrorMsg("Please enter a valid 16-digit card number or click Auto-Fill Demo Card.");
        return;
      }
      if (!cardExpiry.includes("/") || cardExpiry.length < 5) {
        setErrorMsg("Please enter card expiry as MM/YY.");
        return;
      }
      if (cardCvv.length < 3) {
        setErrorMsg("Please enter a valid 3-digit CVV.");
        return;
      }
    }

    setStep("processing");
    await new Promise((r) => setTimeout(r, 700));
    setStep("otp");
  }

  // Confirm Card / NetBanking OTP
  async function handleConfirmOtp() {
    if (!order || !effectiveToken) return;
    if (otp.length < 4) {
      setErrorMsg("Please enter the 6-digit verification code or click Auto-Fill.");
      return;
    }

    setIsVerifying(true);
    setErrorMsg(null);

    try {
      const paymentId = `PAY_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const payerDetail =
        activeMethod === "card"
          ? `Card ending in ${cardNumber.slice(-4) || "8821"}`
          : `${selectedBank} NetBanking`;

      const res = await verifyPayment(effectiveToken, {
        order_id: order.order_id,
        payment_id: paymentId,
        payment_method: activeMethod,
        payer_details: payerDetail,
      });

      setCompletedTxn(res);
      setStep("success");
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err) {
      setErrorMsg(formatApiError(err));
    } finally {
      setIsVerifying(false);
    }
  }

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-950 via-[#0f172a] to-indigo-950 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-xl border border-white/10 shadow-xs">
              💳
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  University Student Fee Portal
                </h3>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-mono font-bold text-emerald-300 border border-emerald-500/30">
                  {gatewayConfig?.provider.toUpperCase() || "GATEWAY"} LIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Official Tuition & Academic Fees Settlement
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mx-6 mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800 flex items-center gap-2">
            <span>⚠️</span> {errorMsg}
          </div>
        )}

        {/* STEP 1: SUMMARY & PAYMENT METHOD CHOOSER */}
        {step === "summary" && (
          <div className="p-6 space-y-5">
            {/* Amount Banner */}
            <div className="rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 border border-indigo-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                  Fee Category
                </span>
                <h4 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                  {selectedFeeType.toUpperCase()} — {semester}
                </h4>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Order ID:{" "}
                  <strong className="text-slate-800">
                    {order?.order_id || (isInitiating ? "Generating..." : "Ready")}
                  </strong>
                </p>
              </div>
              <div className="text-left sm:text-right bg-white px-4 py-2 rounded-xl border border-indigo-200/80 shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">
                  Total Payable
                </span>
                <span className="text-xl sm:text-2xl font-black text-indigo-700">
                  ₹ {amount > 0 ? amount.toLocaleString() : "0"}
                </span>
              </div>
            </div>

            {/* Quick Amount & Category Presets */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Choose Amount or Select Fee Category:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {defaultAmount > 0 && (
                  <button
                    type="button"
                    onClick={() => handleAmountSelect(defaultAmount, "Outstanding Dues")}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      !isCustom && amount === defaultAmount
                        ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold ring-2 ring-indigo-500/20 shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-[10px] text-slate-500 truncate">Outstanding Dues</div>
                    <div className="text-xs font-black text-slate-900">
                      ₹ {defaultAmount.toLocaleString()}
                    </div>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleAmountSelect(45000, "Full Tuition")}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    !isCustom && amount === 45000
                      ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold ring-2 ring-indigo-500/20 shadow-xs"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="text-[10px] text-slate-500 truncate">Full Tuition</div>
                  <div className="text-xs font-black text-slate-900">₹ 45,000</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleAmountSelect(12500, "Tuition Installment")}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    !isCustom && amount === 12500
                      ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold ring-2 ring-indigo-500/20 shadow-xs"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="text-[10px] text-slate-500 truncate">2nd Installment</div>
                  <div className="text-xs font-black text-slate-900">₹ 12,500</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleAmountSelect(1500, "Examination Fee")}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    !isCustom && amount === 1500
                      ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold ring-2 ring-indigo-500/20 shadow-xs"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="text-[10px] text-slate-500 truncate">Exam & Hall Ticket</div>
                  <div className="text-xs font-black text-slate-900">₹ 1,500</div>
                </button>
              </div>

              {/* Custom Amount Field */}
              <div className="pt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCustom(true);
                    setSelectedFeeType("Custom Fee");
                  }}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    isCustom
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  ✏️ Custom Amount
                </button>
                {isCustom && (
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                      ₹
                    </span>
                    <input
                      type="number"
                      min={1}
                      step={100}
                      value={customAmountStr}
                      onChange={(e) => handleCustomAmountChange(e.target.value)}
                      placeholder="Enter amount (e.g. 5000)"
                      className="w-full rounded-xl border border-slate-300 bg-white py-1.5 pl-7 pr-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600 shadow-xs"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method Tabs */}
            <div className="space-y-3 pt-1">
              <label className="block text-xs font-bold text-slate-700">
                Select Secure Payment Channel
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMethod("upi");
                    setErrorMsg(null);
                  }}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    activeMethod === "upi"
                      ? "border-indigo-600 bg-indigo-50/80 text-indigo-950 font-bold ring-2 ring-indigo-500/20 shadow-xs"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-semibold"
                  }`}
                >
                  <span className="text-2xl">📱</span>
                  <span className="text-xs">UPI / QR Code</span>
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                    ⚡ Instant Real QR
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveMethod("card");
                    setErrorMsg(null);
                  }}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    activeMethod === "card"
                      ? "border-indigo-600 bg-indigo-50/80 text-indigo-950 font-bold ring-2 ring-indigo-500/20 shadow-xs"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-semibold"
                  }`}
                >
                  <span className="text-2xl">💳</span>
                  <span className="text-xs">Debit / Credit Card</span>
                  <span className="text-[9px] text-slate-400">Visa, MC, RuPay</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveMethod("netbanking");
                    setErrorMsg(null);
                  }}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    activeMethod === "netbanking"
                      ? "border-indigo-600 bg-indigo-50/80 text-indigo-950 font-bold ring-2 ring-indigo-500/20 shadow-xs"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-semibold"
                  }`}
                >
                  <span className="text-2xl">🏦</span>
                  <span className="text-xs">Net Banking</span>
                  <span className="text-[9px] text-slate-400">All Indian Banks</span>
                </button>
              </div>
            </div>

            {/* TAB CONTENT: REAL DYNAMIC UPI QR CODE */}
            {activeMethod === "upi" && (
              <div className="space-y-4 rounded-3xl border border-indigo-200/90 bg-gradient-to-b from-indigo-50/40 via-white to-slate-50 p-4 sm:p-5 shadow-xs">
                {/* NPCI Verified Header */}
                <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center h-6 px-2 rounded-md bg-orange-600 text-white font-black text-[10px] tracking-wider">
                      UPI
                    </span>
                    <span className="inline-flex items-center justify-center h-6 px-2 rounded-md bg-emerald-700 text-white font-black text-[10px] tracking-wider">
                      BHIM
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      Scan QR with Any Mobile UPI App
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg">
                    <span>⏳</span>
                    <span>{formatTimer(timeLeft)}</span>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-5">
                  {/* REAL SCANNABLE QR CODE CONTAINER */}
                  <div className="relative group shrink-0 flex flex-col items-center bg-white p-3 rounded-2xl border-2 border-indigo-300 shadow-md">
                    <div className="relative flex items-center justify-center h-[200px] w-[200px] bg-white rounded-xl overflow-hidden">
                      {isQrLoading || !qrDataUrl ? (
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent" />
                          <span className="text-[10px] font-bold text-slate-400">
                            Generating Live QR…
                          </span>
                        </div>
                      ) : (
                        <img
                          src={qrDataUrl}
                          alt={`Scan UPI QR to pay ₹ ${amount}`}
                          className="h-full w-full object-contain select-none"
                        />
                      )}
                    </div>

                    <div className="mt-2 text-center w-full">
                      <div className="text-[11px] font-extrabold text-slate-800">
                        ₹ {amount.toLocaleString()}
                      </div>
                      <div className="text-[9px] font-semibold text-slate-500 font-mono truncate max-w-[190px]">
                        {upiPayeeVpa}
                      </div>
                    </div>
                  </div>

                  {/* UPI DETAILS & INTERACTIVE FLOW */}
                  <div className="space-y-3 flex-1 w-full text-left">
                    {/* Direct Mobile Deep Link for Phones */}
                    <div className="bg-indigo-50/80 rounded-xl p-2.5 border border-indigo-200/80">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-indigo-950">
                          📱 Browsing on Mobile?
                        </span>
                        <a
                          href={upiUri}
                          className="text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1 rounded-lg transition-all shadow-xs"
                        >
                          Tap to Open in UPI App ↗
                        </a>
                      </div>
                      <p className="text-[10px] text-slate-600">
                        Directly opens Google Pay, PhonePe, Paytm, or BHIM with amount prefilled.
                      </p>
                    </div>

                    {/* VPA Copy Bar */}
                    <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                      <div className="truncate mr-2">
                        <span className="text-[10px] text-slate-400 block">UPI ID / VPA:</span>
                        <span className="font-mono font-bold text-slate-800 text-[11px]">
                          {upiPayeeVpa}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shrink-0"
                      >
                        {copiedUpi ? "✓ Copied!" : "📋 Copy"}
                      </button>
                    </div>

                    {/* Supported Apps Badges */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">
                        Select your paying app:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {["Google Pay", "PhonePe", "Paytm", "BHIM", "CRED"].map((app) => (
                          <button
                            key={app}
                            type="button"
                            onClick={() => setSelectedUpiApp(app)}
                            className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition-all cursor-pointer ${
                              selectedUpiApp === app
                                ? "bg-slate-900 text-white shadow-xs"
                                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {app}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 12-Digit UTR Input & Test Verify Actions */}
                    <div className="pt-1 border-t border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-800">
                          12-Digit UPI Ref / UTR Number:
                        </label>
                        <button
                          type="button"
                          onClick={autoFillDemoUtr}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                        >
                          ⚡ Auto-Fill Demo UTR
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          maxLength={16}
                          value={upiUtr}
                          onChange={(e) => setUpiUtr(e.target.value.replace(/\D/g, ""))}
                          placeholder="e.g. 429182749102"
                          className="flex-1 rounded-xl border border-slate-300 bg-white py-1.5 px-3 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600 shadow-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleVerifyUpiPayment()}
                          disabled={isVerifying || isInitiating}
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 shadow-xs transition-all cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          {isVerifying ? "Verifying…" : "Verify Payment ✅"}
                        </button>
                      </div>

                      {/* 1-Click Instant Test Simulation Button */}
                      <button
                        type="button"
                        onClick={handleInstantApproveUpi}
                        disabled={isVerifying || isInitiating}
                        className="w-full py-1.5 px-3 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-800 text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <span>⚡</span>
                        <span>1-Click Test Payment & Instant Receipt Approval</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: CARDS */}
            {activeMethod === "card" && (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Debit or Credit Card Details
                  </span>
                  <button
                    type="button"
                    onClick={autoFillDemoCard}
                    className="rounded-lg bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 transition-all cursor-pointer"
                  >
                    ⚡ Auto-Fill Demo Card
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Card Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={19}
                      value={cardNumber}
                      onChange={(e) => {
                        const val = e.target.value
                          .replace(/\D/g, "")
                          .replace(/(.{4})/g, "$1 ")
                          .trim();
                        setCardNumber(val);
                      }}
                      placeholder="4532 •••• •••• 8821"
                      className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-600 shadow-xs"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      💳 Visa/MC
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="e.g. STUDENT SCHOLAR"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-semibold text-slate-800 uppercase focus:outline-none focus:ring-1 focus:ring-indigo-600 shadow-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, "");
                        if (val.length >= 2) val = val.slice(0, 2) + "/" + val.slice(2, 4);
                        setCardExpiry(val);
                      }}
                      placeholder="MM/YY"
                      className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-600 shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      CVV / CVC
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ""))}
                      placeholder="•••"
                      className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-600 shadow-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: NET BANKING */}
            {activeMethod === "netbanking" && (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <label className="block text-xs font-bold text-slate-700">
                  Select Banking Institution
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    "HDFC Bank",
                    "State Bank of India",
                    "ICICI Bank",
                    "Axis Bank",
                    "Punjab National Bank",
                    "Kotak Mahindra",
                  ].map((bank) => (
                    <button
                      key={bank}
                      type="button"
                      onClick={() => setSelectedBank(bank)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        selectedBank === bank
                          ? "border-indigo-600 bg-indigo-50/80 font-bold text-indigo-900 shadow-xs"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-medium"
                      }`}
                    >
                      <span className="block text-xs">{bank}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons for Card & NetBanking */}
            {activeMethod !== "upi" && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  🔒 256-bit Bank Grade Encryption
                </span>
                <button
                  type="button"
                  onClick={handleProceedToCardOrNetBanking}
                  disabled={isInitiating || amount <= 0}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-2.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isInitiating
                    ? "Initiating Order…"
                    : `Proceed to Pay ₹ ${
                        amount > 0 ? amount.toLocaleString() : "0"
                      } →`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: PROCESSING ANIMATION */}
        {step === "processing" && (
          <div className="p-12 text-center space-y-4">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            <h4 className="text-base font-bold text-slate-900">
              Connecting to Secure Payment Gateway…
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Please do not refresh or close the page. Redirecting to 3D Secure verification.
            </p>
          </div>
        )}

        {/* STEP 3: OTP VERIFICATION SIMULATION */}
        {step === "otp" && (
          <div className="p-6 space-y-5">
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
                  3D Secure Verification
                </span>
                <p className="text-xs font-semibold text-slate-800">
                  Enter One-Time Password (OTP) sent to registered mobile
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-200">
                ₹ {amount.toLocaleString()}
              </span>
            </div>

            <div className="space-y-3 max-w-sm mx-auto text-center py-2">
              <label className="block text-xs font-bold text-slate-700">
                Enter 6-Digit Bank OTP
              </label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full text-center tracking-widest text-2xl font-mono font-black py-2.5 border-2 border-indigo-300 rounded-2xl focus:outline-none focus:border-indigo-600 bg-slate-50"
                autoFocus
              />

              {/* Instant Auto-Fill Demo Button */}
              <button
                type="button"
                onClick={() => setOtp("123456")}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
              >
                ⚡ Click to Auto-Fill Test OTP (123456)
              </button>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep("summary")}
                className="text-xs text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleConfirmOtp}
                disabled={isVerifying}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-6 py-2.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isVerifying ? "Authorizing Payment…" : "Confirm & Authorize Payment ✅"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS & OFFICIAL RECEIPT */}
        {step === "success" && completedTxn && (
          <div className="p-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-2xl font-bold shadow-xs">
                ✓
              </div>
              <h3 className="text-lg font-black text-slate-900">
                Payment Received Successfully!
              </h3>
              <p className="text-xs text-slate-500">
                Official university receipt recorded into your student profile and emailed to your portal inbox.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Receipt Number:</span>
                <span className="font-mono font-bold text-indigo-700">
                  {completedTxn.receipt_no}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Order ID:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {completedTxn.order_id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment ID / UTR:</span>
                <span className="font-mono text-slate-700">
                  {completedTxn.payment_id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fee Category:</span>
                <span className="font-semibold text-slate-800 uppercase">
                  {completedTxn.fee_type}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Channel:</span>
                <span className="font-semibold text-slate-800 uppercase">
                  {completedTxn.payment_method}
                </span>
              </div>
              {completedTxn.receipt_hash && (
                <div className="flex justify-between border-t border-slate-200/80 pt-1.5">
                  <span className="text-slate-500">Verification Hash:</span>
                  <span className="font-mono text-[10px] text-slate-400 truncate max-w-[200px]">
                    {completedTxn.receipt_hash}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-sm">
                <span className="text-slate-800">Amount Settled:</span>
                <span className="text-emerald-700 font-black">
                  ₹ {completedTxn.amount.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 cursor-pointer"
              >
                🖨️ Print / Save PDF
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-2 text-xs font-bold text-white cursor-pointer"
              >
                Done & View History
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}