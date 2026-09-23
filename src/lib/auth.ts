import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET_KEY =
  process.env.SESSION_SECRET || "default-fallback-session-key-at-least-32-chars-long";
const encodedKey = new TextEncoder().encode(SECRET_KEY);

export interface SessionPayload {
  username: string;
  role: string;
  issuedAt: number;
}

/**
 * Creates and signs a JWT session token valid for 2 hours.
 */
export async function signSessionToken(
  payload: Omit<SessionPayload, "issuedAt">
): Promise<string> {
  return new SignJWT({ ...payload, issuedAt: Date.now() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(encodedKey);
}

/**
 * Verifies a JWT session token and returns the payload.
 */
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

/**
 * Helper to retrieve the current session from incoming request cookies.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_session")?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

