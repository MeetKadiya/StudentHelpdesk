"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { ApiError } from "@/lib/api/client";

// Clean alphanumeric set excluding confusing chars (0, O, 1, I, l)
const CAPTCHA_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function generateRandomCaptcha(length = 6): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CAPTCHA_CHARS.charAt(Math.floor(Math.random() * CAPTCHA_CHARS.length));
  }
  return result;
}

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, user, isUserLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [selectedRole, setSelectedRole] = useState<"student" | "faculty" | "admin">("student");

  // Captcha State
  const [captchaText, setCaptchaText] = useState("");
  const [userCaptchaInput, setUserCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Auto-redirect if user is already authenticated
  useEffect(() => {
    if (isAuthenticated && !isUserLoading && user) {
      if (user.role === "faculty") {
        router.replace("/faculty");
      } else if (user.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/");
      }
    }
  }, [isAuthenticated, isUserLoading, user, router]);

  // Render randomized CAPTCHA challenge onto canvas
  function refreshCaptcha() {
    const newCaptcha = generateRandomCaptcha(6);
    setCaptchaText(newCaptcha);
    setUserCaptchaInput("");
    setCaptchaError(false);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background with soft security gradient
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, "#f8fafc");
    bgGradient.addColorStop(1, "#e2e8f0");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Background security noise dots
    for (let i = 0; i < 45; i++) {
      ctx.fillStyle = `rgba(${Math.floor(Math.random() * 150)}, ${Math.floor(
        Math.random() * 150
      )}, ${Math.floor(Math.random() * 200)}, 0.3)`;
      ctx.beginPath();
      ctx.arc(
        Math.random() * width,
        Math.random() * height,
        Math.random() * 2 + 0.8,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Background wave lines
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = `rgba(${Math.floor(Math.random() * 100 + 80)}, ${Math.floor(
        Math.random() * 100 + 80
      )}, ${Math.floor(Math.random() * 150 + 100)}, 0.4)`;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(Math.random() * 10, Math.random() * height);
      ctx.bezierCurveTo(
        width * 0.3,
        Math.random() * height,
        width * 0.7,
        Math.random() * height,
        width - 10,
        Math.random() * height
      );
      ctx.stroke();
    }

    // Render characters with variable rotation, size, and coloring
    const charSpacing = width / (newCaptcha.length + 0.8);
    for (let i = 0; i < newCaptcha.length; i++) {
      const char = newCaptcha[i];
      ctx.save();
      const x = charSpacing * (i + 0.65);
      const y = height / 2 + (Math.random() * 6 - 3);

      ctx.translate(x, y);
      const angle = (Math.random() - 0.5) * 0.42;
      ctx.rotate(angle);

      ctx.font = `bold ${Math.floor(Math.random() * 4 + 21)}px monospace, sans-serif`;
      const colors = ["#0f172a", "#1e293b", "#1e1b4b", "#3730a3", "#0369a1", "#831843"];
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText(char, 0, 0);
      ctx.restore();
    }
  }

  useEffect(() => {
    refreshCaptcha();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    // 1. Verify CAPTCHA
    if (!userCaptchaInput.trim()) {
      setCaptchaError(true);
      setError("Please enter the 6-character security CAPTCHA code shown in the box.");
      return;
    }

    if (userCaptchaInput.trim().toUpperCase() !== captchaText.toUpperCase()) {
      setCaptchaError(true);
      setError("Incorrect security CAPTCHA verification code. A new challenge has been generated. Please try again.");
      refreshCaptcha();
      return;
    }

    // 2. Authenticate
    setIsSubmitting(true);
    try {
      const loggedUser = await login(email, password);

      // Check for role mismatch and direct cleanly
      if (loggedUser.role !== selectedRole) {
        setError(
          `Notice: This account is registered with role '${loggedUser.role.toUpperCase()}'. Directing you to your ${
            loggedUser.role === "faculty"
              ? "Faculty Workspace"
              : loggedUser.role === "admin"
              ? "Administrator Hub"
              : "Student Dashboard"
          }...`
        );
        setTimeout(() => {
          if (loggedUser.role === "faculty") {
            router.push("/faculty");
          } else if (loggedUser.role === "admin") {
            router.push("/admin");
          } else {
            router.push("/");
          }
        }, 900);
      } else {
        if (loggedUser.role === "faculty") {
          router.push("/faculty");
        } else if (loggedUser.role === "admin") {
          router.push("/admin");
        } else {
          router.push("/");
        }
      }
    } catch (err) {
      refreshCaptcha();
      setError(
        err instanceof ApiError
          ? String(err.detail)
          : "Invalid email or password. Please verify your credentials and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center py-6 px-3 sm:px-6">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200/90 grid grid-cols-1 lg:grid-cols-12">
        
        {/* Left Side: Institutional Campus Branding & Overview */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#1e293b] via-[#243350] to-[#141d2e] p-7 sm:p-9 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle decorative background circles */}
          <div className="absolute -right-16 -bottom-16 w-56 h-56 rounded-full bg-rose-500/10 blur-2xl pointer-events-none" />
          <div className="absolute -left-12 -top-12 w-48 h-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            {/* University Crest / Seal */}
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md text-2xl border border-white/20 shadow-md">
                🏛️
              </div>
              <div>
                <span className="block font-black tracking-widest text-[11px] text-rose-300 uppercase">
                  UNIVERSITY PORTAL
                </span>
                <span className="block font-bold text-sm text-white">
                  Academic & Administrative Hub
                </span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
                Integrated Campus Management System
              </h1>
              <p className="text-xs text-slate-300 leading-relaxed">
                Access your academic courses, lecture timetables, verified exam results, fee payments, and faculty advising through secure single sign-on.
              </p>
            </div>

            {/* Portal Highlights */}
            <div className="space-y-2.5 pt-3 text-xs text-slate-200">
              <div className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                  ✓
                </span>
                <span>Provisional Results & SPI / CPI Marksheets</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                  ✓
                </span>
                <span>Daily & Datewise Attendance Matrix</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                  ✓
                </span>
                <span>Faculty Advising & Routed Inquiries</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                  ✓
                </span>
                <span>Administrator Governance & Role Directory</span>
              </div>
            </div>

            {/* System Security & Access Notice */}
            <div className="pt-4 border-t border-white/10 space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-[11px]">
                <span>🛡️ Institutional Protection & SSL Verified</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Authorized institutional access only. Authentication activities are monitored by University IT Services.
              </p>
            </div>
          </div>

          {/* Bottom Security Note */}
          <div className="relative z-10 pt-6 mt-6 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
            <span>🔒 256-Bit SSL Encrypted</span>
            <span>Academic Term: Spring 2026</span>
          </div>
        </div>

        {/* Right Side: Modern Login Form + CAPTCHA */}
        <div className="lg:col-span-7 p-7 sm:p-10 flex flex-col justify-between bg-white">
          <div>
            {/* Header */}
            <div className="space-y-1.5 mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Sign In to Campus Portal
                </h2>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                  selectedRole === "faculty"
                    ? "bg-purple-100 text-purple-800"
                    : selectedRole === "admin"
                    ? "bg-rose-100 text-rose-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}>
                  {selectedRole === "faculty" ? "Faculty Access" : selectedRole === "admin" ? "Admin Access" : "Student Access"}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {selectedRole === "faculty"
                  ? "Faculty & Academic Staff Portal. Enter your official university credentials."
                  : selectedRole === "admin"
                  ? "Campus Administrator Portal. System controls and audit management."
                  : "Student Management Portal. Enter your registered student credentials."}
              </p>
            </div>

            {/* Role Selection Tabs */}
            <div className="mb-5 p-1 rounded-xl bg-slate-100 flex items-center gap-1 text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole("student");
                  setError(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                  selectedRole === "student"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "hover:text-slate-900"
                }`}
              >
                Student 🎓
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRole("faculty");
                  setError(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                  selectedRole === "faculty"
                    ? "bg-white text-purple-900 shadow-xs font-bold"
                    : "hover:text-slate-900"
                }`}
              >
                Faculty / Staff 👨‍🏫
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRole("admin");
                  setError(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                  selectedRole === "admin"
                    ? "bg-white text-rose-900 shadow-xs font-bold"
                    : "hover:text-slate-900"
                }`}
              >
                Administrator 🛡️
              </button>
            </div>

            {/* Student Helper Box */}
            {selectedRole === "student" && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-950 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold flex items-center gap-1.5 text-emerald-900">
                      <span>🎓</span> Quick Student Accounts (Pass: <code className="bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-mono text-[10px]">TestPassword123!</code>)
                    </span>
                    <p className="text-[11px] text-emerald-700">Click any student to auto-fill login credentials:</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {[
                    { label: "Aarav Sharma", email: "aarav.sharma@student.university.edu", dept: "CSE" },
                    { label: "Priya Patel", email: "priya.patel@student.university.edu", dept: "IT & Cyber" },
                    { label: "Rohan Verma", email: "rohan.verma@student.university.edu", dept: "AI & DS" },
                    { label: "Alex Smith", email: "alex.smith@student.university.edu", dept: "Cloud" },
                    { label: "Vansh Prajapati", email: "vanshprajapati667@gmail.com", dept: "Student" },
                    { label: "Demo Scholar", email: "student_rbac_test@university.edu", dept: "General" },
                  ].map((s) => (
                    <button
                      key={s.email}
                      type="button"
                      onClick={() => {
                        setEmail(s.email);
                        setPassword("TestPassword123!");
                        if (error) setError(null);
                      }}
                      className="text-left p-1.5 rounded-lg border border-emerald-200 bg-white hover:bg-emerald-100/70 hover:border-emerald-300 transition-all cursor-pointer shadow-xs"
                    >
                      <div className="font-bold text-[11px] text-emerald-950 truncate">{s.label}</div>
                      <div className="text-[9px] text-emerald-600 truncate">{s.dept}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Faculty Helper Box */}
            {selectedRole === "faculty" && (
              <div className="mb-4 rounded-xl border border-purple-200 bg-purple-50/70 p-3 text-xs text-purple-950 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold flex items-center gap-1.5 text-purple-900">
                      <span>👨‍🏫</span> Faculty Accounts (Pass: <code className="bg-purple-100 text-purple-800 px-1 py-0.5 rounded font-mono text-[10px]">TestPassword123!</code>)
                    </span>
                    <p className="text-[11px] text-purple-700">Click any faculty to auto-fill login credentials:</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {[
                    { label: "Prof. Sharma", email: "prof.sharma@university.edu", dept: "CSE" },
                    { label: "Dr. Patel", email: "dr.patel@university.edu", dept: "IT" },
                    { label: "Prof. Chen", email: "prof.chen@university.edu", dept: "AI & DS" },
                    { label: "Dr. Williams", email: "dr.williams@university.edu", dept: "Math" },
                    { label: "Dean Anderson", email: "dean.anderson@university.edu", dept: "Engineering" },
                    { label: "Faculty Advisor", email: "prof_471982@university.edu", dept: "Advising" },
                  ].map((f) => (
                    <button
                      key={f.email}
                      type="button"
                      onClick={() => {
                        setEmail(f.email);
                        setPassword("TestPassword123!");
                        if (error) setError(null);
                      }}
                      className="text-left p-1.5 rounded-lg border border-purple-200 bg-white hover:bg-purple-100/70 hover:border-purple-300 transition-all cursor-pointer shadow-xs"
                    >
                      <div className="font-bold text-[11px] text-purple-950 truncate">{f.label}</div>
                      <div className="text-[9px] text-purple-600 truncate">{f.dept}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Helper Box */}
            {selectedRole === "admin" && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-900 flex items-center justify-between">
                <div>
                  <span className="font-bold">Institutional Admin Account:</span>
                  <p className="text-[11px] text-rose-700">admin@university.edu • AdminPassword123!</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("admin@university.edu");
                    setPassword("AdminPassword123!");
                    if (error) setError(null);
                  }}
                  className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] px-2.5 py-1 transition-all shadow-xs cursor-pointer shrink-0"
                >
                  Fill Admin
                </button>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-800 flex items-start gap-2.5 animate-shake">
                <span className="text-base leading-none">⚠️</span>
                <div className="flex-1 font-medium leading-relaxed">{error}</div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {selectedRole === "faculty"
                    ? "Faculty Institutional Email"
                    : selectedRole === "admin"
                    ? "Administrator Email"
                    : "Student Email Address"}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    ✉️
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder={
                      selectedRole === "faculty"
                        ? "faculty.member@university.edu"
                        : selectedRole === "admin"
                        ? "admin.staff@university.edu"
                        : "student.id@university.edu"
                    }
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/40 py-2.5 pl-10 pr-4 text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-all shadow-xs"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Account Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    🔒
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/40 py-2.5 pl-10 pr-10 text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-all shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm p-1 transition-colors"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "👁️" : "🙈"}
                  </button>
                </div>
              </div>

              {/* Security CAPTCHA Challenge */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>🛡️</span> Security Verification CAPTCHA
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Case-insensitive</span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Visual Canvas */}
                  <div className="relative rounded-xl border border-slate-300 overflow-hidden bg-slate-100 shadow-inner">
                    <canvas
                      ref={canvasRef}
                      width={160}
                      height={46}
                      className="block cursor-pointer select-none"
                      onClick={refreshCaptcha}
                      title="Click canvas to generate a new CAPTCHA challenge"
                    />
                  </div>

                  {/* Refresh Button */}
                  <button
                    type="button"
                    onClick={refreshCaptcha}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-95 transition-all shadow-xs cursor-pointer"
                    title="Generate New CAPTCHA Code"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>

                  {/* Code Input */}
                  <div className="flex-1">
                    <input
                      type="text"
                      maxLength={6}
                      value={userCaptchaInput}
                      onChange={(e) => {
                        setUserCaptchaInput(e.target.value);
                        setCaptchaError(false);
                        if (error) setError(null);
                      }}
                      placeholder="Enter code"
                      className={`w-full rounded-xl border py-2.5 px-3 text-xs sm:text-sm font-bold uppercase tracking-widest text-slate-900 placeholder:text-slate-400 placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:ring-1 shadow-xs transition-all ${
                        captchaError
                          ? "border-rose-500 bg-rose-50/50 focus:border-rose-600 focus:ring-rose-600"
                          : "border-slate-300 bg-white focus:border-indigo-600 focus:ring-indigo-600"
                      }`}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Type the 6 security characters shown above to verify human access.
                </p>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-slate-600 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span>Remember this browser</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full rounded-xl text-white py-3 px-4 text-xs font-bold tracking-wider uppercase shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer ${
                  selectedRole === "faculty"
                    ? "bg-purple-900 hover:bg-purple-800"
                    : selectedRole === "admin"
                    ? "bg-rose-900 hover:bg-rose-800"
                    : "bg-slate-900 hover:bg-slate-800"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Authenticating Credentials...</span>
                  </>
                ) : (
                  <span>
                    {selectedRole === "faculty"
                      ? "Sign In to Faculty Portal →"
                      : selectedRole === "admin"
                      ? "Sign In to Admin Hub →"
                      : "Sign In to Student Portal →"}
                  </span>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 text-center sm:text-left">
            <p>
              New applicant or student?{" "}
              <Link href="/signup" className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline">
                Create an Account
              </Link>
            </p>
            <p className="text-[11px] text-slate-400">
              Need Help?{" "}
              <Link href="/services" className="hover:underline">
                IT HelpDesk Support
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Recovery Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>🔑</span> Reset Campus Portal Password
              </h3>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              To recover your portal password, enter your registered institutional email. A secure password reset token will be dispatched to your inbox.
            </p>
            <input
              type="email"
              placeholder="your.email@university.edu"
              className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  alert("Password recovery instructions sent to your institutional email address.");
                  setShowForgotModal(false);
                }}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
              >
                Send Recovery Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
