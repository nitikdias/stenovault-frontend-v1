// app/api/proxy/devices/route.js
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL;
const API_KEY = process.env.API_KEY;

export async function GET(req) {
  if (!API_BASE_URL) {
    return NextResponse.json({ error: "API_BASE_URL not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(`${API_BASE_URL}/devices`, {
      method: "GET",
      headers: {
        "X-API-Key": API_KEY || "",
      }
    });
    const text = await res.text();
    // forward status and body
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") || "application/json" }
    });
  } catch (err) {
    console.error("Proxy /devices error:", err);
    return NextResponse.json({ error: "Proxy fetch failed" }, { status: 502 });
  }
}