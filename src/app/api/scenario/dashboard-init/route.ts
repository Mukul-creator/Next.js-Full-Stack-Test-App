import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import crypto from "crypto";
import zlib from "zlib";

interface ComputePreset {
  matrixN: number;
  pbkdf2Rounds: number;
  rk4Steps: number;
  sieveLimit: number;
  sortSize: number;
  gzipKB: number;
}

const PRESETS: Record<string, ComputePreset> = {
  normal: { matrixN: 60, pbkdf2Rounds: 3000, rk4Steps: 15000, sieveLimit: 50000, sortSize: 10000, gzipKB: 32 },
  heavy: { matrixN: 130, pbkdf2Rounds: 20000, rk4Steps: 100000, sieveLimit: 300000, sortSize: 60000, gzipKB: 128 },
  extreme: { matrixN: 210, pbkdf2Rounds: 60000, rk4Steps: 280000, sieveLimit: 750000, sortSize: 150000, gzipKB: 320 },
  nuclear: { matrixN: 280, pbkdf2Rounds: 140000, rk4Steps: 650000, sieveLimit: 1500000, sortSize: 350000, gzipKB: 640 },
};

export async function GET(request: Request) {
  const overallStart = performance.now();
  const { searchParams } = new URL(request.url);
  const mode = (searchParams.get("compute") || "normal").toLowerCase();
  const cfg = PRESETS[mode] || PRESETS.normal;

  // 1. Verify Auth Session
  const tAuthStart = performance.now();
  const session = await getSession();
  const authMs = Math.round((performance.now() - tAuthStart) * 100) / 100;

  // 2. Dense Float64 Matrix Multiplication O(N^3) (FPU & L1/L2 Cache Stress)
  const tMatStart = performance.now();
  const N = cfg.matrixN;
  const A = new Float64Array(N * N);
  const B = new Float64Array(N * N);
  const C = new Float64Array(N * N);
  for (let i = 0; i < N * N; i++) {
    A[i] = Math.sin(i * 0.013) * 10.5;
    B[i] = Math.cos(i * 0.017) * 8.2;
  }
  for (let i = 0; i < N; i++) {
    const iRow = i * N;
    for (let k = 0; k < N; k++) {
      const aVal = A[iRow + k];
      const kRow = k * N;
      for (let j = 0; j < N; j++) {
        C[iRow + j] += aVal * B[kRow + j];
      }
    }
  }
  const matrixChecksum = Number((C[0] + C[Math.floor((N * N) / 2)] + C[N * N - 1]).toFixed(3));
  const matrixMs = Math.round((performance.now() - tMatStart) * 100) / 100;

  // 3. Cryptographic Key Derivation (PBKDF2-HMAC-SHA512) + AES-256-GCM + SHA-256
  const tCryptoStart = performance.now();
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync("jee-mains-extreme-load-secret", salt, cfg.pbkdf2Rounds, 32, "sha512");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const payload = crypto.randomBytes(16384);
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  const digest = crypto.createHash("sha256").update(decrypted).digest("hex");
  const cryptoMs = Math.round((performance.now() - tCryptoStart) * 100) / 100;

  // 4. 4th-Order Runge-Kutta (RK4) Chaotic Lorenz Differential Equation Solver
  const tRk4Start = performance.now();
  let x = 1.0, y = 1.0, z = 1.0;
  const sigma = 10.0, rho = 28.0, beta = 8.0 / 3.0, dt = 0.002;
  let energyIntegral = 0;
  for (let s = 0; s < cfg.rk4Steps; s++) {
    const k1x = sigma * (y - x);
    const k1y = x * (rho - z) - y;
    const k1z = x * y - beta * z;

    const x2 = x + 0.5 * dt * k1x, y2 = y + 0.5 * dt * k1y, z2 = z + 0.5 * dt * k1z;
    const k2x = sigma * (y2 - x2), k2y = x2 * (rho - z2) - y2, k2z = x2 * y2 - beta * z2;

    const x3 = x + 0.5 * dt * k2x, y3 = y + 0.5 * dt * k2y, z3 = z + 0.5 * dt * k2z;
    const k3x = sigma * (y3 - x3), k3y = x3 * (rho - z3) - y3, k3z = x3 * y3 - beta * z3;

    const x4 = x + dt * k3x, y4 = y + dt * k3y, z4 = z + dt * k3z;
    const k4x = sigma * (y4 - x4), k4y = x4 * (rho - z4) - y4, k4z = x4 * y4 - beta * z4;

    x += (dt / 6.0) * (k1x + 2 * k2x + 2 * k3x + k4x);
    y += (dt / 6.0) * (k1y + 2 * k2y + 2 * k3y + k4y);
    z += (dt / 6.0) * (k1z + 2 * k2z + 2 * k3z + k4z);
    if ((s & 63) === 0) {
      energyIntegral += Math.sqrt(x * x + y * y + z * z) * Math.atan2(y, x);
    }
  }
  const rk4Ms = Math.round((performance.now() - tRk4Start) * 100) / 100;

  // 5. Prime Sieve of Eratosthenes + V8 Heap Float64 Quicksort + Zlib Gzip Cycle
  const tMemStart = performance.now();
  const sieve = new Uint8Array(cfg.sieveLimit + 1);
  let primesCount = 0;
  for (let p = 2; p * p <= cfg.sieveLimit; p++) {
    if (sieve[p] === 0) {
      for (let m = p * p; m <= cfg.sieveLimit; m += p) sieve[m] = 1;
    }
  }
  for (let p = 2; p <= cfg.sieveLimit; p++) {
    if (sieve[p] === 0) primesCount++;
  }
  const sortBuf = new Float64Array(cfg.sortSize);
  for (let i = 0; i < sortBuf.length; i++) {
    sortBuf[i] = Math.sin(i * 1.6180339) * 100000;
  }
  sortBuf.sort();

  const rawBuf = Buffer.alloc(cfg.gzipKB * 1024, "JEE-Mains-Extreme-Compute-Compression-Block-");
  const compressed = zlib.gzipSync(rawBuf, { level: 6 });
  const decompressed = zlib.gunzipSync(compressed);
  const memSortZlibMs = Math.round((performance.now() - tMemStart) * 100) / 100;

  const mem = process.memoryUsage();
  const totalDurationMs = Math.round((performance.now() - overallStart) * 100) / 100;

  return NextResponse.json({
    status: "success",
    computeMode: mode,
    authenticated: Boolean(session),
    user: session ? { username: session.username, role: session.role } : null,
    timingsMs: {
      authVerificationMs: authMs,
      matrixGemmMs: matrixMs,
      cryptoPbkdf2AesMs: cryptoMs,
      rk4DifferentialMs: rk4Ms,
      sieveSortZlibMs: memSortZlibMs,
      totalExecutionMs: totalDurationMs,
    },
    computeVerification: {
      matrixSize: `${N}x${N}`,
      matrixFlops: 2 * N * N * N,
      matrixChecksum,
      pbkdf2Rounds: cfg.pbkdf2Rounds,
      integrityDigest: digest.slice(0, 16),
      rk4Steps: cfg.rk4Steps,
      energyIntegral: Number(energyIntegral.toFixed(2)),
      primesFound: primesCount,
      sortedElements: cfg.sortSize,
      gzipVerified: decompressed.length === rawBuf.length,
    },
    serverResources: {
      uptimeSeconds: Math.floor(process.uptime()),
      rssMB: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      heapUsedMB: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      nodeVersion: process.version,
    },
    timestamp: new Date().toISOString(),
  });
}
