#!/usr/bin/env node

const targetUrl = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const concurrency = parseInt(process.argv[3] || "30", 10);
const durationSeconds = parseInt(process.argv[4] || "15", 10);

console.log("=================================================================");
console.log("NEXT.JS REAL-WORLD MULTI-MEDIA & MULTI-API LOAD TESTER");
console.log("=================================================================");
console.log(`Target Server : ${targetUrl}`);
console.log(`Concurrency   : ${concurrency} simultaneous virtual users`);
console.log(`Duration      : ${durationSeconds} seconds`);
console.log(`Workload Mix  : Text JSON | Local HD JPEG | Local MP4 206 | Auth API | SSR`);
console.log("=================================================================\n");

async function authenticate() {
  console.log("1. Checking server connectivity & authenticating...");
  const healthRes = await fetch(`${targetUrl}/api/health`);
  if (!healthRes.ok) {
    throw new Error(`Health check failed with status ${healthRes.status}`);
  }
  const health = await healthRes.json();
  console.log(
    `   [OK] Server ONLINE (Uptime: ${health.uptimeSeconds}s, Node: ${health.nodeVersion}, RAM: ${health.memoryUsageMB} MB)`
  );

  const loginRes = await fetch(`${targetUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "password123" }),
  });

  if (!loginRes.ok) {
    console.warn("   [WARN] Login failed, running unauthenticated load test.");
    return { token: "", cookie: "" };
  }

  const loginData = await loginRes.json();
  const setCookie = loginRes.headers.get("set-cookie");
  const cookieHeader = setCookie ? setCookie.split(";")[0] : "";
  console.log("   [OK] Authenticated (Testing SSR, Rich Text, Local HD JPEGs, Local MP4 Streams & Protected APIs)\n");
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
      name: "Rich Text Feed",
      path: "/api/feed/text?subject=Physics&size=normal",
      headers: {},
    },
    {
      name: "Local HD Image (JPEG)",
      path: "/api/media/images?mode=jpg&id=img-1",
      headers: {},
    },
    {
      name: "Local MP4 Video (256KB)",
      path: "/api/media/videos?mode=stream&id=vid-1&chunkKB=256",
      headers: { Range: "bytes=0-262143" },
    },
    {
      name: "Protected CRUD + Init",
      path: "/api/data",
      headers: authHeaders,
    },
    {
      name: "SSR Home Page",
      path: "/",
      headers: {},
    },
  ];

  let totalRequests = 0;
  let successCount = 0;
  let errorCount = 0;
  let totalBytesDownloaded = 0;
  const latencies = [];
  const perScenarioCounts = {};
  for (const s of scenarios) {
    perScenarioCounts[s.name] = { count: 0, bytes: 0 };
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
  }, 500);

  async function worker(workerId) {
    let step = workerId;
    while (isRunning && performance.now() < endTime) {
      const scenario = scenarios[step % scenarios.length];
      step++;

      const reqStart = performance.now();
      try {
        const res = await fetch(`${targetUrl}${scenario.path}`, {
          headers: scenario.headers,
        });
        const buf = await res.arrayBuffer();
        const latency = performance.now() - reqStart;

        totalRequests++;
        totalBytesDownloaded += buf.byteLength;
        latencies.push(latency);
        perScenarioCounts[scenario.name].count++;
        perScenarioCounts[scenario.name].bytes += buf.byteLength;

        if (res.ok || res.status === 206) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch {
        totalRequests++;
        errorCount++;
      }
    }
  }

  console.log(`2. Firing multi-media load test (${concurrency} workers for ${durationSeconds}s)...`);
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
  const maxLatency = latencies.length ? latencies[latencies.length - 1] : 0;
  const p95Latency = latencies.length ? latencies[Math.floor(latencies.length * 0.95)] : 0;
  const totalMB = totalBytesDownloaded / (1024 * 1024);
  const throughputMBps = totalMB / totalTimeSeconds;

  let finalRam = "N/A";
  try {
    const finalHealth = await (await fetch(`${targetUrl}/api/health`)).json();
    finalRam = `${finalHealth.memoryUsageMB} MB`;
  } catch {
    // ignore
  }

  console.log("\n\n=================================================================");
  console.log("MULTI-MEDIA LOAD TEST RESULTS SUMMARY");
  console.log("=================================================================");
  console.log(`Total Time          : ${totalTimeSeconds.toFixed(2)} seconds`);
  console.log(`Total Requests      : ${totalRequests}`);
  console.log(`Successful (200/206): ${successCount}`);
  console.log(`Failed / Timeouts   : ${errorCount}`);
  console.log(`Throughput (RPS)    : ${(totalRequests / totalTimeSeconds).toFixed(2)} requests/sec`);
  console.log(`Total Data Streamed : ${totalMB.toFixed(2)} MB`);
  console.log(`Bandwidth Speed     : ${throughputMBps.toFixed(2)} MB/sec`);
  console.log("-----------------------------------------------------------------");
  console.log("Workload Breakdown:");
  for (const [name, stats] of Object.entries(perScenarioCounts)) {
    console.log(
      `  - ${name.padEnd(23)}: ${String(stats.count).padStart(5)} reqs | ${(stats.bytes / (1024 * 1024)).toFixed(2)} MB`
    );
  }
  console.log("-----------------------------------------------------------------");
  console.log(`Min Latency         : ${minLatency.toFixed(2)} ms`);
  console.log(`Avg Latency         : ${avgLatency.toFixed(2)} ms`);
  console.log(`95th Percentile     : ${p95Latency.toFixed(2)} ms`);
  console.log(`Max Latency         : ${maxLatency.toFixed(2)} ms`);
  console.log(`Mobile Heap RAM     : ${finalRam}`);
  console.log("=================================================================");
}

runLoadTest();
