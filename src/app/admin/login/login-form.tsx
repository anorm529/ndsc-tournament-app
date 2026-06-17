"use client";

import { LockKeyhole } from "lucide-react";

import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { login } from "./actions";

export function LoginForm({ next }: { next: string }) {
  return (
    <ActionForm action={login} className="space-y-4">
      <input name="next" type="hidden" value={next} />
      <label className="block">
        <span className="text-xs font-semibold uppercase text-slate-500">Email</span>
        <input
          autoComplete="email"
          autoFocus
          className="mt-1 h-12 w-full rounded-md border border-slate-300 px-3 text-base font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          name="email"
          required
          type="email"
        />
      </label>
      <label className="block">
        <span className="text-xs font-semibold uppercase text-slate-500">Password</span>
        <input
          autoComplete="current-password"
          className="mt-1 h-12 w-full rounded-md border border-slate-300 px-3 text-base font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          name="password"
          required
          type="password"
        />
      </label>
      <SubmitButton className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
        <LockKeyhole size={16} /> Unlock admin
      </SubmitButton>
    </ActionForm>
  );
}
