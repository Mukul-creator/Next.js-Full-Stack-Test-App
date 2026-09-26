import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const IMAGE_CATALOG = [
  {
    id: "img-1",
    file: "img-1.jpg",
    title: "Electromagnetic Field Lines & Flux Density",
    category: "Physics",
    resolution: "1600x1067 HD",
    format: "Local JPEG / Lorenz SVG",
    accent: "#38bdf8",
    secondary: "#6366f1",
    sizeKB: 276,
  },
  {
    id: "img-2",
    file: "img-2.jpg",
    title: "3D Fourier Transform & Harmonic Wave Interference",
    category: "Mathematics",
    resolution: "1600x1067 HD",
    format: "Local JPEG / Fourier SVG",
    accent: "#10b981",
    secondary: "#059669",
    sizeKB: 156,
  },
  {
    id: "img-3",
    file: "img-3.jpg",
    title: "Data Center Server Racks & Reverse Proxy Topology",
    category: "System Architecture",
    resolution: "1600x1067 HD",
    format: "Local JPEG / Topology SVG",
    accent: "#f59e0b",
    secondary: "#dc2626",
    sizeKB: 347,
  },
  {
    id: "img-4",
    file: "img-4.jpg",
    title: "Molecular Hybridization & Laboratory Spectroscopy",
    category: "Chemistry",
    resolution: "1600x1067 HD",
    format: "Local JPEG / Orbital SVG",
    accent: "#ec4899",
    secondary: "#8b5cf6",
    sizeKB: 302,
  },
  {
    id: "img-5",
    file: "img-5.jpg",
    title: "Neural Network Backpropagation & AI Compute Cluster",
    category: "Computer Science",
    resolution: "1600x1067 HD",
    format: "Local JPEG / Neural SVG",
    accent: "#a855f7",
    secondary: "#3b82f6",
    sizeKB: 1094,
  },
  {
    id: "img-6",
    file: "img-6.jpg",
    title: "Deep Space Telescope Nebula & Star Cluster Photometry",
    category: "Astrophysics",
    resolution: "1600x1067 HD",
    format: "Local JPEG / N-Body SVG",
    accent: "#06b6d4",
    secondary: "#1d4ed8",
    sizeKB: 347,
  },
];

