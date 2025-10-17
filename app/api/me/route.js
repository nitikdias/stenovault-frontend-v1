import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET || "supersecret";

export async function GET(req) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ user: null });

  try {
    const payload = jwt.verify(token, SECRET);
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
    });

    return NextResponse.json({
      user: user ? { id: user.id, name: user.name, email: user.email } : null,
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
