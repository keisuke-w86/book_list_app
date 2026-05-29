import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const book = await prisma.book.findUnique({
    where: { id, userId: session.userId },
    include: { tags: { include: { tag: true } } },
  });
  if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(book);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { tags, readAt, ...data } = body;

  await prisma.bookTag.deleteMany({ where: { bookId: id } });

  const book = await prisma.book.update({
    where: { id, userId: session.userId },
    data: {
      ...data,
      readAt: readAt ? new Date(readAt) : null,
      tags: tags?.length
        ? {
            create: await Promise.all(
              tags.map(async (name: string) => {
                const tag = await prisma.tag.upsert({
                  where: { name },
                  update: {},
                  create: { name },
                });
                return { tagId: tag.id };
              })
            ),
          }
        : undefined,
    },
    include: { tags: { include: { tag: true } } },
  });

  return NextResponse.json(book);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.book.delete({ where: { id, userId: session.userId } });
  return NextResponse.json({ ok: true });
}
