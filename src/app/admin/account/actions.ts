"use server";

import { refresh } from "next/cache";

import { ActionState, errorState, successState } from "@/lib/action-state";
import { hashAdminPassword, verifyAdminPassword } from "@/lib/admin-users";
import { getCurrentAdminUser } from "@/lib/current-admin";
import { prisma } from "@/lib/db";

export async function changeOwnPassword(_state: ActionState, formData: FormData) {
  try {
    const currentUser = await getCurrentAdminUser();

    if (!currentUser) {
      throw new Error("Log in with your named admin account before changing your password.");
    }

    const currentPassword = requireText(formData, "currentPassword");
    const newPassword = requireText(formData, "newPassword");
    const confirmPassword = requireText(formData, "confirmPassword");

    if (newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters.");
    }

    if (newPassword !== confirmPassword) {
      throw new Error("New password and confirmation do not match.");
    }

    const adminUser = await prisma.adminUser.findUniqueOrThrow({
      where: { id: currentUser.id },
      select: { passwordHash: true },
    });

    if (!verifyAdminPassword(currentPassword, adminUser.passwordHash)) {
      throw new Error("Current password is not correct.");
    }

    await prisma.adminUser.update({
      where: { id: currentUser.id },
      data: {
        passwordHash: hashAdminPassword(newPassword),
      },
    });

    refresh();
    return successState("Your password was changed.");
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
