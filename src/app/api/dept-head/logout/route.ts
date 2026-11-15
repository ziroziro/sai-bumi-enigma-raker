import { DEPT_HEAD_COOKIE_NAME } from "@/server/dept-head-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const response = Response.json({ success: true });
  response.headers.set(
    "Set-Cookie",
    `${DEPT_HEAD_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:01 GMT${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  );
  return response;
}
