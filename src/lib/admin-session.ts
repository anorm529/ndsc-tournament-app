export const ADMIN_SESSION_COOKIE = "ndsc_admin_session";

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD ?? (process.env.NODE_ENV === "production" ? "" : "admin");
}

export function getAdminSessionToken() {
  return (
    process.env.ADMIN_SESSION_SECRET ??
    (process.env.NODE_ENV === "production" ? "" : "ndsc-local-admin-session")
  );
}

export function isAdminSession(value: string | undefined) {
  const token = getAdminSessionToken();
  return Boolean(token && value === token);
}
