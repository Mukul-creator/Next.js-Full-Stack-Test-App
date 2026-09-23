"use client";

import { useState, useEffect } from "react";

interface UserProfile {
  username: string;
  role: string;
  issuedAt: number;
}

interface ApiResponse {
  endpoint: string;
  status: number;
  statusText: string;
  durationMs: number;
  data: any;
  timestamp: string;
}

export default function HomePage() {
  // Auth state
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("password123");
  const [authMessage, setAuthMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // API Tester state
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [isCallingApi, setIsCallingApi] = useState(false);

  // Client-exposed environment variables
  const publicAppName = process.env.NEXT_PUBLIC_APP_NAME || "Not set";
  const publicAppEnv = process.env.NEXT_PUBLIC_APP_ENV || "Not set";

  // Check auth on mount
  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    setAuthLoading(true);
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Failed to check session", err);
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setAuthMessage({ type: "success", text: "Successfully logged in! Session cookie set." });
        await checkSession();
      } else {
        setAuthMessage({ type: "error", text: data.error || "Login failed" });
      }
    } catch {
      setAuthMessage({ type: "error", text: "Network error during login." });
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    setAuthLoading(true);
    setAuthMessage(null);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setAuthMessage({ type: "success", text: "Logged out! Session cookie cleared." });
    } catch {
      setAuthMessage({ type: "error", text: "Error logging out." });
    } finally {
      setAuthLoading(false);
    }
  }

  async function callApi(endpoint: string, options?: RequestInit) {
    setIsCallingApi(true);
    const start = performance.now();
    try {
      const res = await fetch(endpoint, options);
      const durationMs = Math.round(performance.now() - start);
      const data = await res.json();

      setApiResponse({
        endpoint,
        status: res.status,
        statusText: res.statusText,
        durationMs,
        data,
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      setApiResponse({
        endpoint,
        status: 0,
        statusText: "Network/Fetch Error",
        durationMs,
        data: { error: String(err) },
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setIsCallingApi(false);
    }
  }

  const isNasaImage =
    apiResponse?.endpoint.includes("/api/external") &&
    apiResponse?.data?.data?.imageUrl &&
    apiResponse?.data?.data?.mediaType === "image";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex flex-col justify-between">
      <div className="max-w-6xl mx-auto w-full space-y-8">
        {/* Navigation & Header */}
        <header className="border-b border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {publicAppName}
              </h1>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Full-Stack Next.js Server &amp; External API Integration Testbench
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-slate-800 text-xs font-mono rounded-full border border-slate-700 text-slate-300">
              Env: <strong className="text-emerald-400">{publicAppEnv}</strong>
            </span>
            <span
              className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                user
                  ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300"
                  : "bg-slate-800/80 border-slate-700 text-slate-400"
              }`}
            >
              {authLoading ? "Checking..." : user ? `Logged in: ${user.username}` : "Unauthenticated"}
            </span>
          </div>
        </header>

        {/* Main Grid: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Authentication & Environment Variables (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Auth Box */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl backdrop-blur">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Authentication (HTTP-Only Cookie)
                </h2>
              </div>

              {authMessage && (
                <div
                  className={`p-3 rounded-lg text-sm mb-4 border ${
                    authMessage.type === "success"
                      ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                      : "bg-rose-950/60 border-rose-500/40 text-rose-300"
                  }`}
                >
                  {authMessage.text}
                </div>
              )}

              {user ? (
                <div className="space-y-4">
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Status</span>
                      <span className="text-emerald-400 font-semibold">Active Session</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">User:</span>
                      <span className="font-mono text-white">{user.username}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Role:</span>
                      <span className="font-mono text-indigo-300">{user.role}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-800">
                      <span>Cookie:</span>
                      <span className="font-mono">HttpOnly (Protected from XSS)</span>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    disabled={authLoading}
                    className="w-full bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 py-2.5 px-4 rounded-lg font-medium transition duration-200"
                  >
                    {authLoading ? "Processing..." : "Log Out"}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Username (default: <span className="text-slate-300">admin</span>)
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Password (default: <span className="text-slate-300">password123</span>)
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 px-4 rounded-lg font-medium shadow-md transition duration-200"
                  >
                    {authLoading ? "Signing in..." : "Log In & Set Cookie"}
                  </button>
                </form>
              )}
            </div>

            {/* Environment Variables Inspector */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-white mb-3">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Environment Variables Isolation
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Verify how Next.js isolates server secrets from client-exposed variables:
              </p>

              <div className="space-y-3 font-mono text-xs">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-emerald-400">NEXT_PUBLIC_APP_NAME:</span>
                  <div className="text-slate-300 mt-1 break-all">&quot;{publicAppName}&quot;</div>
                  <div className="text-[10px] text-slate-500 mt-1">Exposed to browser bundle</div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-emerald-400">NEXT_PUBLIC_APP_ENV:</span>
                  <div className="text-slate-300 mt-1 break-all">&quot;{publicAppEnv}&quot;</div>
                  <div className="text-[10px] text-slate-500 mt-1">Exposed to browser bundle</div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-sky-400">EXTERNAL_API_KEY (Server Token):</span>
                  <div className="text-slate-300 mt-1">DEMO_KEY (Configured in .env.local)</div>
                  <div className="text-[10px] text-slate-500 mt-1">Used on backend to call external API</div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-rose-400">SERVER_API_KEY (in browser):</span>
                  <div className="text-slate-400 mt-1 italic">
                    {typeof window !== "undefined" && !process.env.SERVER_API_KEY
                      ? "undefined (Safely hidden on server)"
                      : "Present"}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Protected from client bundle leakage</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: API Calling Center & JSON Output (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-white mb-2">
                <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                API Calling Center (Internal &amp; External)
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                Test both native server routes and externally hosted third-party APIs using server tokens:
              </p>

              {/* Action Buttons: 2 rows */}
              <div className="space-y-3 mb-6">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Internal Server Routes
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => callApi("/api/health")}
                    disabled={isCallingApi}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 p-3 rounded-lg text-left transition duration-150 flex flex-col justify-between"
                  >
                    <div className="text-xs font-semibold text-emerald-400">GET /api/health</div>
                    <div className="text-[11px] text-slate-400 mt-1">Public Health API</div>
                  </button>

                  <button
                    onClick={() => callApi("/api/auth/me")}
                    disabled={isCallingApi}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 p-3 rounded-lg text-left transition duration-150 flex flex-col justify-between"
                  >
                    <div className="text-xs font-semibold text-indigo-400">GET /api/auth/me</div>
                    <div className="text-[11px] text-slate-400 mt-1">Current Session</div>
                  </button>

                  <button
                    onClick={() => callApi("/api/data")}
                    disabled={isCallingApi}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 p-3 rounded-lg text-left transition duration-150 flex flex-col justify-between"
                  >
                    <div className="text-xs font-semibold text-amber-400">GET /api/data</div>
                    <div className="text-[11px] text-slate-400 mt-1">Protected Server API</div>
                  </button>
                </div>

                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-2">
                  Externally Hosted APIs (Using Server Token)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => callApi("/api/external?source=nasa")}
                    disabled={isCallingApi}
                    className="bg-gradient-to-r from-blue-950/70 to-indigo-950/70 hover:from-blue-900/80 hover:to-indigo-900/80 text-slate-100 border border-blue-500/40 p-3.5 rounded-lg text-left transition duration-150"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-sky-300">GET /api/external (NASA APOD)</span>
                      <span className="text-[10px] bg-sky-950 text-sky-400 border border-sky-600/40 px-1.5 py-0.5 rounded font-mono">
                        DEMO_KEY Token
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Fetches live space astronomy data using NASA open data token
                    </div>
                  </button>

                  <button
                    onClick={() => callApi("/api/external?source=github")}
                    disabled={isCallingApi}
                    className="bg-gradient-to-r from-slate-900 to-slate-800 hover:bg-slate-750 text-slate-100 border border-slate-700 p-3.5 rounded-lg text-left transition duration-150"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-purple-300">GET /api/external (GitHub)</span>
                      <span className="text-[10px] bg-purple-950 text-purple-400 border border-purple-600/40 px-1.5 py-0.5 rounded font-mono">
                        Open-Source REST
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Fetches Next.js repository stats from GitHub REST API
                    </div>
                  </button>
                </div>
              </div>

              {/* Response Display */}
              <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
                <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-400">
                      {apiResponse ? apiResponse.endpoint : "No API called yet"}
                    </span>
                    {apiResponse && (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          apiResponse.status >= 200 && apiResponse.status < 300
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                            : "bg-rose-950 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {apiResponse.status} {apiResponse.statusText}
                      </span>
                    )}
                  </div>
                  {apiResponse && (
                    <div className="text-slate-400 text-[11px] flex gap-3">
                      <span>{apiResponse.durationMs} ms</span>
                      <span>{apiResponse.timestamp}</span>
                    </div>
                  )}
                </div>

                {/* NASA Image Preview if present */}
                {isNasaImage && (
                  <div className="p-4 bg-slate-900/50 border-b border-slate-800 flex flex-col sm:flex-row gap-4 items-center">
                    <img
                      src={apiResponse.data.data.imageUrl}
                      alt={apiResponse.data.data.title}
                      className="w-full sm:w-48 h-32 object-cover rounded-lg border border-slate-700 shadow-md"
                    />
                    <div className="space-y-1 text-xs">
                      <div className="font-semibold text-white text-sm">{apiResponse.data.data.title}</div>
                      <div className="text-slate-400">Date: {apiResponse.data.data.date}</div>
                      <div className="text-slate-400 text-[11px] line-clamp-3">
                        {apiResponse.data.data.explanation}
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 max-h-96 overflow-y-auto font-mono text-xs text-slate-300">
                  {isCallingApi ? (
                    <div className="flex items-center gap-2 text-slate-500 py-6 justify-center">
                      <span className="inline-block animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></span>
                      Calling endpoint &amp; resolving external request...
                    </div>
                  ) : apiResponse ? (
                    <pre className="whitespace-pre-wrap leading-relaxed">
                      {JSON.stringify(apiResponse.data, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-slate-600 text-center py-10">
                      Click any of the buttons above to test backend API route handlers or external APIs.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Server Deployment Instructions Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-sm">
              <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Hosting on your Server: Build &amp; Run
              </h3>
              <p className="text-xs text-slate-400 mb-3">
                To run this full-stack application on your server:
              </p>
              <div className="bg-slate-950 p-3 rounded font-mono text-xs text-slate-300 space-y-1 border border-slate-800">
                <p className="text-slate-500"># 1. Install dependencies</p>
                <p className="text-indigo-400">npm install</p>
                <p className="text-slate-500 pt-1"># 2. Create production build</p>
                <p className="text-indigo-400">npm run build</p>
                <p className="text-slate-500 pt-1"># 3. Start standard production server (port 3000)</p>
                <p className="text-indigo-400">npm run start</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-slate-600 pt-4 border-t border-slate-900">
          Next.js Full-Stack Architecture • Frontend UI + Route Handlers + External API with Token + JWT Auth + Environment Variables
        </footer>
      </div>
    </div>
  );
}
