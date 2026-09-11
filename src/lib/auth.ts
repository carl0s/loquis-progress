import { cookies } from "next/headers";

// Two roles behind one login form:
//   owner  (DASHBOARD_PASSWORD) edits everything at "/"
//   viewer (CLIENT_PASSWORD)    reads the client view at "/cliente" only
// Without DASHBOARD_PASSWORD the app refuses to serve anything, locally and on Vercel.

export type Role = "owner" | "viewer";

export const SESSION_COOKIE = "loquis_session";
const MAX_AGE = 60 * 60 * 24 * 30;
const encoder = new TextEncoder();

export const authEnabled = () => Boolean(process.env.DASHBOARD_PASSWORD);
export const clientViewEnabled = () => Boolean(process.env.CLIENT_PASSWORD);
export const authMisconfigured = () => !authEnabled();

async function hmacKey() {
  const secret = process.env.SESSION_SECRET || process.env.DASHBOARD_PASSWORD || "";
  return crypto.subtle.importKey("raw", encoder.encode(`loquis:${secret}`), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
}

async function sign(payload: string) {
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(payload));
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Viewer sessions are bound to the current client password: changing it revokes them.
const sessionPayload = (role: Role, expires: string) =>
  role === "viewer" ? `${role}.${expires}:${process.env.CLIENT_PASSWORD ?? ""}` : `${role}.${expires}`;

export async function createSession(role: Role) {
  const expires = String(Date.now() + MAX_AGE * 1000);
  return { value: `${role}.${expires}.${await sign(sessionPayload(role, expires))}`, maxAge: MAX_AGE };
}

export async function verifySession(value: string | undefined): Promise<Role | null> {
  if (!value) return null;
  const [role, expires, signature] = value.split(".");
  if (role !== "owner" && role !== "viewer") return null;
  if (!expires || !signature || Number(expires) < Date.now()) return null;
  if (role === "viewer" && !clientViewEnabled()) return null;
  return safeEqual(signature, await sign(sessionPayload(role, expires))) ? role : null;
}

export async function roleForPassword(input: string): Promise<Role | null> {
  const probe = await sign(`pw:${input}`);
  const candidates: [Role, string | undefined][] = [
    ["owner", process.env.DASHBOARD_PASSWORD],
    ["viewer", process.env.CLIENT_PASSWORD],
  ];
  for (const [role, password] of candidates) {
    if (password && safeEqual(probe, await sign(`pw:${password}`))) return role;
  }
  return null;
}

/** Role of the current request, for pages, server actions and route handlers. */
export async function currentRole(): Promise<Role | null> {
  if (authMisconfigured()) return null;
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

/** Every write goes through this: the proxy guards pages, this guards actions. */
export const isOwner = async () => (await currentRole()) === "owner";
