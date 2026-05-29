import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "fallback-secret"
);

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/signup"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const token = request.cookies.get("session")?.value;

  // 認証済みでログイン画面 → トップへ
  if (isPublic && token) {
    try {
      await jwtVerify(token, SECRET);
      if (pathname.startsWith("/login")) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    } catch {
      // トークン無効はそのまま通過
    }
  }

  // 未認証で保護ルート → ログインへ
  if (!isPublic) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    try {
      await jwtVerify(token, SECRET);
    } catch {
      const res = NextResponse.redirect(new URL("/login", request.url));
      res.cookies.delete("session");
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
