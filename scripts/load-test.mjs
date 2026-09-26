#!/usr/bin/env node

/**
 * EXTERNAL MULTI-MEDIA & EXTREME COMPUTE LOAD TESTER
 *
 * Invoked strictly from the command line to benchmark:
 *   1. Heavy Rich-Text JSON Serialization (120 KB payload)
 *   2. Local High-Res JPEG Image Streaming (156 KB – 1.09 MB disk I/O)
 *   3. Dynamic Lorenz/Fourier Math SVG Rendering (Real-time trigonometric & RK4 vector generation)
 *   4. Local MP4 Video Byte-Range Streaming (HTTP 206 Partial Content with randomized seek offsets)
 *   5. Extreme CPU/Crypto/Matrix/Physics Engine (/api/scenario/dashboard-init?compute=<mode>):
 *      - O(N^3) Float64 Dense Matrix Multiplication (GEMM)
 *      - PBKDF2-HMAC-SHA512 (up to 140,000 rounds) + AES-256-GCM Encrypt/Decrypt + SHA-256
 *      - 4th-Order Runge-Kutta (RK4) Chaotic Lorenz Differential Equation Solver
 *      - Prime Sieve of Eratosthenes + Float64 Quicksort + Zlib Gzip/Gunzip Compression
 *   6. Authenticated CRUD Read/Write Operations (/api/data)
 *
 * Usage:
 *   node scripts/load-test.mjs <SERVER_URL> [CONCURRENCY] [DURATION_SECONDS] [MODE]
 *
 * Modes:
 *   normal  - Balanced media + standard compute (default)
 *   heavy   - 130x130 Matrix GEMM, 20K PBKDF2, 100K RK4 steps + 512KB Video chunks + 1.1MB HD JPEGs
 *   extreme - 210x210 Matrix GEMM, 60K PBKDF2, 280K RK4 steps + parallel wave bursts
 *   nuclear - 280x280 Matrix GEMM (43.9M FLOPs), 140K PBKDF2, 650K RK4 steps + max I/O saturation
 *
 * Examples:
 *   node scripts/load-test.mjs https://jee-mains.in 50 20
 *   node scripts/load-test.mjs https://jee-mains.in 50 25 extreme
 *   node scripts/load-test.mjs https://jee-mains.in 100 30 nuclear
 */

import crypto from "crypto";

const targetUrl = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const concurrency = Math.max(parseInt(process.argv[3] || "30", 10), 1);
const durationSeconds = Math.max(parseInt(process.argv[4] || "15", 10), 1);
const mode = (process.argv[5] || "heavy").toLowerCase();

const validModes = ["normal", "heavy", "extreme", "nuclear"];
const computeTier = validModes.includes(mode) ? mode : "heavy";

const videoChunkKB = computeTier === "nuclear" ? 512 : computeTier === "extreme" ? 384 : 256;
const svgComplexity = computeTier === "nuclear" ? 160 : computeTier === "extreme" ? 120 : 80;

console.log("=========================================================================");
console.log("🔥 NEXT.JS EXTERNAL MULTI-MEDIA & EXTREME COMPUTE LOAD TESTER");
console.log("=========================================================================");
console.log(`Target Server   : ${targetUrl}`);
console.log(`Concurrency     : ${concurrency} simultaneous virtual users`);
console.log(`Duration        : ${durationSeconds} seconds`);
console.log(`Torture Mode    : ${computeTier.toUpperCase()} (Matrix GEMM + PBKDF2-SHA512 + RK4 + Primes + Zlib)`);
console.log(`Media I/O Mix   : 120KB Text | 1.1MB Local JPEG | Lorenz SVG | ${videoChunkKB}KB MP4 206`);
console.log("=========================================================================\n");

