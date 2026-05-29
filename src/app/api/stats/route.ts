import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const books = await prisma.book.findMany({
    where: { userId: session.userId },
    select: { status: true, rating: true, readAt: true, createdAt: true },
  });

  const statusCount = { want: 0, reading: 0, read: 0 };
  const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const monthlyRead: Record<string, number> = {};

  for (const book of books) {
    statusCount[book.status as keyof typeof statusCount]++;

    if (book.rating) {
      const rounded = Math.round(book.rating);
      ratingDist[rounded] = (ratingDist[rounded] || 0) + 1;
    }

    if (book.status === "read" && book.readAt) {
      const key = book.readAt.toISOString().slice(0, 7);
      monthlyRead[key] = (monthlyRead[key] || 0) + 1;
    }
  }

  const sortedMonths = Object.entries(monthlyRead)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-24)
    .map(([month, count]) => ({ month, count }));

  return NextResponse.json({
    statusCount,
    ratingDist: Object.entries(ratingDist).map(([star, count]) => ({
      star: Number(star),
      count,
    })),
    monthlyRead: sortedMonths,
    total: books.length,
  });
}
