import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signSessionToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    const expectedUser = process.env.ADMIN_USER ;
    const expectedPassword = process.env.ADMIN_PASSWORD ;

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

    // Generate JWT token
    const token = await signSessionToken({
      username,
      role: "administrator",
    });

    // Set HTTP-Only Cookie
    const cookieStore = await cookies();
    cookieStore.set("auth_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 2, // 2 hours
    });

    return NextResponse.json({
      success: true,
      message: "Authentication successful",
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

