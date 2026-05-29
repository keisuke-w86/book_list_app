import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { expandKeyword } from "@/lib/kana";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") || undefined;
  const keyword = searchParams.get("q") || undefined;
  const tag = searchParams.get("tag") || undefined;
  const sort = searchParams.get("sort") || "createdAt";
  const order = (searchParams.get("order") || "desc") as "asc" | "desc";

  const books = await prisma.book.findMany({
    where: {
      userId: session.userId,
      ...(status ? { status } : {}),
      ...(keyword
        ? {
            OR: expandKeyword(keyword).flatMap((term) => [
              { title: { contains: term } },
              { author: { contains: term } },
              { authorReading: { contains: term } },
            ]),
          }
        : {}),
      ...(tag ? { tags: { some: { tag: { name: tag } } } } : {}),
    },
    include: { tags: { include: { tag: true } } },
    orderBy: { [sort]: order },
  });

  return NextResponse.json(books);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { tags, readAt, ...data } = body;

  const book = await prisma.book.create({
    data: {
      ...data,
      userId: session.userId,
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

  return NextResponse.json(book, { status: 201 });
}
