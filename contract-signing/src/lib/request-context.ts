import { headers } from "next/headers";

export async function getRequestContext(): Promise<{
  ip: string | null;
  userAgent: string | null;
}> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  const ip =
    forwardedFor?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    h.get("cf-connecting-ip") ??
    null;
  const userAgent = h.get("user-agent");
  return { ip, userAgent };
}
