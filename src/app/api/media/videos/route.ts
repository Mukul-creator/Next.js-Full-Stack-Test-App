import { NextResponse } from "next/server";
import crypto from "crypto";

const VIDEO_CATALOG = [
  {
    id: "vid-1",
    title: "Physics Lecture: Rotational Dynamics & Moment of Inertia",
    instructor: "Prof. R. K. Verma",
    duration: "0:15 (HD Test Stream)",
    resolution: "1280x720 (720p HD)",
    bitrate: "2.4 Mbps",
    sizeMB: 1.8,
    category: "Physics",
    // Public reliable MP4 stream for HTML5 video player
    streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    serverChunkUrl: "/api/media/videos?mode=stream&id=vid-1",
    thumbnail: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "vid-2",
    title: "Calculus Visualized: 3D Vector Fields & Differential Equations",
    instructor: "Dr. Ananya Sharma",
    duration: "0:15 (HD Test Stream)",
    resolution: "1280x720 (720p HD)",
    bitrate: "2.8 Mbps",
    sizeMB: 2.1,
    category: "Mathematics",
    streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    serverChunkUrl: "/api/media/videos?mode=stream&id=vid-2",
    thumbnail: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "vid-3",
    title: "System Design: High-Concurrency Server Load Balancing",
    instructor: "Vikram Aditya (Principal Architect)",
    duration: "0:15 (HD Test Stream)",
    resolution: "1280x720 (720p HD)",
    bitrate: "3.1 Mbps",
    sizeMB: 2.4,
    category: "System Architecture",
    streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    serverChunkUrl: "/api/media/videos?mode=stream&id=vid-3",
    thumbnail: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80",
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "list";

  // Mode 1: Server-side Binary Video Packet / Byte-Range Streamer (Simulates 256KB video segment streaming)
  if (mode === "stream") {
    const id = searchParams.get("id") || "vid-1";
    const chunkKB = Math.min(Math.max(parseInt(searchParams.get("chunkKB") || "128", 10), 16), 1024);
    const totalBytes = chunkKB * 1024;

    const rangeHeader = request.headers.get("range");
    let start = 0;
    let end = totalBytes - 1;

    if (rangeHeader && rangeHeader.startsWith("bytes=")) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      start = parseInt(parts[0], 10) || 0;
      end = parts[1] ? Math.min(parseInt(parts[1], 10), totalBytes - 1) : totalBytes - 1;
    }

    const contentLength = Math.max(end - start + 1, 0);
    // Generate deterministic binary video transport stream packet buffer
    const headerTag = Buffer.from(`MP4_SEGMENT_STREAM:${id}:BYTES_${start}_${end}:`);
    const randomPayload = crypto.randomBytes(Math.max(contentLength - headerTag.length, 64));
    const buffer = Buffer.concat([headerTag, randomPayload], contentLength);

    return new NextResponse(buffer, {
      status: rangeHeader ? 206 : 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Accept-Ranges": "bytes",
        "Content-Range": `bytes ${start}-${end}/${totalBytes}`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
        "X-Stream-Id": id,
        "X-Chunk-Size-KB": String(Math.round(buffer.length / 1024)),
      },
    });
  }

  // Mode 2: Return Video Catalog Metadata
  return NextResponse.json({
    status: "success",
    type: "video-catalog",
    count: VIDEO_CATALOG.length,
    streamingProtocol: "HTTP 206 Byte-Range + MP4 Progressive",
    timestamp: new Date().toISOString(),
    videos: VIDEO_CATALOG,
  });
}
