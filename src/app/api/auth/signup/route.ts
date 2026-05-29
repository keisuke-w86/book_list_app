import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { email, username, password } = await req.json();

  if (!email || !username || !password) {
    return NextResponse.json({ error: "すべての項目を入力してください" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  if (existing) {
    const error =
      existing.email === email
        ? "このメールアドレスは既に使用されています"
        : "このユーザ名は既に使用されています";
    return NextResponse.json({ error }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, username, password: hashed },
  });

  await createSession(user.id);
  return NextResponse.json({ ok: true, username: user.username }, { status: 201 });
}
