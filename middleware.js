import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "supersecret");

async function verifyJWT(token) {
  try {
    await jwtVerify(token, SECRET);
    return true;
  } catch (err) {
    console.log("JWT verification failed:", err.message);
    return false;
  }
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("token")?.value;

  // Protect `/`
  const protectedPaths = ["/", "/newEncounter", "/registerUser", "/reports", "/sectionEditor", "/sidebar"];

  if (protectedPaths.includes(pathname)) {
    if (!token || !(await verifyJWT(token))) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }


  // Prevent logged-in users from accessing Login/Register
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    if (token && (await verifyJWT(token))) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/admin/:path*",
    "/api/:path*",
    "/newEncounter",
    "/registerUser",
    "/reports",
    "/sectionEditor",
    "/sidebar"
  ],
};
