export const runtime = "nodejs";


import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET || "supersecret";

export async function POST(req) {
  const { email, password } = await req.json();

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ success: false, message: "User already exists" }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashedPassword },
  });

  const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: "1h" });

  const res = NextResponse.json({
    success: true,
    message: "Signup successful",
    userId: user.id,
  });

  res.cookies.set("token", token, { httpOnly: true, path: "/" });

  return res;
}
