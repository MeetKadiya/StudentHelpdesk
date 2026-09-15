"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive =
    href === "/"
      ? pathname === "/"
      : href === "/faculty"
      ? pathname === "/faculty" || pathname.startsWith("/faculty/")
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`relative py-1 text-xs sm:text-sm transition-standard hover:text-slate-900 ${
        isActive ? "text-slate-900 font-bold" : "text-slate-500 font-medium"
      }`}
    >
      {children}
      {isActive && <span className="absolute -bottom-[17px] left-0 right-0 h-0.5 rounded-full bg-slate-900" />}
    </Link>
  );
}

function initialsOf(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

export function SiteNav() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuth();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  if (isAuthenticated) {
    const isFaculty = user?.role === "faculty";
    const isAdmin = user?.role === "admin";

    return (
      <nav className="flex items-center gap-4 sm:gap-6 text-sm">
        {isFaculty ? (
          <>
            <NavLink href="/faculty">Faculty Portal</NavLink>
            <NavLink href="/services">Campus Services</NavLink>
          </>
        ) : isAdmin ? (
          <>
            <NavLink href="/admin">Admin Hub</NavLink>
            <NavLink href="/admin/analytics">Analytics</NavLink>
            <NavLink href="/services">Campus Services</NavLink>
          </>
        ) : (
          <>
            <NavLink href="/">Dashboard</NavLink>
            <NavLink href="/attendance">Attendance</NavLink>
            <NavLink href="/fees/history">Fees</NavLink>
            <NavLink href="/exam">Exams</NavLink>
            <NavLink href="/inbox">Inbox 📬</NavLink>
            <NavLink href="/services">Services</NavLink>
            <NavLink href="/tickets">My Inquiries</NavLink>
          </>
        )}

        <div className="ml-2 flex items-center gap-3 border-l border-slate-200 pl-4">
          {user?.email && (
            <div className="flex items-center gap-2">
              <span
                title={user.email}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-white shadow-xs"
              >
                {initialsOf(user.email)}
              </span>
              <span className={`hidden sm:inline text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                isFaculty
                  ? "bg-purple-50 text-purple-800 border-purple-200"
                  : isAdmin
                  ? "bg-rose-50 text-rose-800 border-rose-200"
                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
              }`}>
                {user.role}
              </span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 transition-all cursor-pointer"
          >
            Log out
          </button>
        </div>
      </nav>
    );
  }

  return (
    <nav className="flex items-center gap-4 text-sm">
      <Link href="/services" className="text-xs sm:text-sm text-slate-600 font-medium hover:text-slate-900 transition-colors">
        Campus Services
      </Link>
      <Link href="/login" className="text-xs sm:text-sm text-slate-700 font-bold hover:text-slate-900 transition-colors">
        Log in
      </Link>
      <Link href="/signup" className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 text-xs font-bold transition-all shadow-xs">
        Sign up
      </Link>
    </nav>
  );
}
