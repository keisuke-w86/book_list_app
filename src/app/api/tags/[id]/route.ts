import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "名前は必須です" }, { status: 400 });
  }
  try {
    const tag = await prisma.tag.update({
      where: { id },
      data: { name: name.trim() },
    });
    return NextResponse.json(tag);
  } catch {
    return NextResponse.json({ error: "同じ名前のタグが既に存在します" }, { status: 409 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.tag.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
