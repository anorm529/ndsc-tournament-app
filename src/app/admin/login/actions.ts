"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ActionState, errorState } from "@/lib/action-state";
import { findMainUserByEmail, verifyMainUserPassword, mapMainRoleToTournamentRole } from "@/lib/main-db-auth";
import { ADMIN_SESSION_COOKIE, getAdminSessionToken } from "@/lib/admin-session";
import { ADMIN_USER_COOKIE, createAdminUserCookieValue } from "@/lib/current-admin";

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

    if (!email) {
      throw new Error("Email is required.");
    }

    const user = await findMainUserByEmail(email);

    if (!user) {
      throw new Error("Those login details are not correct.");
    }

    if (user.account_status !== "active") {
      throw new Error("Your account is not active. Contact the administrator.");
    }

    const tournamentRole = mapMainRoleToTournamentRole(user.role);
    if (!tournamentRole) {
      throw new Error("You do not have permission to access the admin area.");
    }

    if (!(await verifyMainUserPassword(password, user.password_hash))) {
      throw new Error("Those login details are not correct.");
    }

    const cookieStore = await cookies();
    cookieStore.set(ADMIN_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      maxAge: 60 * 60 * 12,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    cookieStore.set(ADMIN_USER_COOKIE, createAdminUserCookieValue(user.id), {
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
  cookieStore.delete(ADMIN_USER_COOKIE);
  redirect("/");
}

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
