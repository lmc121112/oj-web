import crypto from "crypto";
import { cookies } from "next/headers";

const SECRET = process.env.AUTH_SECRET || "default_secret_change_me";

export function hashPassword(password: string): string {
  return crypto.createHmac("sha256", SECRET).update(password).digest("hex");
}

export function createSessionToken(payload: { id: number; username: string; role: string }): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifySessionToken(token?: string): { id: number; username: string; role: string } | null {
  if (!token) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expectedSig = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  if (sig !== expectedSig) return null;
  try {
    return JSON.parse(Buffer.from(data, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
}

export function getCurrentUser() {
  const cookieStore = cookies();
  const token = cookieStore.get("oj_session")?.value;
  return verifySessionToken(token);
}
