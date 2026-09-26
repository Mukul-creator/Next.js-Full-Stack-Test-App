"use client";

import { useState, useEffect, useCallback } from "react";

interface HealthData {
  status: string;
  uptimeSeconds: number;
  serverTime: string;
  nodeVersion: string;
  memoryUsageMB: number;
}

interface DataItem {
  id: string;
  title: string;
  category: string;
  status: "active" | "completed" | "pending";
  createdAt: string;
}

interface ArticleItem {
  id: string;
  title: string;
  subject?: string;
  category?: string;
  difficulty: string;
  author?: string;
  readTimeMinutes: number;
  views: number;
  publishedAt?: string;
  updatedAt?: string;
  tags?: string[];
  summary: string;
  body?: string[];
  content?: string;
  formulaHighlight?: string;
}

interface ImageMeta {
  id: string;
  title: string;
  category: string;
  resolution: string;
  accent: string;
  secondary: string;
  streamUrl?: string;
  serverStreamUrl?: string;
  hdUrl?: string;
  externalThumb?: string;
  estimatedSizeKB?: number;
  approxServerBytes?: number;
}

interface VideoMeta {
  id: string;
  title: string;
  instructor: string;
  duration: string;
  resolution: string;
  bitrateMbps?: number;
  bitrate?: string;
  sizeMB: number;
  category: string;
  mp4Url?: string;
  streamUrl?: string;
  binaryChunkUrl?: string;
  serverChunkUrl?: string;
  description?: string;
}

interface ApiLog {
  id: string;
  method: string;
  endpoint: string;
  status: number;
  durationMs: number;
  sizeKB: number;
  timestamp: string;
}

