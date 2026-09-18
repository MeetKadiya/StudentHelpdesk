"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { ApiError } from "@/lib/api/client";

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [role, setRole] = useState<"student" | "faculty" | "admin" | "clerk">("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter your password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters in length.");
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await signup(email, password, role);
      if (user.role === "faculty") {
        router.push("/faculty");
      } else if (user.role === "admin") {
        router.push("/admin");
      } else if (user.role === "clerk") {
        router.push("/clerk");
      } else {
        router.push("/");
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? String(err.detail)
          : "Couldn't complete registration. Check your connection or try with another email."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center py-3 sm:py-6 px-2 sm:px-4 lg:px-6 pb-24 sm:pb-8">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-xl sm:shadow-2xl border border-slate-200/90 grid grid-cols-1 lg:grid-cols-12">
        
        {/* Left Side: Campus Identity */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#1e293b] via-[#243350] to-[#141d2e] p-5 sm:p-7 lg:p-9 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-16 -bottom-16 w-56 h-56 rounded-full bg-rose-500/10 blur-2xl pointer-events-none" />
          <div className="absolute -left-12 -top-12 w-48 h-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-4 sm:space-y-6">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-md text-xl sm:text-2xl border border-white/20 shadow-md">
                🏛️
              </div>
              <div>
                <span className="block font-black tracking-widest text-[10px] sm:text-[11px] text-rose-300 uppercase">
                  UNIVERSITY PORTAL
                </span>
                <span className="block font-bold text-xs sm:text-sm text-white">
                  Academic &amp; Administrative Registration
                </span>
              </div>
            </div>

            <div className="pt-1 sm:pt-2 space-y-1 sm:space-y-2">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-white tracking-tight leading-snug">
                {role === "faculty"
                  ? "Activate Faculty & Staff Access"
                  : role === "admin"
                  ? "Activate Administrator Access"
                  : role === "clerk"
                  ? "Activate Clerk Operations Access"
                  : "Activate Your Student Account"}
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
                {role === "faculty"
                  ? "Register your official faculty email address to access student advising, ticket routing, and course teaching matrices."
                  : role === "admin"
                  ? "Register institutional administrator credentials to manage user roles, system routing rules, and real-time support analytics."
                  : role === "clerk"
                  ? "Register official Clerk Desk credentials to triage incoming queries and forward them to designated faculties or administrative departments."
                  : "Register your institutional email address to immediately access course schedules, exam marksheets, fee payments, and academic helpdesk services."}
              </p>
            </div>

            <div className="space-y-2 pt-2 text-[11px] sm:text-xs text-slate-200">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <span className="flex h-4 w-4 sm:h-5 sm:w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[9px] sm:text-[10px]">✓</span>
                <span>
                  {role === "faculty"
                    ? "Verified Faculty Staff Registration"
                    : role === "admin"
                    ? "Central System SuperAdmin Access"
                    : role === "clerk"
                    ? "Verified Clerk Operations Clearance"
                    : "Instant Enrollment Verification"}
                </span>
              </div>
              <div className="flex items-center gap-2 sm:gap-2.5">
                <span className="flex h-4 w-4 sm:h-5 sm:w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[9px] sm:text-[10px]">✓</span>
                <span>
                  {role === "faculty"
                    ? "Departmental Ticket Routing & Desk"
                    : role === "admin"
                    ? "Access & Role Assignment Governance"
                    : role === "clerk"
                    ? "Cross-Branch & Semester Query Triage"
                    : "Access to 9 Interactive Campus Services"}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">✓</span>
                <span>
                  {role === "faculty"
                    ? "Course Management & Advising Matrix"
                    : role === "admin"
                    ? "Automated Escalation Rule Configuration"
                    : role === "clerk"
                    ? "Direct Forwarding to Faculty Authorities"
                    : "Automated Grade Tracking & Attendance"}
                </span>
              </div>
            </div>

            <div className="pt-3 sm:pt-4 border-t border-white/10 space-y-1 text-[10px] sm:text-xs text-slate-300">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[10px] sm:text-[11px]">
                <span>🛡️ Official Institutional Verification</span>
              </div>
              <p className="hidden sm:block text-[11px] text-slate-400 leading-relaxed">
                Accounts are authenticated against the campus student records and human resources database.
              </p>
            </div>
          </div>

          <div className="relative z-10 pt-3 sm:pt-6 mt-3 sm:mt-6 border-t border-white/10 flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400">
            <span>🔒 256-Bit SSL Encrypted</span>
            <span>Academic Year 2025-2026</span>
          </div>
        </div>

        {/* Right Side: Registration Form */}
        <div className="lg:col-span-7 p-4 xs:p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-white">
          <div>
            <div className="space-y-1.5 mb-4 sm:mb-6">
              <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between items-start gap-1.5">
                <h2 className="text-lg xs:text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                  Create Campus Account
                </h2>
                <span className={`rounded-full px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                  role === "faculty"
                    ? "bg-purple-100 text-purple-800"
                    : role === "admin"
                    ? "bg-rose-100 text-rose-800"
                    : role === "clerk"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}>
                  {role === "faculty" ? "Faculty Registration" : role === "admin" ? "Admin Registration" : role === "clerk" ? "Clerk Registration" : "Student Registration"}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                Choose your primary role to configure your personalized institutional workspace.
              </p>
            </div>

            {/* Account Role Selector */}
            <div className="mb-4 sm:mb-5 p-1 rounded-xl bg-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] sm:text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => {
                  setRole("student");
                  setError(null);
                }}
                className={`py-2 px-1 rounded-lg text-center transition-all cursor-pointer truncate ${
                  role === "student"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "hover:text-slate-900"
                }`}
              >
                Student 🎓
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole("clerk");
                  setError(null);
                }}
                className={`py-2 px-1 rounded-lg text-center transition-all cursor-pointer truncate ${
                  role === "clerk"
                    ? "bg-white text-amber-900 shadow-xs font-bold"
                    : "hover:text-slate-900"
                }`}
              >
                Clerk Desk 📋
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole("faculty");
                  setError(null);
                }}
                className={`py-2 px-1 rounded-lg text-center transition-all cursor-pointer truncate ${
                  role === "faculty"
                    ? "bg-white text-purple-900 shadow-xs font-bold"
                    : "hover:text-slate-900"
                }`}
              >
                <span className="sm:hidden">Faculty 👨‍🏫</span>
                <span className="hidden sm:inline">Faculty 👨‍🏫</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole("admin");
                  setError(null);
                }}
                className={`py-2 px-1 rounded-lg text-center transition-all cursor-pointer truncate ${
                  role === "admin"
                    ? "bg-white text-rose-900 shadow-xs font-bold"
                    : "hover:text-slate-900"
                }`}
              >
                <span className="sm:hidden">Admin 🏛️</span>
                <span className="hidden sm:inline">Admin 🏛️</span>
              </button>
            </div>

            {error && (
              <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-800 flex items-start gap-2.5 animate-shake">
                <span className="text-base leading-none">⚠️</span>
                <div className="flex-1 font-medium leading-relaxed">{error}</div>
              </div>
            )}

            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200/70 text-amber-900 text-xl font-bold">
                  🏛️
                </div>
                <div>
                  <h3 className="text-sm font-black text-amber-950">
                    Administrator-Provisioned Accounts Only
                  </h3>
                  <p className="text-xs text-amber-900/90 mt-1 leading-relaxed">
                    {role === "student"
                      ? "Public student registration is disabled. Student accounts are created exclusively by the Central University Administration via official CSV roster enrollment. Your credentials have been dispatched directly to your registered Email address and Mobile Number (SMS)."
                      : role === "clerk"
                      ? "Public clerk account registration is disabled. Clerk assistant accounts are provisioned exclusively by the Central University Administration. Please contact the Administrator for your official desk credentials."
                      : role === "faculty"
                      ? "Faculty accounts are provisioned exclusively by the Academic Provost & Campus IT Administration. Please contact your Department Chair or Administrator to receive your official credentials."
                      : "Administrator accounts cannot be created by public sign-up. Only an existing Administrator can create and authorize new administrative accounts."}
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-white p-4 border border-amber-200/80 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <span>🔑</span>
                  <span>Received your login credentials?</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {role === "student"
                    ? "You can log in immediately using either your official Email Address or your Enrollment Number (e.g. 2304050400024)."
                    : role === "clerk"
                    ? "You can log in immediately using your assigned Clerk Desk email address and temporary password."
                    : role === "faculty"
                    ? "You can log in using your official university faculty email and administrator-assigned password."
                    : "You can log in using your authorized Administrator email address and password."}
                </p>
                <div className="pt-1">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 shadow-sm transition-all"
                  >
                    <span>🚀</span> Go to Login Portal →
                  </Link>
                </div>
              </div>

              <div className="text-[11px] text-amber-900/80 flex items-center gap-2">
                <span>ℹ️</span> Need your credentials re-dispatched? Contact the central campus registrar office.
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 text-center sm:text-left">
            <p>
              Already registered?{" "}
              <Link href="/login" className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline">
                Sign In
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
    </div>
  );
}
