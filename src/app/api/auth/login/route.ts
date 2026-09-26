import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signSessionToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    const expectedUser = process.env.ADMIN_USER || "admin";
    const expectedPassword = process.env.ADMIN_PASSWORD || "password123";

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    if (username !== expectedUser || password !== expectedPassword) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const token = await signSessionToken({
      username,
      role: "administrator",
    });

    const cookieStore = await cookies();
    cookieStore.set("auth_session", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 2,
    });

    return NextResponse.json({
      success: true,
      message: "Authentication successful",
      token,
      user: {
        username,
        role: "administrator",
      },
    });
  } catch (error) {
    console.error("Login route error:", error);
    return NextResponse.json(
      { error: "Internal server error during authentication" },
      { status: 500 }
    );
  }
}