const TOKEN_STORAGE_KEY = "nextjs_test_auth_token";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"feed" | "images" | "videos" | "crud">("feed");

  const [health, setHealth] = useState<HealthData | null>(null);
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("password123");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("");

  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<ArticleItem | null>(null);
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [heavyPayloadMode, setHeavyPayloadMode] = useState(false);
  const [feedPayloadKB, setFeedPayloadKB] = useState(0);
  const [feedLoading, setFeedLoading] = useState(false);

  const [images, setImages] = useState<ImageMeta[]>([]);
  const [imageMode, setImageMode] = useState<"server-svg" | "external-hd">("external-hd");
  const [imageCacheBuster, setImageCacheBuster] = useState(1);

  const [videos, setVideos] = useState<VideoMeta[]>([]);
  const [activeVideo, setActiveVideo] = useState<VideoMeta | null>(null);

  const [items, setItems] = useState<DataItem[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Performance");
  const [dataError, setDataError] = useState("");

  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [lastJsonResponse, setLastJsonResponse] = useState<string>("// Responses from API calls will appear here");

  const getAuthHeaders = useCallback(
    (extraHeaders: Record<string, string> = {}, tokenOverride?: string | null): Record<string, string> => {
      const activeToken =
        tokenOverride !== undefined
          ? tokenOverride
          : authToken || (typeof window !== "undefined" ? localStorage.getItem(TOKEN_STORAGE_KEY) : null);

      const headers: Record<string, string> = { ...extraHeaders };
      if (activeToken) {
        headers["Authorization"] = `Bearer ${activeToken}`;
      }
      return headers;
    },
    [authToken]
  );

  const logApiCall = useCallback(
    (method: string, endpoint: string, status: number, durationMs: number, sizeKB: number, previewObj?: unknown) => {
      setLogs((prev) => [
        {
          id: Math.random().toString(36).substring(2, 9),
          method,
          endpoint,
          status,
          durationMs,
          sizeKB: Number(sizeKB.toFixed(2)),
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 19),
      ]);
      if (previewObj !== undefined) {
        setLastJsonResponse(JSON.stringify(previewObj, null, 2));
      }
    },
    []
  );

  const fetchHealth = useCallback(async () => {
    const start = performance.now();
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      const text = await res.text();
      const duration = Math.round(performance.now() - start);
      const sizeKB = new Blob([text]).size / 1024;
      const data = JSON.parse(text);
      setHealth(data);
      logApiCall("GET", "/api/health", res.status, duration, sizeKB, data);
    } catch (err) {
      logApiCall("GET", "/api/health", 500, Math.round(performance.now() - start), 0, { error: String(err) });
    }
  }, [logApiCall]);

  const checkAuth = useCallback(
    async (tokenOverride?: string | null) => {
      const start = performance.now();
      try {
        const res = await fetch("/api/auth/me", {
          headers: getAuthHeaders({}, tokenOverride),
          credentials: "include",
          cache: "no-store",
        });
        const text = await res.text();
        const duration = Math.round(performance.now() - start);
        const sizeKB = new Blob([text]).size / 1024;
        const data = JSON.parse(text);
        if (data.authenticated) {
          setUser(data.user);
        } else {
          setUser(null);
        }
        logApiCall("GET", "/api/auth/me", res.status, duration, sizeKB, data);
      } catch (err) {
        logApiCall("GET", "/api/auth/me", 500, Math.round(performance.now() - start), 0, { error: String(err) });
      }
    },
    [getAuthHeaders, logApiCall]
  );

  const fetchTextFeed = useCallback(
    async (subject = subjectFilter, search = searchQuery, heavy = heavyPayloadMode) => {
      setFeedLoading(true);
      const start = performance.now();
      const url = `/api/feed/text?subject=${encodeURIComponent(subject)}&search=${encodeURIComponent(search)}&size=${
        heavy ? "large" : "normal"
      }&limit=6`;
      try {
        const res = await fetch(url, { cache: "no-store" });
        const text = await res.text();
        const duration = Math.round(performance.now() - start);
        const sizeKB = new Blob([text]).size / 1024;
        const data = JSON.parse(text);
        const list: ArticleItem[] = Array.isArray(data.articles) ? data.articles : [];
        setArticles(list);
        setFeedPayloadKB(Number(sizeKB.toFixed(2)));
        if (list.length > 0) {
          setSelectedArticle(list[0]);
        }
        logApiCall("GET", url, res.status, duration, sizeKB, {
          meta: data.meta,
          articleCount: list.length,
          sampleArticleTitle: list[0]?.title,
        });
      } catch (err) {
        logApiCall("GET", url, 500, Math.round(performance.now() - start), 0, { error: String(err) });
      } finally {
        setFeedLoading(false);
      }
    },
    [subjectFilter, searchQuery, heavyPayloadMode, logApiCall]
  );

  const fetchImagesCatalog = useCallback(async () => {
    const start = performance.now();
    const url = "/api/media/images?mode=list";
    try {
      const res = await fetch(url, { cache: "no-store" });
      const text = await res.text();
      const duration = Math.round(performance.now() - start);
      const sizeKB = new Blob([text]).size / 1024;
      const data = JSON.parse(text);
      const list: ImageMeta[] = Array.isArray(data.images) ? data.images : [];
      setImages(list);
      logApiCall("GET", url, res.status, duration, sizeKB, data);
    } catch (err) {
      logApiCall("GET", url, 500, Math.round(performance.now() - start), 0, { error: String(err) });
    }
  }, [logApiCall]);

  const fetchVideosCatalog = useCallback(async () => {
    const start = performance.now();
    const url = "/api/media/videos?mode=list";
    try {
      const res = await fetch(url, { cache: "no-store" });
      const text = await res.text();
      const duration = Math.round(performance.now() - start);
      const sizeKB = new Blob([text]).size / 1024;
      const data = JSON.parse(text);
      const list: VideoMeta[] = Array.isArray(data.videos) ? data.videos : [];
      setVideos(list);
      if (list.length > 0 && !activeVideo) {
        setActiveVideo(list[0]);
      }
      logApiCall("GET", url, res.status, duration, sizeKB, data);
    } catch (err) {
      logApiCall("GET", url, 500, Math.round(performance.now() - start), 0, { error: String(err) });
    }
  }, [activeVideo, logApiCall]);

  const fetchProtectedData = useCallback(
    async (tokenOverride?: string | null) => {
      const start = performance.now();
      setDataError("");
      try {
        const res = await fetch("/api/data", {
          headers: getAuthHeaders({}, tokenOverride),
          credentials: "include",
          cache: "no-store",
        });
        const text = await res.text();
        const duration = Math.round(performance.now() - start);
        const sizeKB = new Blob([text]).size / 1024;
        const data = JSON.parse(text);
        if (res.ok) {
          setItems(Array.isArray(data.items) ? data.items : []);
        } else {
          setDataError(data.error || "Unauthorized");
          setItems([]);
        }
        logApiCall("GET", "/api/data", res.status, duration, sizeKB, data);
      } catch (err) {
        logApiCall("GET", "/api/data", 500, Math.round(performance.now() - start), 0, { error: String(err) });
      }
    },
    [getAuthHeaders, logApiCall]
  );

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (savedToken) {
      setAuthToken(savedToken);
    }
    fetchHealth();
    checkAuth(savedToken);
    fetchTextFeed("All", "", false);
    fetchImagesCatalog();
    fetchVideosCatalog();
    fetchProtectedData(savedToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage("");
    const start = performance.now();
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const text = await res.text();
      const duration = Math.round(performance.now() - start);
      const sizeKB = new Blob([text]).size / 1024;
      const data = JSON.parse(text);
      logApiCall("POST", "/api/auth/login", res.status, duration, sizeKB, data);

      if (res.ok) {
        if (data.token) {
          localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
          setAuthToken(data.token);
        }
        setUser(data.user);
        setAuthMessage("Session active (Cookie + Bearer Token synced)");
        fetchProtectedData(data.token);
      } else {
        setAuthMessage(data.error || "Login failed");
      }
    } catch {
      setAuthMessage("Network error");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    const start = performance.now();
    const res = await fetch("/api/auth/logout", {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
    });
    const text = await res.text();
    const duration = Math.round(performance.now() - start);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setAuthToken(null);
    setUser(null);
    setItems([]);
    setAuthMessage("Logged out");
    logApiCall("POST", "/api/auth/logout", res.status, duration, new Blob([text]).size / 1024, JSON.parse(text));
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const start = performance.now();
    const res = await fetch("/api/data", {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      credentials: "include",
      body: JSON.stringify({ title: newTitle, category: newCategory }),
    });
    const text = await res.text();
    const duration = Math.round(performance.now() - start);
    const data = JSON.parse(text);
    logApiCall("POST", "/api/data", res.status, duration, new Blob([text]).size / 1024, data);
    if (res.ok) {
      setNewTitle("");
      fetchProtectedData();
    } else {
      setDataError(data.error || "Failed to create");
    }
  };

  const handleDeleteItem = async (id: string) => {
    const start = performance.now();
    const res = await fetch(`/api/data?id=${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
      credentials: "include",
    });
    const text = await res.text();
    const duration = Math.round(performance.now() - start);
    logApiCall("DELETE", `/api/data?id=${id}`, res.status, duration, new Blob([text]).size / 1024, JSON.parse(text));
    if (res.ok) {
      fetchProtectedData();
    }
  };

  const selectedParagraphs = selectedArticle
    ? Array.isArray(selectedArticle.body)
      ? selectedArticle.body
      : selectedArticle.content
      ? selectedArticle.content.split("\n\n")
      : [selectedArticle.summary]
    : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* TOP HEADER & SERVER TELEMETRY BAR */}
        <header className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">
                Full-Stack Multi-Media Portal
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mt-1">
              Next.js Study &amp; Media Platform
            </h1>
            <p className="text-slate-400 text-xs md:text-sm mt-0.5">
              Serving Long-Form Articles, Local High-Res JPEG &amp; Dynamic SVG Diagrams, Local MP4 Video Streams &amp; Protected APIs
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {health && (
              <div className="flex items-center gap-4 bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl text-xs font-mono">
                <div>
                  <span className="text-slate-500 block">UPTIME</span>
                  <span className="text-emerald-400 font-bold">{health.uptimeSeconds}s</span>
                </div>
                <div className="h-6 w-px bg-slate-800" />
                <div>
                  <span className="text-slate-500 block">HEAP RAM</span>
                  <span className="text-sky-400 font-bold">{health.memoryUsageMB} MB</span>
                </div>
                <div className="h-6 w-px bg-slate-800" />
                <div>
                  <span className="text-slate-500 block">AUTH</span>
                  <span className={user ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                    {user ? user.username : "Guest"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* MAIN LAYOUT: LEFT 8 COLS (MEDIA TABS) + RIGHT 4 COLS (AUTH & LIVE API TELEMETRY) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-5">
            {/* TAB BAR */}
            <div className="flex flex-wrap gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab("feed")}
                className={`flex-1 py-2.5 px-3 rounded-lg text-xs md:text-sm font-semibold transition cursor-pointer ${
                  activeTab === "feed"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                📄 Rich Text Feed ({articles.length})
              </button>
              <button
                onClick={() => setActiveTab("images")}
                className={`flex-1 py-2.5 px-3 rounded-lg text-xs md:text-sm font-semibold transition cursor-pointer ${
                  activeTab === "images"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                🖼️ High-Res Images ({images.length})
              </button>
              <button
                onClick={() => setActiveTab("videos")}
                className={`flex-1 py-2.5 px-3 rounded-lg text-xs md:text-sm font-semibold transition cursor-pointer ${
                  activeTab === "videos"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                🎬 Video Lectures ({videos.length})
              </button>
              <button
                onClick={() => setActiveTab("crud")}
                className={`flex-1 py-2.5 px-3 rounded-lg text-xs md:text-sm font-semibold transition cursor-pointer ${
                  activeTab === "crud"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                🔒 Protected Data ({items.length})
              </button>
            </div>

            {/* TAB 1: RICH TEXT & LONG-FORM ARTICLES FEED */}
            {activeTab === "feed" && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Technical Study Notes &amp; Articles (`/api/feed/text`)
                    </h2>
                    <p className="text-xs text-slate-400">
                      Multi-paragraph engineering modules ({feedPayloadKB} KB JSON payload)
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={subjectFilter}
                      onChange={(e) => {
                        setSubjectFilter(e.target.value);
                        fetchTextFeed(e.target.value, searchQuery, heavyPayloadMode);
                      }}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                    >
                      <option value="All">All Subjects</option>
                      <option value="Physics">Physics</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Computer Science">Computer Science</option>
                    </select>

                    <label className="flex items-center gap-1.5 text-xs bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={heavyPayloadMode}
                        onChange={(e) => {
                          setHeavyPayloadMode(e.target.checked);
                          fetchTextFeed(subjectFilter, searchQuery, e.target.checked);
                        }}
                      />
                      <span>Expanded 120KB Mode</span>
                    </label>

                    <button
                      onClick={() => fetchTextFeed(subjectFilter, searchQuery, heavyPayloadMode)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      {feedLoading ? "Loading..." : "Refresh"}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search articles by keyword (e.g., Faraday, Calculus, Consensus)..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => fetchTextFeed(subjectFilter, searchQuery, heavyPayloadMode)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Search
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-5 space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                    {articles.map((art) => (
                      <div
                        key={art.id}
                        onClick={() => setSelectedArticle(art)}
                        className={`p-3.5 rounded-xl border transition cursor-pointer ${
                          selectedArticle?.id === art.id
                            ? "bg-indigo-950/50 border-indigo-500"
                            : "bg-slate-950 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                          <span className="text-indigo-400 font-semibold">{art.subject || art.category}</span>
                          <span>{art.readTimeMinutes} min read</span>
                        </div>
                        <h3 className="text-sm font-bold text-white mt-1 line-clamp-2">{art.title}</h3>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{art.summary}</p>
                      </div>
                    ))}
                  </div>

                  <div className="md:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-4 max-h-[460px] overflow-y-auto">
                    {selectedArticle ? (
                      <article className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                          <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded">
                            {selectedArticle.subject || selectedArticle.category}
                          </span>
                          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded">
                            {selectedArticle.difficulty}
                          </span>
                          <span className="text-slate-500">{(selectedArticle.views || 0).toLocaleString()} views</span>
                        </div>

                        <h3 className="text-lg font-bold text-white">{selectedArticle.title}</h3>
                        <p className="text-xs text-slate-400">
                          By <strong className="text-slate-200">{selectedArticle.author || "Faculty Author"}</strong> •{" "}
                          {new Date(
                            selectedArticle.publishedAt || selectedArticle.updatedAt || Date.now()
                          ).toLocaleDateString()}
                        </p>

                        {selectedArticle.formulaHighlight && (
                          <div className="p-3 bg-slate-900 border border-indigo-500/30 rounded-lg font-mono text-xs text-indigo-300">
                            Formula Key: {selectedArticle.formulaHighlight}
                          </div>
                        )}

                        <div className="space-y-3 text-xs md:text-sm text-slate-300 leading-relaxed">
                          {selectedParagraphs.map((paragraph, index) => (
                            <p key={index}>{paragraph}</p>
                          ))}
                        </div>
                      </article>
                    ) : (
                      <p className="text-xs text-slate-500">Select an article to read.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: HIGH-RES IMAGES & DYNAMIC SERVER SVG RENDERING */}
            {activeTab === "images" && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Scientific Image &amp; Vector Diagram Gallery (`/api/media/images`)
                    </h2>
                    <p className="text-xs text-slate-400">
                      Switch between Local High-Res JPEGs (`public/media/images/*.jpg`) and Dynamic Lorenz/Fourier Server SVGs
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setImageMode("external-hd")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                        imageMode === "external-hd"
                          ? "bg-sky-600 text-white"
                          : "bg-slate-950 text-slate-400 border border-slate-800"
                      }`}
                    >
                      Local HD JPEG Photos
                    </button>
                    <button
                      onClick={() => setImageMode("server-svg")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                        imageMode === "server-svg"
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-950 text-slate-400 border border-slate-800"
                      }`}
                    >
                      Dynamic Server SVG
                    </button>
                    <button
                      onClick={() => setImageCacheBuster((c) => c + 1)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Reload Images
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {images.map((img) => {
                    const baseStream = img.streamUrl || img.serverStreamUrl || `/api/media/images?mode=render&id=${img.id}`;
                    const baseHd = img.hdUrl || img.externalThumb || `/api/media/images?mode=jpg&id=${img.id}`;
                    const src =
                      imageMode === "server-svg"
                        ? `${baseStream}&t=${imageCacheBuster}`
                        : `${baseHd}&t=${imageCacheBuster}`;
                    const sizeKB =
                      imageMode === "server-svg"
                        ? 38
                        : img.estimatedSizeKB || Math.round((img.approxServerBytes || 250000) / 1024);
                    return (
                      <div
                        key={img.id}
                        className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between group"
                      >
                        <div>
                          <div className="relative h-44 bg-slate-900 overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={src}
                              alt={img.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                            <span className="absolute top-2 right-2 bg-slate-950/80 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-mono text-sky-300">
                              {imageMode === "server-svg" ? "1200x750 SVG" : img.resolution}
                            </span>
                          </div>
                          <div className="p-3">
                            <span className="text-[11px] font-mono text-indigo-400">{img.category}</span>
                            <h3 className="text-xs font-bold text-white mt-0.5">{img.title}</h3>
                          </div>
                        </div>

                        <div className="px-3 pb-3 pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] font-mono text-slate-500">
                          <span>{imageMode === "server-svg" ? "image/svg+xml" : "image/jpeg"}</span>
                          <span>~{sizeKB} KB</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: VIDEO STREAMING */}
            {activeTab === "videos" && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-lg font-bold text-white">
                    Local MP4 Video Lectures (`/api/media/videos`)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Streamed from `public/media/videos/*.mp4` with HTTP 206 Partial Content byte-range support
                  </p>
                </div>

                {activeVideo && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-7 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                      <video
                        key={activeVideo.id}
                        src={activeVideo.mp4Url || activeVideo.streamUrl || `/api/media/videos?mode=stream&id=${activeVideo.id}`}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full aspect-video bg-black"
                      >
                        Your browser does not support HTML5 video.
                      </video>
                      <div className="p-4 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-mono text-indigo-400">
                          <span>{activeVideo.category}</span>
                          <span>
                            {activeVideo.resolution} • {activeVideo.duration}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white">{activeVideo.title}</h3>
                        <p className="text-xs text-slate-400">
                          {activeVideo.description || `Instructor: ${activeVideo.instructor}`}
                        </p>
                      </div>
                    </div>

                    <div className="md:col-span-5 space-y-2.5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Select Lecture Stream
                      </p>
                      {videos.map((v) => (
                        <div
                          key={v.id}
                          onClick={() => setActiveVideo(v)}
                          className={`p-3 rounded-xl border transition cursor-pointer ${
                            activeVideo.id === v.id
                              ? "bg-indigo-950/50 border-indigo-500"
                              : "bg-slate-950 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                            <span className="text-sky-400">{v.resolution}</span>
                            <span>{v.sizeMB} MB</span>
                          </div>
                          <h4 className="text-xs font-bold text-white mt-1">{v.title}</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">{v.instructor}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: PROTECTED CRUD API */}
            {activeTab === "crud" && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-white">Protected Database Records (`/api/data`)</h2>
                    <p className="text-xs text-slate-400">
                      Requires valid Session Cookie or Bearer Token in Authorization header
                    </p>
                  </div>
                  <button
                    onClick={() => fetchProtectedData()}
                    className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer"
                  >
                    Refresh Items
                  </button>
                </div>

                {dataError ? (
                  <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300">
                    🔒 {dataError} — Sign in using the Authentication panel on the right to unlock CRUD operations.
                  </div>
                ) : (
                  <>
                    <form onSubmit={handleCreateItem} className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Add new record..."
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      />
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      >
                        <option>Performance</option>
                        <option>Media Stream</option>
                        <option>Security</option>
                      </select>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs cursor-pointer"
                      >
                        + Add Record
                      </button>
                    </form>

                    <div className="space-y-2">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between bg-slate-950 border border-slate-800 p-3 rounded-xl"
                        >
                          <div>
                            <p className="text-xs font-bold text-white">{item.title}</p>
                            <span className="text-[11px] font-mono text-slate-400">
                              {item.category} • ID: {item.id}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* RIGHT 4 COLUMNS: AUTH PANEL & API LOGS */}
          <div className="lg:col-span-4 space-y-5">
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400">
                  1. Hybrid Session Auth
                </h2>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-mono ${
                    user ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                  }`}
                >
                  {user ? `Logged in (${user.username})` : "Unauthenticated"}
                </span>
              </div>

              {!user ? (
                <form onSubmit={handleLogin} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      placeholder="Username"
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                      placeholder="Password"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs cursor-pointer"
                  >
                    {authLoading ? "Signing in..." : "Login (Sync Cookie + Token)"}
                  </button>
                </form>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => checkAuth()}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg cursor-pointer"
                  >
                    Verify Session
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex-1 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs rounded-lg cursor-pointer"
                  >
                    Logout
                  </button>
                </div>
              )}

              {authMessage && <p className="text-xs text-slate-400 font-mono">{authMessage}</p>}
            </section>

            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-sky-400">
                  2. API Activity Log
                </h2>
                <button
                  onClick={() => setLogs([])}
                  className="text-[11px] text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  Clear
                </button>
              </div>

              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 font-mono text-[11px]">
                {logs.length === 0 ? (
                  <p className="text-slate-500">No requests logged yet.</p>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between bg-slate-950 border border-slate-800/80 px-2.5 py-1.5 rounded-lg"
                    >
                      <div className="truncate pr-2">
                        <span className="text-indigo-400 font-bold mr-1.5">{log.method}</span>
                        <span className="text-slate-300">{log.endpoint}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-slate-400">{log.sizeKB}KB</span>
                        <span className="text-amber-300">{log.durationMs}ms</span>
                        <span
                          className={
                            log.status >= 200 && log.status < 300 ? "text-emerald-400 font-bold" : "text-rose-400"
                          }
                        >
                          {log.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-slate-800">
                <p className="text-[11px] font-mono text-slate-400 mb-1.5">Latest API Response Preview:</p>
                <pre className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-48">
                  {lastJsonResponse}
                </pre>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
