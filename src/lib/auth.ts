import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";

const SECRET_KEY =
  process.env.SESSION_SECRET || "default-fallback-session-key-at-least-32-chars-long";
const encodedKey = new TextEncoder().encode(SECRET_KEY);

export interface SessionPayload {
  username: string;
  role: string;
  issuedAt: number;
}

export async function signSessionToken(
  payload: Omit<SessionPayload, "issuedAt">
): Promise<string> {
  return new SignJWT({ ...payload, issuedAt: Date.now() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(encodedKey);
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(request?: Request): Promise<SessionPayload | null> {
  if (request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      const verified = await verifySessionToken(token);
      if (verified) return verified;
    }
  }

  try {
    const headerStore = await headers();
    const authHeader = headerStore.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      const verified = await verifySessionToken(token);
      if (verified) return verified;
    }
  } catch {
    // ignore
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_session")?.value;
    if (token) {
      return verifySessionToken(token);
    }
  } catch {
    // ignore
  }

  return null;
}
