import { NextResponse } from "next/server";
const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL ;
const API_KEY = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || "";

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // Only protect authenticated routes
  const protectedPaths = ["/", "/newEncounter", "/registerUser", "/reports", "/sectionEditor", "/sidebar"];
  const isProtected = protectedPaths.some(path => pathname === path || pathname.startsWith(path + "/"));

  if (!isProtected) return NextResponse.next();

  // ✅ Read session_id cookie (await not needed in middleware - req.cookies is synchronous)
  const sessionId = req.cookies.get("session_id")?.value;

  if (!sessionId) {
    // Only redirect if we're not already on the login page
    if (pathname === "/login") {
      return NextResponse.next();
    }
    
    console.warn("❌ No session_id cookie, redirecting to /login");
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    // ✅ Verify session with Flask backend
    const res = await fetch(`${API_BASE_URL}/verify-session`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify({ session_id: sessionId }),
    });

    if (!res.ok) {
      console.warn("❌ Session verification failed, redirecting to /login");
      
      // Clear the invalid cookie
      const response = NextResponse.redirect(new URL("/login", req.url));
      response.cookies.delete("session_id");
      return response;
    }

    const data = await res.json();
    if (!data.valid) {
      console.warn("⚠️ Invalid session, redirecting to /login");
      
      const response = NextResponse.redirect(new URL("/login", req.url));
      response.cookies.delete("session_id");
      return response;
    }

    console.log("✅ Valid session for user:", data.user_id);
    return NextResponse.next();

  } catch (err) {
    console.error("💥 Middleware verification error:", err);
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: [
    "/",
    "/newEncounter/:path*",
    "/registerUser/:path*",
    "/reports/:path*",
    "/sectionEditor/:path*",
    "/sidebar/:path*"
  ],
};
