"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { ApiError } from "@/lib/api/client";

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [role, setRole] = useState<"student" | "faculty" | "admin">("student");
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
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center py-6 px-3 sm:px-6">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200/90 grid grid-cols-1 lg:grid-cols-12">
        
        {/* Left Side: Campus Identity */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#1e293b] via-[#243350] to-[#141d2e] p-7 sm:p-9 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-16 -bottom-16 w-56 h-56 rounded-full bg-rose-500/10 blur-2xl pointer-events-none" />
          <div className="absolute -left-12 -top-12 w-48 h-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md text-2xl border border-white/20 shadow-md">
                🏛️
              </div>
              <div>
                <span className="block font-black tracking-widest text-[11px] text-rose-300 uppercase">
                  UNIVERSITY PORTAL
                </span>
                <span className="block font-bold text-sm text-white">
                  Academic & Administrative Registration
                </span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
                {role === "faculty"
                  ? "Activate Faculty & Staff Access"
                  : role === "admin"
                  ? "Activate Administrator Access"
                  : "Activate Your Student Account"}
              </h1>
              <p className="text-xs text-slate-300 leading-relaxed">
                {role === "faculty"
                  ? "Register your official faculty email address to access student advising, ticket routing, course teaching matrices, and official responses."
                  : role === "admin"
                  ? "Register institutional administrator credentials to manage user roles, system routing rules, and real-time support analytics."
                  : "Register your institutional email address to immediately access course schedules, exam marksheets, fee payments, and academic helpdesk services."}
              </p>
            </div>

            <div className="space-y-2.5 pt-3 text-xs text-slate-200">
              <div className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">✓</span>
                <span>
                  {role === "faculty"
                    ? "Verified Faculty Staff Registration"
                    : role === "admin"
                    ? "Central System SuperAdmin Access"
                    : "Instant Enrollment Verification"}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">✓</span>
                <span>
                  {role === "faculty"
                    ? "Departmental Ticket Routing & Response Desk"
                    : role === "admin"
                    ? "Access & Role Assignment Governance"
                    : "Access to 9 Interactive Campus Services"}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">✓</span>
                <span>
                  {role === "faculty"
                    ? "Course Management & Advising Matrix"
                    : role === "admin"
                    ? "Automated Escalation Rule Configuration"
                    : "Automated Grade Tracking & Attendance"}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-[11px]">
                <span>🛡️ Official Institutional Verification</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Accounts are authenticated against the campus student records and human resources database.
              </p>
            </div>
          </div>

          <div className="relative z-10 pt-6 mt-6 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
            <span>🔒 256-Bit SSL Encrypted</span>
            <span>Academic Year 2025-2026</span>
          </div>
        </div>

        {/* Right Side: Registration Form */}
        <div className="lg:col-span-7 p-7 sm:p-10 flex flex-col justify-between bg-white">
          <div>
            <div className="space-y-1.5 mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Create Campus Account
                </h2>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                  role === "faculty"
                    ? "bg-purple-100 text-purple-800"
                    : role === "admin"
                    ? "bg-rose-100 text-rose-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}>
                  {role === "faculty" ? "Faculty Registration" : role === "admin" ? "Admin Registration" : "Student Registration"}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Choose your primary role to configure your personalized institutional workspace.
              </p>
            </div>

            {/* Account Role Selector */}
            <div className="mb-5 p-1 rounded-xl bg-slate-100 flex items-center gap-1 text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => {
                  setRole("student");
                  setError(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
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
                  setRole("faculty");
                  setError(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                  role === "faculty"
                    ? "bg-white text-purple-900 shadow-xs font-bold"
                    : "hover:text-slate-900"
                }`}
              >
                Faculty / Staff 👨‍🏫
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole("admin");
                  setError(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                  role === "admin"
                    ? "bg-white text-rose-900 shadow-xs font-bold"
                    : "hover:text-slate-900"
                }`}
              >
                Administrator 🛡️
              </button>
            </div>

            {error && (
              <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-800 flex items-start gap-2.5 animate-shake">
                <span className="text-base leading-none">⚠️</span>
                <div className="flex-1 font-medium leading-relaxed">{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {role === "faculty"
                    ? "Faculty Institutional Email"
                    : role === "admin"
                    ? "Administrator Email"
                    : "Student University Email"}
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
                      role === "faculty"
                        ? "faculty.name@university.edu"
                        : role === "admin"
                        ? "admin.name@university.edu"
                        : "student.name@university.edu"
                    }
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/40 py-2.5 pl-10 pr-4 text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-all shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Create Password (minimum 8 characters)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    🔒
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
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
                  >
                    {showPassword ? "👁️" : "🙈"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    🔒
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/40 py-2.5 pl-10 pr-10 text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-all shadow-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full rounded-xl py-3 px-4 text-xs font-bold tracking-wider uppercase shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer text-white ${
                  role === "faculty"
                    ? "bg-purple-900 hover:bg-purple-800"
                    : role === "admin"
                    ? "bg-rose-900 hover:bg-rose-800"
                    : "bg-slate-900 hover:bg-slate-800"
                }`}
              >
                {isSubmitting ? (
                  <span>Registering Account...</span>
                ) : (
                  <span>
                    {role === "faculty"
                      ? "Complete Faculty Registration →"
                      : role === "admin"
                      ? "Complete Administrator Registration →"
                      : "Complete Student Registration →"}
                  </span>
                )}
              </button>
            </form>
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
