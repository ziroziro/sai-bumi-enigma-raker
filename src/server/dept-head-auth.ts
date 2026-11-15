import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { officialGroups } from "@/config/event";

export const DEPT_HEAD_COOKIE_NAME = "dept_head_session";

export interface DeptHeadAccountCredential {
  groupNumber: number;
  groupName: string;
  groupTitle: string;
  email: string;
  password: string;
}

const DEFAULT_EMAILS: Record<number, string> = {
  1: "lupin@enigma.id",
  2: "jubun@enigma.id",
  3: "conan@enigma.id",
  4: "holmes@enigma.id",
};

const DEFAULT_PASSWORDS: Record<number, string> = {
  1: "Lupin#2027",
  2: "Jubun#2027",
  3: "Conan#2027",
  4: "Holmes#2027",
};

function getSessionSecret(): string {
  return (
    process.env.DEPT_HEAD_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.ADMIN_PASSWORD ||
    "enigma-dept-head-session-2027"
  );
}

export function getDeptHeadAccounts(): DeptHeadAccountCredential[] {
  return officialGroups.map((group) => {
    const emailEnv = process.env[`DEPT_HEAD_EMAIL_${group.number}`];
    const passEnv = process.env[`DEPT_HEAD_PASSWORD_${group.number}`];
    return {
      groupNumber: group.number,
      groupName: group.name,
      groupTitle: group.title,
      email: (emailEnv?.trim() || DEFAULT_EMAILS[group.number] || "").toLowerCase(),
      password: passEnv?.trim() || DEFAULT_PASSWORDS[group.number] || "",
    };
  });
}

export function verifyDeptHeadCredentials(
  emailInput: string,
  passwordInput: string
): DeptHeadAccountCredential | null {
  const email = emailInput.trim().toLowerCase();
  const password = passwordInput.trim();
  if (!email || !password) return null;

  const account = getDeptHeadAccounts().find((acc) => acc.email === email);
  if (!account) return null;

  const expectedBuf = Buffer.from(account.password, "utf8");
  const actualBuf = Buffer.from(password, "utf8");
  if (expectedBuf.length !== actualBuf.length) return null;
  if (!timingSafeEqual(expectedBuf, actualBuf)) return null;

  return account;
}

export function createDeptHeadSessionToken(groupNumber: number): string {
  const payload = String(groupNumber);
  const sig = createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyDeptHeadSessionToken(token: string | undefined | null): number | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payload, sig] = parts;
  if (!payload || !sig) return null;
  const groupNumber = Number(payload);
  if (!Number.isInteger(groupNumber) || groupNumber < 1 || groupNumber > 4) {
    return null;
  }

  const expectedSig = createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  const actualBuf = Buffer.from(sig, "utf8");
  if (expectedBuf.length !== actualBuf.length) return null;
  if (!timingSafeEqual(expectedBuf, actualBuf)) return null;

  return groupNumber;
}

function parseCookieValue(cookieHeader: string, cookieName: string): string | null {
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === cookieName) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}

export function getDeptHeadGroupFromRequest(request: Request): number | null {
  const cookieHeader = request.headers.get("cookie") || "";
  const rawToken = parseCookieValue(cookieHeader, DEPT_HEAD_COOKIE_NAME);
  return verifyDeptHeadSessionToken(rawToken);
}

export async function getDeptHeadGroupFromCookies(): Promise<number | null> {
  const store = await cookies();
  const token = store.get(DEPT_HEAD_COOKIE_NAME)?.value;
  return verifyDeptHeadSessionToken(token);
}
