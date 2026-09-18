'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="text-5xl font-black text-rose-400">500</div>
      <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
      <p className="text-xs text-slate-500 max-w-sm">
        An unexpected server error occurred. Please try again.
      </p>
      <button
        onClick={() => reset()}
        className="rounded-xl bg-slate-900 text-white text-xs font-bold px-5 py-2.5 hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
      >
        Try Again
      </button>
    </div>
  );
}
