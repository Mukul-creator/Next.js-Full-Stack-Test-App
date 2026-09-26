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

interface WaterfallStep {
  name: string;
  endpoint: string;
  type: "JSON" | "TEXT" | "IMAGE" | "VIDEO" | "AUTH";
  status: number;
  latencyMs: number;
  sizeKB: number;
  ok: boolean;
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

  const [waterfallSteps, setWaterfallSteps] = useState<WaterfallStep[]>([]);
  const [waterfallRunning, setWaterfallRunning] = useState(false);
  const [waterfallTotalMs, setWaterfallTotalMs] = useState<number | null>(null);

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
  const [selectedImage, setSelectedImage] = useState<ImageMeta | null>(null);
  const [binaryProbeResult, setBinaryProbeResult] = useState<{ id: string; sizeKB: number; ms: number } | null>(null);

  const [videos, setVideos] = useState<VideoMeta[]>([]);
  const [activeVideo, setActiveVideo] = useState<VideoMeta | null>(null);
  const [chunkStreamStats, setChunkStreamStats] = useState<{
    chunksLoaded: number;
    totalKB: number;
    lastLatencyMs: number;
    speedMBps: number;
    contentRange: string;
  }>({ chunksLoaded: 0, totalKB: 0, lastLatencyMs: 0, speedMBps: 0, contentRange: "bytes 0-0/0" });
  const [chunkStreaming, setChunkStreaming] = useState(false);

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
      if (list.length > 0 && !selectedImage) {
        setSelectedImage(list[0]);
      }
      logApiCall("GET", url, res.status, duration, sizeKB, data);
    } catch (err) {
      logApiCall("GET", url, 500, Math.round(performance.now() - start), 0, { error: String(err) });
    }
  }, [selectedImage, logApiCall]);

  const probeImageBinary = async (imgId: string) => {
    const start = performance.now();
    const modeParam = imageMode === "external-hd" ? "jpg" : "render";
    const url = `/api/media/images?mode=${modeParam}&id=${imgId}&t=${Date.now()}`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      const blob = await res.blob();
      const duration = Math.round(performance.now() - start);
      const sizeKB = blob.size / 1024;
      setBinaryProbeResult({ id: imgId, sizeKB: Number(sizeKB.toFixed(2)), ms: duration });
      logApiCall("GET", `/api/media/images?mode=${modeParam}&id=${imgId}`, res.status, duration, sizeKB, {
        binaryStream: blob.type || "image/jpeg",
        imageId: imgId,
        bytesDownloaded: blob.size,
        latencyMs: duration,
      });
    } catch (err) {
      logApiCall("GET", url, 500, Math.round(performance.now() - start), 0, { error: String(err) });
    }
  };

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

  const streamVideoChunk = async (vidId: string, chunkKB = 256) => {
    setChunkStreaming(true);
    const start = performance.now();
    const byteStart = (chunkStreamStats.chunksLoaded * 65536) % (256 * 1024);
    const byteEnd = byteStart + chunkKB * 1024 - 1;
    const url = `/api/media/videos?mode=stream&id=${vidId}&chunkKB=${chunkKB}`;
    try {
      const res = await fetch(url, {
        headers: { Range: `bytes=${byteStart}-${byteEnd}` },
        cache: "no-store",
      });
      const buffer = await res.arrayBuffer();
      const duration = Math.max(1, Math.round(performance.now() - start));
      const downloadedKB = buffer.byteLength / 1024;
      const speedMBps = Number(((downloadedKB / 1024) / (duration / 1000)).toFixed(2));
      const contentRange = res.headers.get("Content-Range") || `bytes ${byteStart}-${byteEnd}/*`;

      setChunkStreamStats((prev) => ({
        chunksLoaded: prev.chunksLoaded + 1,
        totalKB: Number((prev.totalKB + downloadedKB).toFixed(1)),
        lastLatencyMs: duration,
        speedMBps,
        contentRange,
      }));

      logApiCall("GET (206)", url, res.status, duration, downloadedKB, {
        streamType: "video/mp4 (Local Disk MP4 Byte-Range)",
        status: res.status,
        contentRange,
        chunkSizeKB: Number(downloadedKB.toFixed(2)),
        throughputMBps: speedMBps,
      });
    } catch (err) {
      logApiCall("GET (206)", url, 500, Math.round(performance.now() - start), 0, { error: String(err) });
    } finally {
      setChunkStreaming(false);
    }
  };

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

  const runRealWorldWaterfall = async () => {
    setWaterfallRunning(true);
    setWaterfallSteps([]);
    const overallStart = performance.now();

    const tasks: Array<{
      name: string;
      endpoint: string;
      type: WaterfallStep["type"];
      headers?: Record<string, string>;
    }> = [
      { name: "1. Server Telemetry", endpoint: "/api/health", type: "JSON" },
      { name: "2. Session Auth Check", endpoint: "/api/auth/me", type: "AUTH", headers: getAuthHeaders() },
      { name: "3. Study Feed (Large Text)", endpoint: "/api/feed/text?subject=All&size=large", type: "TEXT" },
      { name: "4. Local HD Image (JPEG)", endpoint: "/api/media/images?mode=jpg&id=img-1", type: "IMAGE" },
      { name: "5. Local MP4 Video (256KB)", endpoint: "/api/media/videos?mode=stream&id=vid-1&chunkKB=256", type: "VIDEO" },
      { name: "6. Dashboard Crypto Init", endpoint: "/api/scenario/dashboard-init", type: "JSON", headers: getAuthHeaders() },
    ];

    const results = await Promise.all(
      tasks.map(async (t) => {
        const tStart = performance.now();
        try {
          const res = await fetch(t.endpoint, {
            headers: t.headers || {},
            credentials: "include",
            cache: "no-store",
          });
          const buf = await res.arrayBuffer();
          const latencyMs = Math.round(performance.now() - tStart);
          const sizeKB = Number((buf.byteLength / 1024).toFixed(2));
          logApiCall("WATERFALL", t.endpoint, res.status, latencyMs, sizeKB);
          return {
            name: t.name,
            endpoint: t.endpoint,
            type: t.type,
            status: res.status,
            latencyMs,
            sizeKB,
            ok: res.ok || res.status === 206,
          };
        } catch {
          return {
            name: t.name,
            endpoint: t.endpoint,
            type: t.type,
            status: 500,
            latencyMs: Math.round(performance.now() - tStart),
            sizeKB: 0,
            ok: false,
          };
        }
      })
    );

    setWaterfallSteps(results);
    setWaterfallTotalMs(Math.round(performance.now() - overallStart));
    setWaterfallRunning(false);
    fetchHealth();
  };

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
                Production Multi-Media Benchmark Suite
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mt-1">
              Next.js Real-World Media &amp; Multi-API Test Lab
            </h1>
            <p className="text-slate-400 text-xs md:text-sm mt-0.5">
              Simulating concurrent Text Feeds, Binary Image Rendering, HTTP 206 Video Streaming &amp; Protected Auth APIs
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

            <button
              onClick={runRealWorldWaterfall}
              disabled={waterfallRunning}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-semibold rounded-xl text-xs md:text-sm shadow-lg transition cursor-pointer disabled:opacity-50"
            >
              {waterfallRunning ? "Running 6 Parallel APIs..." : "⚡ Run 6-API Waterfall Burst"}
            </button>
          </div>
        </header>

        {/* REAL-WORLD 6-API PARALLEL WATERFALL RESULTS BANNER */}
        {waterfallSteps.length > 0 && (
          <section className="bg-slate-900/90 border border-indigo-500/40 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400">
                  Parallel Multi-API Waterfall Benchmark (Text + Image + Video + Auth)
                </h2>
                <p className="text-xs text-slate-400">
                  All 6 heterogeneous endpoints executed concurrently via Promise.all()
                </p>
              </div>
              <div className="text-xs font-mono bg-indigo-950/70 border border-indigo-700/50 px-3 py-1.5 rounded-lg text-indigo-300">
                Total Wall Time: <strong className="text-white">{waterfallTotalMs} ms</strong> | Total Transferred:{" "}
                <strong className="text-emerald-400">
                  {waterfallSteps.reduce((acc, s) => acc + s.sizeKB, 0).toFixed(1)} KB
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
              {waterfallSteps.map((step) => (
                <div
                  key={step.name}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300">{step.type}</span>
                      <span className={step.ok ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                        HTTP {step.status}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-white mt-2 truncate">{step.name}</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-900 flex items-center justify-between text-xs font-mono">
                    <span className="text-amber-300">{step.latencyMs} ms</span>
                    <span className="text-slate-400">{step.sizeKB} KB</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* MAIN LAYOUT: LEFT 8 COLS (MEDIA TABS) + RIGHT 4 COLS (AUTH & LIVE API TELEMETRY) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT 8 COLUMNS: TABS FOR TEXT, IMAGES, VIDEOS, CRUD */}
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
                🎬 Video Streaming ({videos.length})
              </button>
              <button
                onClick={() => setActiveTab("crud")}
                className={`flex-1 py-2.5 px-3 rounded-lg text-xs md:text-sm font-semibold transition cursor-pointer ${
                  activeTab === "crud"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                🔒 Protected CRUD ({items.length})
              </button>
            </div>

            {/* TAB 1: RICH TEXT & LONG-FORM ARTICLES FEED */}
            {activeTab === "feed" && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Long-Form Technical Text &amp; Study Feed (`/api/feed/text`)
                    </h2>
                    <p className="text-xs text-slate-400">
                      Tests JSON serialization, search filtering, and large text payload compression ({feedPayloadKB}{" "}
                      KB transferred)
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
                      <span>Heavy 120KB Text Mode</span>
                    </label>

                    <button
                      onClick={() => fetchTextFeed(subjectFilter, searchQuery, heavyPayloadMode)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      {feedLoading ? "Loading..." : "Reload Text API"}
                    </button>
                  </div>
                </div>

                {/* Search Input */}
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
                    Search API
                  </button>
                </div>

                {/* Article List + Reader Split View */}
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
                      <p className="text-xs text-slate-500">Select an article to inspect full text payload.</p>
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
                      Dynamic Binary Image &amp; Diagram Stream (`/api/media/images`)
                    </h2>
                    <p className="text-xs text-slate-400">
                      Streams multi-kilobyte high-resolution SVG scientific diagrams directly from your mobile server or
                      external HD CDN
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
                      Local HD JPEG Stream (156KB–1.1MB)
                    </button>
                    <button
                      onClick={() => setImageMode("server-svg")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                        imageMode === "server-svg"
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-950 text-slate-400 border border-slate-800"
                      }`}
                    >
                      Dynamic Server SVG (24KB)
                    </button>
                    <button
                      onClick={() => setImageCacheBuster((c) => c + 1)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Force Re-Fetch All Images
                    </button>
                  </div>
                </div>

                {binaryProbeResult && (
                  <div className="bg-emerald-950/40 border border-emerald-600/40 rounded-xl p-3 flex items-center justify-between text-xs font-mono">
                    <span className="text-emerald-300">
                      Binary Image Probe Completed (`{binaryProbeResult.id}`):
                    </span>
                    <span className="text-white font-bold">
                      {binaryProbeResult.sizeKB} KB downloaded in {binaryProbeResult.ms} ms
                    </span>
                  </div>
                )}

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
                        ? 24
                        : img.estimatedSizeKB || Math.round((img.approxServerBytes || 250000) / 1024);
                    return (
                      <div
                        key={img.id}
                        className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between group"
                      >
                        <div>
                          <div className="relative h-40 bg-slate-900 overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={src}
                              alt={img.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              loading="lazy"
                            />
                            <span className="absolute top-2 right-2 bg-slate-950/80 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-mono text-sky-300">
                              {img.resolution}
                            </span>
                          </div>
                          <div className="p-3">
                            <span className="text-[11px] font-mono text-indigo-400">{img.category}</span>
                            <h3 className="text-xs font-bold text-white mt-0.5">{img.title}</h3>
                          </div>
                        </div>

                        <div className="px-3 pb-3 pt-2 border-t border-slate-900 flex items-center justify-between">
                          <span className="text-[11px] font-mono text-slate-500">~{sizeKB} KB</span>
                          <button
                            onClick={() => probeImageBinary(img.id)}
                            className="text-xs font-mono text-emerald-400 hover:text-emerald-300 cursor-pointer"
                          >
                            Benchmark Stream →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: VIDEO STREAMING & HTTP 206 CHUNK BENCHMARK */}
            {activeTab === "videos" && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Local MP4 Video Player &amp; HTTP 206 Partial Content Streamer (`/api/media/videos`)
                    </h2>
                    <p className="text-xs text-slate-400">
                      Streams real local MP4 files (`public/media/videos/*.mp4`) from your server with HTTP 206
                      byte-range support
                    </p>
                  </div>

                  {activeVideo && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => streamVideoChunk(activeVideo.id, 256)}
                        disabled={chunkStreaming}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                      >
                        {chunkStreaming ? "Streaming..." : "Stream 256KB Video Chunk"}
                      </button>
                      <button
                        onClick={() => streamVideoChunk(activeVideo.id, 512)}
                        disabled={chunkStreaming}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                      >
                        Stream 512KB Chunk
                      </button>
                    </div>
                  )}
                </div>

                {/* Binary Video Chunk Telemetry Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 block">CHUNKS STREAMED</span>
                    <span className="text-white font-bold text-sm">{chunkStreamStats.chunksLoaded}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">BINARY DOWNLOADED</span>
                    <span className="text-emerald-400 font-bold text-sm">{chunkStreamStats.totalKB} KB</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">CHUNK LATENCY</span>
                    <span className="text-amber-300 font-bold text-sm">{chunkStreamStats.lastLatencyMs} ms</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">STREAM SPEED</span>
                    <span className="text-sky-400 font-bold text-sm">{chunkStreamStats.speedMBps} MB/s</span>
                  </div>
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
                        <p className="text-[11px] font-mono text-slate-500 pt-1">
                          Content-Range Header: {chunkStreamStats.contentRange}
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
                    <h2 className="text-lg font-bold text-white">Protected Database CRUD (`/api/data`)</h2>
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
                        placeholder="Add new benchmark task..."
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

          {/* RIGHT 4 COLUMNS: AUTH PANEL & LIVE NETWORK / PAYLOAD INSPECTOR */}
          <div className="lg:col-span-4 space-y-5">
            {/* AUTHENTICATION PANEL */}
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

            {/* LIVE NETWORK TRAFFIC & PAYLOAD SIZE LOG */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-sky-400">
                  2. Live API &amp; Media Traffic
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
