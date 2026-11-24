import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 jam

function getAdminPassword(): string {
  return (process.env.ADMIN_PASSWORD || "P@ssw0rd#adminEnigma2026").trim();
}

function getSigningSecret(): string {
  return (
    process.env.ADMIN_TOKEN_SECRET ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    `sai-bumi-enigma-hmac-v2::${getAdminPassword()}`
  );
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function verifyAdminPassword(password: string): boolean {
  if (!password || typeof password !== "string") return false;
  const candidate = password.trim();
  const expected = getAdminPassword();
  return safeEqual(candidate, expected);
}

export function issueAdminToken(): { token: string; expiresAt: string } {
  const now = Date.now();
  const exp = now + TOKEN_TTL_MS;
  const payload = Buffer.from(
    JSON.stringify({
      sub: "admin",
      iat: now,
      exp,
      jti: randomBytes(12).toString("hex"),
    }),
    "utf8"
  ).toString("base64url");

  const signature = createHmac("sha256", getSigningSecret())
    .update(payload)
    .digest("base64url");

  return {
    token: `${payload}.${signature}`,
    expiresAt: new Date(exp).toISOString(),
  };
}

export function verifyAdminToken(token: string): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.trim().split(".");
  if (parts.length !== 2) return false;

  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return false;

  const expectedSig = createHmac("sha256", getSigningSecret())
    .update(payloadB64)
    .digest("base64url");

  if (!safeEqual(sigB64, expectedSig)) return false;

  try {
    const decoded = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    ) as { sub?: string; exp?: number };
    if (decoded.sub !== "admin") return false;
    if (typeof decoded.exp !== "number" || decoded.exp <= Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

export function verifyAdminRequest(request: Request): boolean {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7).trim();
  return verifyAdminToken(token);
}
