"use server";

import { revalidatePath } from "next/cache";

import { ActionState, errorState, successState } from "@/lib/action-state";
import { requireOwnerAdminUser, adminPermissionTypes, type AdminPermissionType } from "@/lib/current-admin";
import { prisma } from "@/lib/db";

export async function saveUserPermissions(_state: ActionState, formData: FormData) {
  try {
    await requireOwnerAdminUser();

    const userId = requireText(formData, "userId");

    const granted = adminPermissionTypes.filter(
      (p) => formData.get(`permission_${p}`) === "on"
    );

    await prisma.$transaction([
      prisma.adminPermission.deleteMany({ where: { userId } }),
      ...(granted.length > 0
        ? [prisma.adminPermission.createMany({
            data: granted.map((permission) => ({ userId, permission })),
          })]
        : []),
    ]);

    revalidatePath("/admin/users");
    return successState("Permissions saved.");
  } catch (error) {
    return errorState(error);
  }
}

function requireText(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} is required.`);
  }
  return value.trim();
}
