import { NextResponse } from "next/server";
const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
const API_KEY = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || "";
const TOKEN_KEY = process.env.TOKEN_KEY || process.env.NEXT_PUBLIC_TOKEN_KEY;

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // ✅ Define paths that DO NOT require authentication
  const publicPaths = ["/login", "/api/proxy/login", "/api/refresh", "/api/backend/login", "/api/backend/registerUser"];
  const isPublic = publicPaths.some(path => pathname === path || pathname.startsWith(path + "/"));

  // Allow static files, Next.js internal routes, and public paths
  if (isPublic || pathname.startsWith("/_next/") || pathname.includes("favicon.ico")) {
    return NextResponse.next();
  }

  // ✅ Read session_id cookie (await not needed in middleware - req.cookies is synchronous)
  const sessionId = req.cookies.get("session_id")?.value;

  if (!sessionId) {
    console.warn(`❌ No session_id cookie, redirecting ${pathname} to /login`);
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    // ✅ Verify session with Flask backend
    const res = await fetch(`${API_BASE_URL}/verify-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TOKEN_KEY}`,
        "X-API-KEY": API_KEY
      },
      body: JSON.stringify({ session_id: sessionId }),
    });

    if (!res.ok) {
      console.warn("❌ Session verification failed, redirecting to /login");
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const data = await res.json();
    if (!data.valid) {
      console.warn("⚠️ Invalid session, redirecting to /login");
      return NextResponse.redirect(new URL("/login", req.url));
    }

    console.log("✅ Valid session for user:", data.user_id);
    return NextResponse.next();

  } catch (err) {
    console.error("💥 Middleware verification error:", err);
    console.warn("⚠️ Backend unreachable, allowing access with existing cookie");
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (static files)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
