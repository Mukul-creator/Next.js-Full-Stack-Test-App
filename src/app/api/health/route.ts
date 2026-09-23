import { NextResponse } from "next/server";

export async function GET() {
  const uptimeSeconds = Math.floor(process.uptime());
  
  return NextResponse.json({
    status: "ok",
    service: process.env.NEXT_PUBLIC_APP_NAME || "Next.js App",
    environment: process.env.NEXT_PUBLIC_APP_ENV || "development",
    timestamp: new Date().toISOString(),
    uptime: `${uptimeSeconds}s`,
    nodeVersion: process.version,
    envCheck: {
      hasSessionSecret: Boolean(process.env.SESSION_SECRET),
      hasServerApiKey: Boolean(process.env.SERVER_API_KEY),
      hasAdminCredentials: Boolean(process.env.ADMIN_USER && process.env.ADMIN_PASSWORD),
    },
  });
}

