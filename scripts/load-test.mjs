/**
 * Method 1: Built-In Full-Stack Load Tester for Mobile Server
 *
 * Usage:
 *   node scripts/load-test.mjs <SERVER_URL> [CONCURRENCY] [DURATION_SECONDS]
 *
 * Example:
 *   node scripts/load-test.mjs http://192.168.1.50:3000 20 15
 */

const targetUrl = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const concurrency = parseInt(process.argv[3] || "20", 10);
const durationSec = parseInt(process.argv[4] || "15", 10);

console.log("=========================================================");
console.log("NEXT.JS MOBILE SERVER LOAD TESTER");
console.log("=========================================================");
console.log(`Target Server : ${targetUrl}`);
console.log(`Concurrency   : ${concurrency} simultaneous virtual users`);
console.log(`Duration      : ${durationSec} seconds`);
console.log("=========================================================\n");

async function runLoadTest() {
  // Step 1: Check connectivity & authenticate to get session token
  console.log("1. Checking server connectivity & authenticating...");
  let token = "";
  try {
    const healthRes = await fetch(`${targetUrl}/api/health`, {
      signal: AbortSignal.timeout(5000),
    });
    const healthData = await healthRes.json();
    console.log(`   [OK] Server is ONLINE (Uptime: ${healthData.uptime}, Node: ${healthData.nodeVersion})`);

    const loginRes = await fetch(`${targetUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "password123" }),
    });
    const loginData = await loginRes.json();
    if (loginData.token) {
      token = loginData.token;
      console.log("   [OK] Authenticated successfully (Testing Frontend, Public API & Protected API)\n");
    }
  } catch (err) {
    console.error(`   [ERROR] Could not reach ${targetUrl}. Make sure the server is running!`);
    console.error(`   Details: ${err.message}`);
    process.exit(1);
  }

  // Step 2: Run concurrent virtual users
  console.log(`2. Firing load test (${concurrency} workers for ${durationSec}s)...`);

  const latencies = [];
  let successCount = 0;
  let errorCount = 0;
  let peakHeapMB = 0;
  const endTime = Date.now() + durationSec * 1000;
  const startTime = Date.now();

  const endpoints = [
    { path: "/", headers: {} },
    { path: "/api/health", headers: {} },
    { path: "/api/data", headers: token ? { Authorization: `Bearer ${token}` } : {} },
  ];

  async function worker(workerId) {
    let i = workerId;
    while (Date.now() < endTime) {
      const target = endpoints[i % endpoints.length];
      i++;
      const reqStart = performance.now();
      try {
        const res = await fetch(`${targetUrl}${target.path}`, {
          headers: target.headers,
          signal: AbortSignal.timeout(8000),
        });
        const reqDuration = performance.now() - reqStart;
        latencies.push(reqDuration);

        if (res.ok) {
          successCount++;
          if (target.path === "/api/data") {
            const json = await res.json();
            const mem = json.systemMetrics?.heapUsedMB || 0;
            if (mem > peakHeapMB) peakHeapMB = mem;
          } else {
            await res.text();
          }
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }
  }

  const progressInterval = setInterval(() => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const total = successCount + errorCount;
    const currentRps = (total / Math.max(elapsed, 0.1)).toFixed(1);
    process.stdout.write(
      `\r   Elapsed: ${elapsed}s | Requests: ${total} | Speed: ${currentRps} req/sec | Errors: ${errorCount}   `
    );
  }, 500);

  const workers = Array.from({ length: concurrency }, (_, idx) => worker(idx));
  await Promise.all(workers);
  clearInterval(progressInterval);

  const totalDurationSec = (Date.now() - startTime) / 1000;
  const totalRequests = successCount + errorCount;
  const rps = (totalRequests / totalDurationSec).toFixed(2);

  latencies.sort((a, b) => a - b);
  const avgLatency =
    latencies.length > 0
      ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2)
      : 0;
  const minLatency = latencies.length > 0 ? latencies[0].toFixed(2) : 0;
  const maxLatency = latencies.length > 0 ? latencies[latencies.length - 1].toFixed(2) : 0;
  const p95Latency =
    latencies.length > 0
      ? latencies[Math.floor(latencies.length * 0.95)].toFixed(2)
      : 0;

  console.log("\n\n=========================================================");
  console.log("LOAD TEST RESULTS SUMMARY");
  console.log("=========================================================");
  console.log(`Total Time          : ${totalDurationSec.toFixed(2)} seconds`);
  console.log(`Total Requests      : ${totalRequests}`);
  console.log(`Successful (200 OK) : ${successCount}`);
  console.log(`Failed / Timeouts   : ${errorCount}`);
  console.log(`Throughput (RPS)    : ${rps} requests/sec`);
  console.log("---------------------------------------------------------");
  console.log(`Min Latency         : ${minLatency} ms`);
  console.log(`Avg Latency         : ${avgLatency} ms`);
  console.log(`95th Percentile     : ${p95Latency} ms`);
  console.log(`Max Latency         : ${maxLatency} ms`);
  if (peakHeapMB) {
    console.log(`Mobile Heap RAM     : ${peakHeapMB} MB`);
  }
  console.log("=========================================================");
}

runLoadTest();
