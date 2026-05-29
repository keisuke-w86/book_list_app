import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import LogoutButton from "./LogoutButton";

export default async function Navbar() {
  const session = await getSession();
  const user = session
    ? await prisma.user.findUnique({ where: { id: session.userId }, select: { username: true } })
    : null;

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* 左: ロゴ + ユーザ情報 */}
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold text-gray-900 tracking-tight">
            📚 My Bookshelf
          </Link>
          {user && (
            <div className="flex items-center gap-3 border-l border-gray-200 pl-4 text-xs text-gray-400">
              <span>{user.username}</span>
              <LogoutButton />
            </div>
          )}
        </div>
        {/* 右: ナビゲーション */}
        <nav className="flex items-center gap-6 text-sm text-gray-600">
          <Link href="/" className="hover:text-gray-900 transition-colors">
            本棚
          </Link>
          <Link href="/stats" className="hover:text-gray-900 transition-colors">
            統計
          </Link>
          <Link href="/tags" className="hover:text-gray-900 transition-colors">
            タグ
          </Link>
          <Link
            href="/books/new"
            className="bg-gray-900 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-gray-700 transition-colors"
          >
            ＋ 本を追加
          </Link>
        </nav>
      </div>
    </header>
  );
}
