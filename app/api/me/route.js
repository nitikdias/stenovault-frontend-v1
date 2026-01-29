import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "supersecret";
const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL ;
const TOKEN_KEY = process.env.TOKEN_KEY || process.env.NEXT_PUBLIC_TOKEN_KEY;

export async function GET(req) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ user: null });

  try {
    const payload = jwt.verify(token, SECRET);

    // Try to fetch user info from backend; fallback to minimal user object
    try {
      const res = await fetch(`/api/backend/users/${payload.id}`, {
        headers: { "Authorization": `Bearer ${TOKEN_KEY}`, "X-API-KEY": process.env.NEXT_PUBLIC_API_KEY || "" },
        credentials: "include"
      });
      if (res.ok) {
        const user = await res.json();
        return NextResponse.json({ user });
      }
    } catch (err) {
      console.warn("Failed to fetch user from backend, returning minimal payload:", err);
    }

    return NextResponse.json({ user: { id: payload.id } });
  } catch (err) {
    return NextResponse.json({ user: null });
  }
}
