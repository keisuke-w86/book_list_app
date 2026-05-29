import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const getSecret = () =>
  new TextEncoder().encode(process.env.SESSION_SECRET!);

const COOKIE_NAME = "session";
const EXPIRES_IN = 60 * 60 * 24 * 30; // 30日

export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: EXPIRES_IN,
    path: "/",
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<{ userId: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return { userId: payload.userId as string };
  } catch {
    return null;
  }
}

/** プロキシ内で同期的に JWT を検証する（リクエストの Cookie を直接使う） */
export async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}
