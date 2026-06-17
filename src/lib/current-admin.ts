import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

import { findMainUserById, mapMainRoleToTournamentRole } from "@/lib/main-db-auth";
import { getAdminSessionToken } from "@/lib/admin-session";
import { prisma } from "@/lib/db";

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

  const user = await findMainUserById(userId);
  if (!user) return null;

  const role = mapMainRoleToTournamentRole(user.role);
  if (!role) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role,
  };
}

export async function canManageAdminUsers() {
  const currentUser = await getCurrentAdminUser();
  return currentUser?.role === "owner";
}

export async function getCurrentAdminRole(): Promise<AdminRole | null> {
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

// --- Granular permissions ---

export const adminPermissionTypes = ["tournaments", "schedule", "scores", "check_in"] as const;
export type AdminPermissionType = (typeof adminPermissionTypes)[number];

export const permissionLabels: Record<AdminPermissionType, string> = {
  tournaments: "Tournament management",
  schedule: "Schedule & templates",
  scores: "Score entry",
  check_in: "Check-in",
};

export async function getUserPermissions(userId: string): Promise<Set<AdminPermissionType>> {
  const rows = await prisma.adminPermission.findMany({
    where: { userId },
    select: { permission: true },
  });
  return new Set(rows.map((r) => r.permission as AdminPermissionType));
}

export async function hasPermission(permission: AdminPermissionType): Promise<boolean> {
  const user = await getCurrentAdminUser();
  if (!user) return false;
  if (user.role === "owner") return true;
  const perms = await getUserPermissions(user.id);
  return perms.has(permission);
}

export async function requirePermission(permission: AdminPermissionType): Promise<void> {
  const allowed = await hasPermission(permission);
  if (!allowed) {
    throw new Error("You don't have permission to do that.");
  }
}

function parseAdminUserCookieValue(value: string | undefined) {
  if (!value) {
    return null;
  }

  const dotIndex = value.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const userId = value.slice(0, dotIndex);
  const signature = value.slice(dotIndex + 1);

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
