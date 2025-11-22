export const runtime = "nodejs";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET || "supersecret";

export async function POST(req) {
  const { email, password } = await req.json();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      { success: false, message: "Invalid credentials" },
      { status: 401 }
    );
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json(
      { success: false, message: "Invalid credentials" },
      { status: 401 }
    );
  }

  const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: "1h" });

  const resData = {
    success: true,
    message: "Login successful",
    userId: user.id,
  };

  // Special route for admin
  if (email === "admin@arcaai.com" && password === "admin@123") {
    resData.redirect = "/admin";
  }

  const res = NextResponse.json(resData);

  res.cookies.set("token", token, {
    path: "/",
    sameSite: "lax",
    secure: false,
    httpOnly: false,
  });

  return res;
}