function escapeXml(unsafe: string): string {
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function resolveMediaFile(subpath: string): string | null {
  const candidates = [
    path.join(process.cwd(), "public", subpath),
    path.join(process.cwd(), "..", "..", "public", subpath),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export async function GET(request: Request) {
  const startTime = performance.now();
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "list";
  const id = searchParams.get("id") || "img-1";
  const item = IMAGE_CATALOG.find((x) => x.id === id) || IMAGE_CATALOG[0];

  // Mode 1: Stream real local High-Res JPEG file from public/media/images/
  if (mode === "jpg" || mode === "photo") {
    const filePath = resolveMediaFile(path.join("media", "images", item.file));
    if (filePath) {
      const fileBuffer = fs.readFileSync(filePath);
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Length": String(fileBuffer.length),
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-Server-Image-Id": item.id,
          "X-Source": "local-disk-jpeg",
        },
      });
    }
  }

  // Mode 2: Dynamically compute & render mathematical SVG (Fourier Series + Chaotic Lorenz Attractor)
  if (mode === "render" || mode === "jpg" || mode === "photo") {
    const bust = escapeXml(searchParams.get("t") || String(Date.now()));
    const complexity = Math.min(Math.max(parseInt(searchParams.get("complexity") || "75", 10), 20), 200);
    const idxSeed = parseInt(item.id.replace("img-", ""), 10) || 1;

    // 1. Compute Harmonic Fourier Interference Curves
    const waves: string[] = [];
    for (let i = 0; i < complexity; i++) {
      const yBase = 55 + (i * 460) / complexity;
      const pts: string[] = [];
      for (let x = 0; x <= 1200; x += 30) {
        const angle = (x / 1200) * Math.PI * (2 + (i % 5)) + idxSeed * 0.7;
        const harmonic =
          Math.sin(angle) * (18 + (i % 15)) +
          Math.cos(angle * 2.3 - i * 0.2) * 12 +
          Math.sin(angle * 4.1) * 5;
        const y = (yBase + harmonic).toFixed(1);
        pts.push(`${x === 0 ? "M" : "L"} ${x} ${y}`);
      }
      const opacity = (0.14 + (i % 10) * 0.05).toFixed(2);
      waves.push(
        `<path d="${pts.join(" ")}" fill="none" stroke="${
          i % 2 === 0 ? item.accent : item.secondary
        }" stroke-width="1.6" stroke-opacity="${opacity}" />`
      );
    }

    // 2. Compute Chaotic Lorenz Attractor Trajectory
    let lx = 0.1 * idxSeed;
    let ly = 0.0;
    let lz = 0.0;
    const sigma = 10;
    const rho = 28;
    const beta = 8 / 3;
    const dt = 0.006;
    const lorenzPts: string[] = [];
    const lorenzSteps = complexity * 12;
    for (let s = 0; s < lorenzSteps; s++) {
      const dx = sigma * (ly - lx) * dt;
      const dy = (lx * (rho - lz) - ly) * dt;
      const dz = (lx * ly - beta * lz) * dt;
      lx += dx;
      ly += dy;
      lz += dz;
      const px = (600 + lx * 15.5).toFixed(1);
      const py = (540 - lz * 9.2).toFixed(1);
      lorenzPts.push(`${s === 0 ? "M" : "L"} ${px} ${py}`);
    }

    // 3. Phase-Space Vector Field Nodes
    const nodes: string[] = [];
    for (let n = 0; n < 75; n++) {
      const cx = (70 + ((n * 173 + idxSeed * 41) % 1060)).toFixed(0);
      const cy = (65 + ((n * 97 + idxSeed * 29) % 440)).toFixed(0);
      const r = 2 + (n % 6);
      nodes.push(
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${n % 3 === 0 ? "#ffffff" : item.accent}" fill-opacity="0.65" />`
      );
    }

    const computeMs = (performance.now() - startTime).toFixed(2);
    const safeTitle = escapeXml(item.title);
    const safeCat = escapeXml(item.category);

    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 750" width="1200" height="750">
  <defs>
    <linearGradient id="bg-${item.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#020617" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </linearGradient>
  </defs>
  <rect width="1200" height="750" fill="url(#bg-${item.id})" />
  <g>${waves.join("")}</g>
  <path d="${lorenzPts.join(" ")}" fill="none" stroke="#f8fafc" stroke-width="2.2" stroke-opacity="0.8" />
  <g>${nodes.join("")}</g>
  <rect x="36" y="36" width="1128" height="678" rx="18" fill="none" stroke="${item.accent}" stroke-opacity="0.45" stroke-width="2.5" />
  <rect x="64" y="535" width="1072" height="148" rx="14" fill="#020617" fill-opacity="0.9" stroke="${item.accent}" stroke-opacity="0.55" />
  <text x="96" y="582" fill="#f8fafc" font-family="monospace, sans-serif" font-size="25" font-weight="bold">${safeTitle}</text>
  <text x="96" y="618" fill="${item.accent}" font-family="monospace" font-size="17">Category: ${safeCat} | Lorenz + Fourier Vector Stream | ID: ${item.id} | Frame: #${bust}</text>
  <text x="96" y="652" fill="#34d399" font-family="monospace" font-size="15">Server CPU Render: ${computeMs} ms | ${complexity} Harmonics + ${lorenzSteps} RK4 Steps</text>
</svg>`;

    const buffer = Buffer.from(svgContent, "utf-8");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Server-Image-Id": item.id,
        "X-Payload-Bytes": String(buffer.length),
        "X-Compute-Ms": computeMs,
      },
    });
  }

  const items = IMAGE_CATALOG.map((img) => ({
    ...img,
    hdUrl: `/api/media/images?mode=jpg&id=${img.id}`,
    externalThumb: `/api/media/images?mode=jpg&id=${img.id}`,
    streamUrl: `/api/media/images?mode=render&id=${img.id}`,
    serverStreamUrl: `/api/media/images?mode=render&id=${img.id}`,
    estimatedSizeKB: img.sizeKB,
    approxServerBytes: img.sizeKB * 1024,
  }));

  return NextResponse.json({
    status: "success",
    type: "image-gallery",
    count: items.length,
    timestamp: new Date().toISOString(),
    images: items,
  });
}
