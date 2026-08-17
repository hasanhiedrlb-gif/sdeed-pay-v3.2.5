import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h2 className="text-2xl font-bold text-slate-800">404 - Page Not Found</h2>
      <p className="mt-2 text-sm text-slate-500">The requested page could not be located.</p>
      <Link
        href="/dashboard"
        className="mt-6 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
