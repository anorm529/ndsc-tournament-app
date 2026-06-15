"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ActionState, errorState } from "@/lib/action-state";
import { verifyAdminPassword } from "@/lib/admin-users";
import { ADMIN_SESSION_COOKIE, getAdminPassword, getAdminSessionToken } from "@/lib/admin-session";
import { prisma } from "@/lib/db";

export async function login(_state: ActionState, formData: FormData) {
  let redirectTo = "/admin";

  try {
    const password = readString(formData, "password");
    const email = readString(formData, "email").trim().toLowerCase();
    const next = readString(formData, "next") || "/admin";
    const sessionToken = getAdminSessionToken();

    if (!sessionToken) {
      throw new Error("Admin session secret is not configured.");
    }

    const adminUsersCount = await prisma.adminUser.count();

    if (adminUsersCount > 0) {
      if (!email) {
        throw new Error("Email is required.");
      }

      const adminUser = await prisma.adminUser.findUnique({
        where: { email },
      });

      if (!adminUser || !verifyAdminPassword(password, adminUser.passwordHash)) {
        throw new Error("Those admin details are not correct.");
      }
    } else {
      const expectedPassword = getAdminPassword();

      if (!expectedPassword) {
        throw new Error("Admin password is not configured.");
      }

      if (password !== expectedPassword) {
        throw new Error("That password is not correct.");
      }
    }

    const cookieStore = await cookies();
    cookieStore.set(ADMIN_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      maxAge: 60 * 60 * 12,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    redirectTo = next.startsWith("/admin") ? next : "/admin";
  } catch (error) {
    return errorState(error);
  }

  redirect(redirectTo);
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  redirect("/");
}

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
