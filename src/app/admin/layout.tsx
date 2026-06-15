import Link from "next/link";
import { ArrowLeft, LogOut, Shield, Trophy, UserRound, Users } from "lucide-react";

import { logout } from "@/app/admin/login/actions";
import { canManageAdminUsers, getCurrentAdminUser } from "@/lib/current-admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [currentUser, canManageUsers] = await Promise.all([
    getCurrentAdminUser(),
    canManageAdminUsers(),
  ]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-w-0 max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-rose-700 text-white">
              <Shield size={20} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-slate-950">NDSC Tournament Admin</span>
              <span className="block truncate text-xs text-slate-500">Operations dashboard</span>
            </span>
          </Link>
          <div className="hidden items-center gap-2 sm:flex">
            <Link
              href="/"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft size={16} />
              Main page
            </Link>
            <Link
              href="/admin/tournaments"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Trophy size={16} />
              Tournaments
            </Link>
            <Link
              href="/admin/account"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <UserRound size={16} />
              {currentUser?.name ?? "Account"}
            </Link>
            {canManageUsers ? (
              <Link
                href="/admin/users"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Users size={16} />
                Users
              </Link>
            ) : null}
            <form action={logout}>
              <button className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                <LogOut size={16} />
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto min-w-0 max-w-7xl px-4 py-5 sm:px-6">
        {children}
      </div>
    </div>
  );
}
