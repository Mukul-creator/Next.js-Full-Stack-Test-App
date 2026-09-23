import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

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

  // Demonstration of accessing a server-only environment variable
  const serverApiKey = process.env.SERVER_API_KEY || "missing_key";
  const maskedKey = serverApiKey.length > 8
    ? `${serverApiKey.slice(0, 6)}...${serverApiKey.slice(-4)}`
    : "***";

  return NextResponse.json({
    status: "success",
    message: "Protected data retrieved successfully from backend API route!",
    authenticatedAs: session.username,
    role: session.role,
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

