import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const VIDEO_CATALOG = [
  {
    id: "vid-1",
    file: "vid-1.mp4",
    title: "Physics Lecture: Wave Optics & Time-Lapse Interferometry (Local MP4)",
    instructor: "Prof. R. K. Verma",
    duration: "0:05 (960x540 H.264 MP4)",
    resolution: "960x540 (H.264)",
    bitrate: "1.8 Mbps",
    bitrateMbps: 1.8,
    sizeMB: 1.08,
    category: "Physics",
    description: "Hosted locally in public/media/videos/vid-1.mp4 and streamed from your server via HTTP 206 Partial Content byte ranges.",
    mp4Url: "/api/media/videos?mode=stream&id=vid-1",
    streamUrl: "/api/media/videos?mode=stream&id=vid-1",
    binaryChunkUrl: "/api/media/videos?mode=stream&id=vid-1",
    serverChunkUrl: "/api/media/videos?mode=stream&id=vid-1",
    thumbnail: "/api/media/images?mode=jpg&id=img-1",
  },
  {
    id: "vid-2",
    file: "vid-2.mp4",
    title: "Mechanics & Kinematics: 3D Motion Simulation (Local MP4)",
    instructor: "Dr. Ananya Sharma",
    duration: "0:10 (640x360 H.264 MP4)",
    resolution: "640x360 (H.264)",
    bitrate: "1.2 Mbps",
    bitrateMbps: 1.2,
    sizeMB: 0.75,
    category: "Mathematics",
    description: "Hosted locally in public/media/videos/vid-2.mp4 with full HTML5 video scrubbing and byte-range streaming.",
    mp4Url: "/api/media/videos?mode=stream&id=vid-2",
    streamUrl: "/api/media/videos?mode=stream&id=vid-2",
    binaryChunkUrl: "/api/media/videos?mode=stream&id=vid-2",
    serverChunkUrl: "/api/media/videos?mode=stream&id=vid-2",
    thumbnail: "/api/media/images?mode=jpg&id=img-2",
  },
  {
    id: "vid-3",
    file: "vid-3.mp4",
    title: "System Stress Benchmark: High-Bitrate 5.4 MB Video Stream (Local MP4)",
    instructor: "Vikram Aditya (Principal Architect)",
    duration: "0:30 (640x360 High Bitrate)",
    resolution: "640x360 (5.4 MB)",
    bitrate: "2.5 Mbps",
    bitrateMbps: 2.5,
    sizeMB: 5.26,
    category: "System Architecture",
    description: "5.4 MB local MP4 video file (public/media/videos/vid-3.mp4) for testing sustained multi-megabyte video streaming.",
    mp4Url: "/api/media/videos?mode=stream&id=vid-3",
    streamUrl: "/api/media/videos?mode=stream&id=vid-3",
    binaryChunkUrl: "/api/media/videos?mode=stream&id=vid-3",
    serverChunkUrl: "/api/media/videos?mode=stream&id=vid-3",
    thumbnail: "/api/media/images?mode=jpg&id=img-3",
  },
];

function resolveVideoFile(fileName: string): string | null {
  const candidates = [
    path.join(process.cwd(), "public", "media", "videos", fileName),
    path.join(process.cwd(), "..", "..", "public", "media", "videos", fileName),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "list";

  if (mode === "stream") {
    const id = searchParams.get("id") || "vid-1";
    const videoItem = VIDEO_CATALOG.find((v) => v.id === id) || VIDEO_CATALOG[0];
    const filePath = resolveVideoFile(videoItem.file);

    if (!filePath) {
      return NextResponse.json(
        { error: `Local video file ${videoItem.file} not found on server` },
        { status: 404 }
      );
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const rangeHeader = request.headers.get("range");
    const chunkKBParam = searchParams.get("chunkKB");

    if (rangeHeader || chunkKBParam) {
      let start = 0;
      let end = fileSize - 1;

      if (rangeHeader && rangeHeader.startsWith("bytes=")) {
        const parts = rangeHeader.replace(/bytes=/, "").split("-");
        start = Math.min(parseInt(parts[0], 10) || 0, fileSize - 1);
        end = parts[1] ? Math.min(parseInt(parts[1], 10), fileSize - 1) : fileSize - 1;
      } else if (chunkKBParam) {
        const requestedBytes = Math.min(Math.max(parseInt(chunkKBParam, 10) || 256, 16), 2048) * 1024;
        end = Math.min(requestedBytes - 1, fileSize - 1);
      }

      if (start > end) start = 0;
      const chunkLength = end - start + 1;
      const fd = fs.openSync(filePath, "r");
      const buffer = Buffer.alloc(chunkLength);
      fs.readSync(fd, buffer, 0, chunkLength, start);
      fs.closeSync(fd);

      return new NextResponse(buffer, {
        status: 206,
        headers: {
          "Content-Type": "video/mp4",
          "Accept-Ranges": "bytes",
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Content-Length": String(buffer.length),
          "Cache-Control": "no-store",
          "X-Stream-Id": id,
          "X-Source": "local-disk-mp4",
        },
      });
    }

    const fullBuffer = fs.readFileSync(filePath);
    return new NextResponse(fullBuffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Accept-Ranges": "bytes",
        "Content-Length": String(fullBuffer.length),
        "Cache-Control": "no-store",
        "X-Stream-Id": id,
        "X-Source": "local-disk-mp4",
      },
    });
  }

  return NextResponse.json({
    status: "success",
    type: "video-catalog",
    count: VIDEO_CATALOG.length,
    streamingProtocol: "Local Disk MP4 + HTTP 206 Byte-Range Streaming",
    timestamp: new Date().toISOString(),
    videos: VIDEO_CATALOG,
  });
}
