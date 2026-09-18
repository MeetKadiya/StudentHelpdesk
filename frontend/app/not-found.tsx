import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="text-5xl font-black text-slate-300">404</div>
      <h1 className="text-xl font-bold text-slate-900">Page Not Found</h1>
      <p className="text-xs text-slate-500 max-w-sm">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      <Link
        href="/"
        className="rounded-xl bg-slate-900 text-white text-xs font-bold px-5 py-2.5 hover:bg-slate-800 transition-colors shadow-sm"
      >
        Return to Campus Dashboard
      </Link>
    </div>
  );
}
