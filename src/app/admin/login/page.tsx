import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

import { LoginForm } from "./login-form";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next = "/admin" } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-160px)] max-w-md flex-col justify-center">
      <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-950">
        <ArrowLeft size={16} /> Main page
      </Link>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-md bg-rose-700 text-white">
            <Shield size={20} />
          </span>
          <div>
            <h1 className="text-xl font-black text-slate-950">Admin login</h1>
            <p className="text-sm text-slate-500">Tournament operations are password protected.</p>
          </div>
        </div>
        <div className="mt-6">
          <LoginForm next={next} />
        </div>
      </section>

    </div>
  );
}
