import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

import { prisma } from "@/lib/db";
import { getAdminSessionToken } from "@/lib/admin-session";

export const ADMIN_USER_COOKIE = "ndsc_admin_user";

export type CurrentAdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export function createAdminUserCookieValue(userId: string) {
  return `${userId}.${signAdminUserId(userId)}`;
}

export async function getCurrentAdminUser(): Promise<CurrentAdminUser | null> {
  const cookieStore = await cookies();
  const userId = parseAdminUserCookieValue(cookieStore.get(ADMIN_USER_COOKIE)?.value);

  if (!userId) {
    return null;
  }

  return prisma.adminUser.findUnique({
    where: { id: userId },
    select: {
      email: true,
      id: true,
      name: true,
      role: true,
    },
  });
}

export async function canManageAdminUsers() {
  const [currentUser, adminUsersCount] = await Promise.all([
    getCurrentAdminUser(),
    prisma.adminUser.count(),
  ]);

  return adminUsersCount === 0 || currentUser?.role === "owner";
}

export async function requireOwnerAdminUser() {
  const allowed = await canManageAdminUsers();

  if (!allowed) {
    throw new Error("Only owners can manage admin users.");
  }
}

function parseAdminUserCookieValue(value: string | undefined) {
  if (!value) {
    return null;
  }

  const [userId, signature] = value.split(".");

  if (!userId || !signature) {
    return null;
  }

  const expectedSignature = signAdminUserId(userId);
  const signatureBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  return timingSafeEqual(signatureBuffer, expectedBuffer) ? userId : null;
}

function signAdminUserId(userId: string) {
  const token = getAdminSessionToken();

  if (!token) {
    return "";
  }

  return createHmac("sha256", token).update(userId).digest("hex");
}
