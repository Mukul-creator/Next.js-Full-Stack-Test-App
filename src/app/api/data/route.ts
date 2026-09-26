import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

interface DataItem {
  id: string;
  title: string;
  category: string;
  status: "active" | "completed" | "pending";
  createdAt: string;
}

let memoryItems: DataItem[] = [
  {
    id: "item-101",
    title: "Verify Next.js Standalone Mobile Server Deployment",
    category: "Performance",
    status: "completed",
    createdAt: new Date(Date.now() - 3600_000 * 4).toISOString(),
  },
  {
    id: "item-102",
    title: "Benchmark HTTP 206 Partial Content Video Streaming",
    category: "Media Stream",
    status: "active",
    createdAt: new Date(Date.now() - 3600_000 * 2).toISOString(),
  },
  {
    id: "item-103",
    title: "Stress Test 500 Concurrent Connections on JEE-Mains Domain",
    category: "Security",
    status: "active",
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
  },
];

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        message: "You must be authenticated to access this protected server resource.",
        statusCode: 401,
      },
      { status: 401 }
    );
  }

  const serverApiKey = process.env.SERVER_API_KEY || "missing_key";
  const maskedKey =
    serverApiKey.length > 8
      ? `${serverApiKey.slice(0, 6)}...${serverApiKey.slice(-4)}`
      : "***";

  return NextResponse.json({
    status: "success",
    message: "Protected data retrieved successfully from backend API route!",
    authenticatedAs: session.username,
    role: session.role,
    items: memoryItems,
    serverSecrets: {
      serverApiKeyMasked: maskedKey,
      secretLength: serverApiKey.length,
      isSecretPresent: Boolean(process.env.SERVER_API_KEY),
    },
    systemMetrics: {
      uptimeSeconds: Math.floor(process.uptime()),
      heapUsedMB: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
      timestamp: new Date().toISOString(),
    },
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const title = String(body.title || "").trim();
    const category = String(body.category || "Performance").trim();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const newItem: DataItem = {
      id: `item-${Math.floor(100 + Math.random() * 900)}`,
      title,
      category,
      status: "active",
      createdAt: new Date().toISOString(),
    };

    memoryItems = [newItem, ...memoryItems.slice(0, 29)];
    return NextResponse.json({ status: "created", item: newItem, items: memoryItems });
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing item id" }, { status: 400 });
  }

  memoryItems = memoryItems.filter((item) => item.id !== id);
  return NextResponse.json({ status: "deleted", deletedId: id, items: memoryItems });
}