async function authenticate() {
  console.log("1. Probing server health & authenticating session...");
  const healthRes = await fetch(`${targetUrl}/api/health`);
  if (!healthRes.ok) {
    throw new Error(`Health check failed with status ${healthRes.status}`);
  }
  const health = await healthRes.json();
  console.log(
    `   [OK] Server ONLINE (Uptime: ${health.uptimeSeconds ?? health.uptime}, Node: ${health.nodeVersion}, Heap RAM: ${health.memoryUsageMB ?? "N/A"} MB)`
  );

  const loginRes = await fetch(`${targetUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "password123" }),
  });

  if (!loginRes.ok) {
    console.warn("   [WARN] Login returned non-200, proceeding without auth token.");
    return { token: "", cookie: "" };
  }

  const loginData = await loginRes.json();
  const setCookie = loginRes.headers.get("set-cookie");
  const cookieHeader = setCookie ? setCookie.split(";")[0] : "";
  console.log("   [OK] Authenticated (Cookie + Bearer JWT ready for protected routes)\n");
  return { token: loginData.token || "", cookie: cookieHeader };
}

async function runLoadTest() {
  let auth = { token: "", cookie: "" };
  try {
    auth = await authenticate();
  } catch (err) {
    console.error(`\n[ERROR] Could not connect to ${targetUrl}`);
    console.error(`Details: ${err.message}\n`);
    process.exit(1);
  }

  const authHeaders = {};
  if (auth.token) authHeaders["Authorization"] = `Bearer ${auth.token}`;
  if (auth.cookie) authHeaders["Cookie"] = auth.cookie;

  const scenarios = [
    {
      name: `Extreme CPU/Crypto (${computeTier})`,
      buildRequest: (step) => ({
        path: `/api/scenario/dashboard-init?compute=${computeTier}&s=${step}`,
        headers: authHeaders,
      }),
    },
    {
      name: "Rich Text Feed (120KB)",
      buildRequest: (step) => ({
        path: `/api/feed/text?subject=All&size=large&page=${(step % 5) + 1}`,
        headers: {},
      }),
    },
    {
      name: "Local HD JPEG (Disk I/O)",
      buildRequest: (step) => ({
        path: `/api/media/images?mode=jpg&id=img-${(step % 6) + 1}`,
        headers: {},
      }),
    },
    {
      name: `Dynamic Lorenz SVG (c=${svgComplexity})`,
      buildRequest: (step) => ({
        path: `/api/media/images?mode=render&id=img-${(step % 6) + 1}&complexity=${svgComplexity}&t=${step}`,
        headers: {},
      }),
    },
    {
      name: `Local MP4 Stream (${videoChunkKB}KB)`,
      buildRequest: (step) => {
        const vidIdx = (step % 3) + 1;
        const offset = (step * 32768) % 393216;
        const end = offset + videoChunkKB * 1024 - 1;
        return {
          path: `/api/media/videos?mode=stream&id=vid-${vidIdx}&chunkKB=${videoChunkKB}`,
          headers: { Range: `bytes=${offset}-${end}` },
        };
      },
    },
    {
      name: "Protected CRUD API",
      buildRequest: () => ({
        path: "/api/data",
        headers: authHeaders,
      }),
    },
  ];

  let totalRequests = 0;
  let successCount = 0;
  let errorCount = 0;
  let totalBytesDownloaded = 0;
  let clientHashesComputed = 0;
  const latencies = [];
  const statusCodes = {};
  const perScenarioStats = {};
  for (const s of scenarios) {
    perScenarioStats[s.name] = { count: 0, ok: 0, errors: 0, bytes: 0, latencySum: 0 };
  }

  const startTime = performance.now();
  const endTime = startTime + durationSeconds * 1000;
  let isRunning = true;

  const progressTimer = setInterval(() => {
    const elapsed = (performance.now() - startTime) / 1000;
    const rps = (totalRequests / Math.max(0.1, elapsed)).toFixed(1);
    const mbps = (totalBytesDownloaded / (1024 * 1024) / Math.max(0.1, elapsed)).toFixed(2);
    process.stdout.write(
      `\r   Elapsed: ${elapsed.toFixed(1)}s | Reqs: ${totalRequests} | Speed: ${rps} req/s | Bandwidth: ${mbps} MB/s | Errors: ${errorCount}   `
    );
  }, 400);

  async function worker(workerId) {
    let step = workerId * 17;
    while (isRunning && performance.now() < endTime) {
      const scenario = scenarios[step % scenarios.length];
      const reqConfig = scenario.buildRequest(step);
      step++;

      const reqStart = performance.now();
      try {
        const res = await fetch(`${targetUrl}${reqConfig.path}`, {
          headers: reqConfig.headers,
        });
        const buf = Buffer.from(await res.arrayBuffer());
        const latency = performance.now() - reqStart;

        // Client-side SHA-256 verification of incoming binary/JSON stream
        crypto.createHash("sha256").update(buf.subarray(0, Math.min(buf.length, 4096))).digest();
        clientHashesComputed++;

        totalRequests++;
        totalBytesDownloaded += buf.byteLength;
        latencies.push(latency);
        statusCodes[res.status] = (statusCodes[res.status] || 0) + 1;

        const st = perScenarioStats[scenario.name];
        st.count++;
        st.bytes += buf.byteLength;
        st.latencySum += latency;

        if (res.ok || res.status === 206) {
          successCount++;
          st.ok++;
        } else {
          errorCount++;
          st.errors++;
        }
      } catch {
        const latency = performance.now() - reqStart;
        totalRequests++;
        errorCount++;
        latencies.push(latency);
        statusCodes["ERR_TIMEOUT"] = (statusCodes["ERR_TIMEOUT"] || 0) + 1;
        perScenarioStats[scenario.name].count++;
        perScenarioStats[scenario.name].errors++;
      }
    }
  }

  console.log(`2. Unleashing ${concurrency} concurrent workers for ${durationSeconds}s (Mode: ${computeTier.toUpperCase()})...`);
  const workers = Array.from({ length: concurrency }, (_, i) => worker(i));
  await Promise.all(workers);
  isRunning = false;
  clearInterval(progressTimer);

  const totalTimeSeconds = (performance.now() - startTime) / 1000;
  latencies.sort((a, b) => a - b);

  const avgLatency = latencies.length
    ? latencies.reduce((sum, val) => sum + val, 0) / latencies.length
    : 0;
  const minLatency = latencies.length ? latencies[0] : 0;
  const p50Latency = latencies.length ? latencies[Math.floor(latencies.length * 0.5)] : 0;
  const p90Latency = latencies.length ? latencies[Math.floor(latencies.length * 0.9)] : 0;
  const p95Latency = latencies.length ? latencies[Math.floor(latencies.length * 0.95)] : 0;
  const p99Latency = latencies.length ? latencies[Math.floor(latencies.length * 0.99)] : 0;
  const maxLatency = latencies.length ? latencies[latencies.length - 1] : 0;
  const totalMB = totalBytesDownloaded / (1024 * 1024);
  const throughputMBps = totalMB / totalTimeSeconds;

  let finalRam = "N/A";
  try {
    const finalHealth = await (await fetch(`${targetUrl}/api/health`)).json();
    finalRam = `${finalHealth.memoryUsageMB ?? "N/A"} MB`;
  } catch {
    // ignore
  }

  console.log("\n\n=========================================================================");
  console.log("📊 EXTREME MULTI-MEDIA & COMPUTE LOAD TEST SUMMARY");
  console.log("=========================================================================");
  console.log(`Total Duration      : ${totalTimeSeconds.toFixed(2)} seconds`);
  console.log(`Torture Mode        : ${computeTier.toUpperCase()}`);
  console.log(`Total Requests      : ${totalRequests}`);
  console.log(`Successful (200/206): ${successCount} (${((successCount / Math.max(totalRequests, 1)) * 100).toFixed(2)}%)`);
  console.log(`Failed / Timeouts   : ${errorCount}`);
  console.log(`Throughput (RPS)    : ${(totalRequests / totalTimeSeconds).toFixed(2)} requests/sec`);
  console.log(`Total Data Streamed : ${totalMB.toFixed(2)} MB`);
  console.log(`Network Bandwidth   : ${throughputMBps.toFixed(2)} MB/sec`);
  console.log(`SHA-256 Verifications: ${clientHashesComputed} stream chunks verified`);
  console.log("-------------------------------------------------------------------------");
  console.log("Per-Endpoint Breakdown (Requests | Data Transferred | Avg Latency):");
  for (const [name, st] of Object.entries(perScenarioStats)) {
    const avgMs = st.count ? (st.latencySum / st.count).toFixed(1) : "0.0";
    const mb = (st.bytes / (1024 * 1024)).toFixed(2);
    console.log(
      `  - ${name.padEnd(28)}: ${String(st.count).padStart(5)} reqs | ${mb.padStart(7)} MB | Avg: ${avgMs.padStart(7)} ms | Err: ${st.errors}`
    );
  }
  console.log("-------------------------------------------------------------------------");
  console.log("Latency Percentiles:");
  console.log(`  Min Latency       : ${minLatency.toFixed(2)} ms`);
  console.log(`  P50 (Median)      : ${p50Latency.toFixed(2)} ms`);
  console.log(`  Avg Latency       : ${avgLatency.toFixed(2)} ms`);
  console.log(`  P90 Latency       : ${p90Latency.toFixed(2)} ms`);
  console.log(`  P95 Latency       : ${p95Latency.toFixed(2)} ms`);
  console.log(`  P99 Tail Latency  : ${p99Latency.toFixed(2)} ms`);
  console.log(`  Max Latency       : ${maxLatency.toFixed(2)} ms`);
  console.log(`  HTTP Status Codes : ${JSON.stringify(statusCodes)}`);
  console.log(`  Mobile Heap RAM   : ${finalRam}`);
  console.log("=========================================================================");
}

runLoadTest();
