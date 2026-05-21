import { headers } from "next/headers";

export async function requireAdminToken(): Promise<void> {
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) {
    throw new Error("ADMIN_API_TOKEN not configured");
  }

  const h = await headers();
  const got = h.get("x-admin-token");
  if (got !== expected) {
    throw new Error("Unauthorized");
  }
}

export async function isAdmin(): Promise<boolean> {
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) return false;
  const h = await headers();
  return h.get("x-admin-token") === expected;
}
