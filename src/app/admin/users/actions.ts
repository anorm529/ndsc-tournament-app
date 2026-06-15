"use server";

import { refresh, revalidatePath } from "next/cache";

import { ActionState, errorState, successState } from "@/lib/action-state";
import { hashAdminPassword } from "@/lib/admin-users";
import { requireOwnerAdminUser } from "@/lib/current-admin";
import { prisma } from "@/lib/db";

const roles = ["owner", "tournament_admin", "scorekeeper", "viewer"] as const;

export async function createAdminUser(_state: ActionState, formData: FormData) {
  try {
    const userCount = await prisma.adminUser.count();
    if (userCount > 0) {
      await requireOwnerAdminUser();
    }

    const name = requireText(formData, "name");
    const email = requireText(formData, "email").toLowerCase();
    const role = userCount === 0 ? "owner" : requireRole(formData);
    const password = requireText(formData, "password");

    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    await prisma.adminUser.create({
      data: {
        email,
        name,
        passwordHash: hashAdminPassword(password),
        role,
      },
    });

    revalidatePath("/admin/users");
    refresh();
    return successState(`${name} was added as an admin user.`);
  } catch (error) {
    return errorState(error);
  }
}

export async function updateAdminUser(_state: ActionState, formData: FormData) {
  try {
    await requireOwnerAdminUser();

    const userId = requireText(formData, "userId");
    const name = requireText(formData, "name");
    const email = requireText(formData, "email").toLowerCase();
    const role = requireRole(formData);
    const password = optionalText(formData, "password");

    if (password && password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    await preventRemovingLastOwner(userId, role);

    await prisma.adminUser.update({
      where: { id: userId },
      data: {
        email,
        name,
        role,
        ...(password ? { passwordHash: hashAdminPassword(password) } : {}),
      },
    });

    revalidatePath("/admin/users");
    refresh();
    return successState(`${name} was saved.`);
  } catch (error) {
    return errorState(error);
  }
}

export async function deleteAdminUser(_state: ActionState, formData: FormData) {
  try {
    await requireOwnerAdminUser();

    const userId = requireText(formData, "userId");
    const userCount = await prisma.adminUser.count();

    if (userCount <= 1) {
      throw new Error("Keep at least one admin user.");
    }

    await preventDeletingLastOwner(userId);

    const deleted = await prisma.adminUser.delete({
      where: { id: userId },
    });

    revalidatePath("/admin/users");
    refresh();
    return successState(`${deleted.name} was deleted.`);
  } catch (error) {
    return errorState(error);
  }
}

async function preventRemovingLastOwner(userId: string, nextRole: string) {
  if (nextRole === "owner") {
    return;
  }

  const existing = await prisma.adminUser.findUniqueOrThrow({
    where: { id: userId },
    select: { role: true },
  });

  if (existing.role !== "owner") {
    return;
  }

  const ownerCount = await prisma.adminUser.count({
    where: { role: "owner" },
  });

  if (ownerCount <= 1) {
    throw new Error("Keep at least one owner.");
  }
}

async function preventDeletingLastOwner(userId: string) {
  const user = await prisma.adminUser.findUniqueOrThrow({
    where: { id: userId },
    select: { role: true },
  });

  if (user.role !== "owner") {
    return;
  }

  const ownerCount = await prisma.adminUser.count({
    where: { role: "owner" },
  });

  if (ownerCount <= 1) {
    throw new Error("Keep at least one owner.");
  }
}

function requireRole(formData: FormData) {
  const role = requireText(formData, "role");

  if (!roles.includes(role as (typeof roles)[number])) {
    throw new Error("Role is invalid.");
  }

  return role;
}

function requireText(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} is required.`);
  }

  return value.trim();
}

function optionalText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
