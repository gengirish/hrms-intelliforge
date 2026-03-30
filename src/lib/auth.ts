import { hash, compare } from "bcryptjs";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BCRYPT_ROUNDS = 12;
const COOKIE_NAME = "hrms-session";
const JWT_EXPIRY = "7d";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return compare(password, passwordHash);
}

export interface SessionPayload extends JWTPayload {
  sub: string;
  role: "admin" | "intern";
  email: string;
  tokenVersion?: number;
}

export async function signJWT(payload: {
  userId: string;
  role: "admin" | "intern";
  email: string;
  tokenVersion?: number;
}): Promise<string> {
  const tokenVersion = payload.tokenVersion ?? 0;
  return new SignJWT({
    role: payload.role,
    email: payload.email,
    tokenVersion,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(getJwtSecret());
}

export async function verifyJWT(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyJWT(token);
}

export async function getSessionFromHeaders(): Promise<SessionPayload | null> {
  const hdrs = await headers();
  const userId = hdrs.get("x-user-id");
  const role = hdrs.get("x-user-role") as "admin" | "intern" | null;
  const email = hdrs.get("x-user-email");
  if (!userId || !role || !email) return null;
  return { sub: userId, role, email } as SessionPayload;
}

export async function getAuthIntern() {
  const session = await getSession();
  if (!session?.sub) return null;
  return prisma.intern.findUnique({ where: { id: session.sub } });
}

export async function getAuthAdmin() {
  const session = await getSession();
  if (!session?.sub) return null;
  return prisma.admin.findUnique({ where: { id: session.sub } });
}

export { COOKIE_NAME };
