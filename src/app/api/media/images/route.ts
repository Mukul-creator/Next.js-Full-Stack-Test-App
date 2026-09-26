import { NextResponse } from "next/server";

const IMAGE_CATALOG = [
  {
    id: "img-1",
    title: " Electromagnetic Field Lines & Flux Density Diagram",
    category: "Physics Diagram",
    resolution: "1920x1080",
    format: "SVG / Vector Stream",
    accent: "#38bdf8",
    secondary: "#6366f1",
    externalThumb: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "img-2",
    title: "3D Fourier Transform & Harmonic Wave Interference",
    category: "Mathematics",
    resolution: "1920x1080",
    format: "SVG / Vector Stream",
    accent: "#10b981",
    secondary: "#059669",
    externalThumb: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "img-3",
    title: "Microservices Load Balancer & Reverse Proxy Topology",
    category: "System Architecture",
    resolution: "1920x1080",
    format: "SVG / Vector Stream",
    accent: "#f59e0b",
    secondary: "#dc2626",
    externalThumb: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "img-4",
    title: "Orbital Molecular Hybridization & Crystal Lattice",
    category: "Chemistry",
    resolution: "1920x1080",
    format: "SVG / Vector Stream",
    accent: "#ec4899",
    secondary: "#8b5cf6",
    externalThumb: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "img-5",
    title: "Neural Network Backpropagation Gradient Surface",
    category: "Computer Science",
    resolution: "1920x1080",
    format: "SVG / Vector Stream",
    accent: "#a855f7",
    secondary: "#3b82f6",
    externalThumb: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "img-6",
    title: "Deep Space Telescope Nebula & Star Cluster Photometry",
    category: "Astrophysics",
    resolution: "1920x1080",
    format: "SVG / Vector Stream",
    accent: "#06b6d4",
    secondary: "#1d4ed8",
    externalThumb: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=900&q=80",
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "list";

  // Mode 1: Stream binary high-density SVG artwork directly from the mobile server
  if (mode === "render") {
    const id = searchParams.get("id") || "img-1";
    const bust = searchParams.get("t") || String(Date.now());
    const item = IMAGE_CATALOG.find((x) => x.id === id) || IMAGE_CATALOG[0];

    // Generate complex high-detail SVG paths (~25KB of vector data) to test real image streaming
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
      <text x="105" y="578" fill="#f8fafc" font-family="monospace, sans-serif" font-size="28" font-weight="bold">${item.title}</text>
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

  // Mode 2: Return Image Gallery Metadata List
  const items = IMAGE_CATALOG.map((img, idx) => ({
    ...img,
    serverStreamUrl: `/api/media/images?mode=render&id=${img.id}`,
    approxServerBytes: 22500 + idx * 1200,
    downloads: 420 + idx * 95,
  }));

  return NextResponse.json({
    status: "success",
    type: "image-gallery",
    count: items.length,
    timestamp: new Date().toISOString(),
    images: items,
  });
}
