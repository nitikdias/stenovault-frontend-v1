export const runtime = "nodejs";

import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const SECRET = process.env.JWT_SECRET || "supersecret";
const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL ;
const API_KEY = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || "";

// Proxy login to backend instead of using Prisma locally
export async function POST(req) {
  const body = await req.json();

  try {
    const res = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    // If backend returned a token, set it as a cookie. Otherwise, if backend returned user id, sign a token.
    const nextRes = NextResponse.json(data);

    const token = data.token || (data.userId ? jwt.sign({ id: data.userId }, SECRET, { expiresIn: "1h" }) : null);
    if (token) {
      nextRes.cookies.set("token", token, { path: "/", sameSite: "lax", secure: false, httpOnly: false });
    }

    return nextRes;
  } catch (err) {
    console.error("Login proxy error:", err);
    return NextResponse.json({ success: false, message: "Login failed" }, { status: 500 });
  }
}
