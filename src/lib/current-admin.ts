import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

import { prisma } from "@/lib/db";
import { getAdminSessionToken } from "@/lib/admin-session";

export const ADMIN_USER_COOKIE = "ndsc_admin_user";

export type CurrentAdminUser = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
};

export const adminRoles = ["owner", "tournament_admin", "scorekeeper", "viewer"] as const;

export type AdminRole = (typeof adminRoles)[number];

const roleRank: Record<AdminRole, number> = {
  viewer: 0,
  scorekeeper: 1,
  tournament_admin: 2,
  owner: 3,
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

  const user = await prisma.adminUser.findUnique({
    where: { id: userId },
    select: {
      email: true,
      id: true,
      name: true,
      role: true,
    },
  });

  if (!user || !isAdminRole(user.role)) {
    return null;
  }

  return {
    ...user,
    role: user.role,
  };
}

export async function canManageAdminUsers() {
  const [currentUser, adminUsersCount] = await Promise.all([
    getCurrentAdminUser(),
    prisma.adminUser.count(),
  ]);

  return adminUsersCount === 0 || currentUser?.role === "owner";
}

export async function getCurrentAdminRole(): Promise<AdminRole | null> {
  const adminUsersCount = await prisma.adminUser.count();

  if (adminUsersCount === 0) {
    return "owner";
  }

  const user = await getCurrentAdminUser();
  return user?.role ?? null;
}

export async function canUseMinimumRole(minimumRole: AdminRole) {
  const role = await getCurrentAdminRole();
  return Boolean(role && roleRank[role] >= roleRank[minimumRole]);
}

export async function requireMinimumRole(minimumRole: AdminRole) {
  const allowed = await canUseMinimumRole(minimumRole);

  if (!allowed) {
    throw new Error(`Only ${formatRole(minimumRole)}s and owners can do that.`);
  }
}

export async function requireOwnerAdminUser() {
  const allowed = await canManageAdminUsers();

  if (!allowed) {
    throw new Error("Only owners can manage admin users.");
  }
}

export function formatRole(role: string) {
  return role.replaceAll("_", " ");
}

export function isAdminRole(value: string): value is AdminRole {
  return adminRoles.includes(value as AdminRole);
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
