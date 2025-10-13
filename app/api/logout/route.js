export const runtime = "nodejs";
import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.redirect(new URL("/login", "http://localhost:3000"));

  // Delete the cookie client-accessible
  res.cookies.set("token", "", {
    path: "/",
    maxAge: 0,
  });

  return res;
}
