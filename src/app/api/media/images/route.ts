import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const IMAGE_CATALOG = [
  {
    id: "img-1",
    file: "img-1.jpg",
    title: "Electromagnetic Field Lines & Flux Density (Local HD JPEG)",
    category: "Physics",
    resolution: "1600x1067 HD",
    format: "Local JPEG (276 KB)",
    accent: "#38bdf8",
    secondary: "#6366f1",
    sizeKB: 276,
  },
  {
    id: "img-2",
    file: "img-2.jpg",
    title: "3D Fourier Transform & Harmonic Wave Interference (Local HD JPEG)",
    category: "Mathematics",
    resolution: "1600x1067 HD",
    format: "Local JPEG (156 KB)",
    accent: "#10b981",
    secondary: "#059669",
    sizeKB: 156,
  },
  {
    id: "img-3",
    file: "img-3.jpg",
    title: "Data Center Server Racks & Reverse Proxy Topology (Local HD JPEG)",
    category: "System Architecture",
    resolution: "1600x1067 HD",
    format: "Local JPEG (347 KB)",
    accent: "#f59e0b",
    secondary: "#dc2626",
    sizeKB: 347,
  },
  {
    id: "img-4",
    file: "img-4.jpg",
    title: "Molecular Hybridization & Laboratory Spectroscopy (Local HD JPEG)",
    category: "Chemistry",
    resolution: "1600x1067 HD",
    format: "Local JPEG (302 KB)",
    accent: "#ec4899",
    secondary: "#8b5cf6",
    sizeKB: 302,
  },
  {
    id: "img-5",
    file: "img-5.jpg",
    title: "Neural Network Backpropagation & AI Compute Cluster (1.1 MB HD JPEG)",
    category: "Computer Science",
    resolution: "1600x1067 HD",
    format: "Local JPEG (1.09 MB)",
    accent: "#a855f7",
    secondary: "#3b82f6",
    sizeKB: 1094,
  },
  {
    id: "img-6",
    file: "img-6.jpg",
    title: "Deep Space Telescope Nebula & Star Cluster Photometry (Local HD JPEG)",
    category: "Astrophysics",
    resolution: "1600x1067 HD",
    format: "Local JPEG (347 KB)",
    accent: "#06b6d4",
    secondary: "#1d4ed8",
    sizeKB: 347,
  },
];

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

  // Mode 2: Stream dynamically generated binary SVG diagram
  if (mode === "render" || mode === "jpg" || mode === "photo") {
    const bust = searchParams.get("t") || String(Date.now());
    const waves: string[] = [];
    for (let i = 0; i < 65; i++) {
      const yOffset = 80 + i * 12;
      const amp = 35 + ((i * 7) % 50);
      const opacity = (0.12 + (i % 10) * 0.06).toFixed(2);
      waves.push(
        `<path d="M 0 ${yOffset} Q 300 ${yOffset - amp}, 600 ${yOffset} T 1200 ${yOffset}" fill="none" stroke="${
          i % 2 === 0 ? item.accent : item.secondary
        }" stroke-width="1.8" stroke-opacity="${opacity}" />`
      );
    }

    const nodes: string[] = [];
    for (let n = 0; n < 45; n++) {
      const cx = 60 + ((n * 173) % 1080);
      const cy = 70 + ((n * 97) % 620);
      const r = 3 + (n % 8);
      nodes.push(
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${item.accent}" fill-opacity="0.55" />`
      );
    }

    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 750" width="100%" height="100%">
      <defs>
        <linearGradient id="bg-${id}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#020617" />
          <stop offset="50%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#1e1b4b" />
        </linearGradient>
      </defs>
      <rect width="1200" height="750" fill="url(#bg-${id})" />
      <g>${waves.join("\n")}</g>
      <g>${nodes.join("\n")}</g>
      <rect x="40" y="40" width="1120" height="670" rx="20" fill="none" stroke="${item.accent}" stroke-opacity="0.35" stroke-width="2" />
      <rect x="70" y="530" width="1060" height="140" rx="14" fill="#020617" fill-opacity="0.82" stroke="${item.accent}" stroke-opacity="0.4" />
      <text x="105" y="578" fill="#f8fafc" font-family="monospace, sans-serif" font-size="24" font-weight="bold">${item.title}</text>
      <text x="105" y="618" fill="${item.accent}" font-family="monospace" font-size="18">Category: ${item.category} | Server Binary Stream ID: ${item.id} | Frame: ${bust}</text>
      <text x="105" y="648" fill="#94a3b8" font-family="monospace" font-size="15">Rendered dynamically by Mobile Node.js Server (${new Date().toISOString()})</text>
    </svg>`;

    const buffer = Buffer.from(svgContent, "utf-8");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Server-Image-Id": item.id,
        "X-Payload-Bytes": String(buffer.length),
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
