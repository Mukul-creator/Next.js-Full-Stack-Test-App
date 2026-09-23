import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <h2 className="text-4xl font-bold text-indigo-400">404</h2>
        <p className="text-xl font-semibold">Page Not Found</p>
        <p className="text-sm text-slate-400">
          The requested page could not be found on this server.
        </p>
        <Link
          href="/"
          className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}

