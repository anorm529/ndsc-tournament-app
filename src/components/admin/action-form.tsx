"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { ActionState, initialActionState } from "@/lib/action-state";

type ServerAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function ActionForm({
  action,
  children,
  className,
}: {
  action: ServerAction;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, initialActionState);

  return (
    <form action={formAction} className={className}>
      {children}
      <ActionMessage state={state} />
    </form>
  );
}

export function ActionMessage({ state }: { state: ActionState }) {
  if (state.status === "idle" || !state.message) {
    return null;
  }

  const isError = state.status === "error";

  return (
    <p
      aria-live="polite"
      className={`col-span-full rounded-md border px-3 py-2 text-sm font-medium ${
        isError
          ? "border-rose-200 bg-rose-50 text-rose-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      {state.message}
    </p>
  );
}

export function SubmitButton({
  children,
  className,
  pendingChildren = "Saving...",
}: {
  children: React.ReactNode;
  className?: string;
  pendingChildren?: React.ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={
        className ??
        "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      }
      disabled={pending}
      type="submit"
    >
      {pending ? pendingChildren : children}
    </button>
  );
}

export function ConfirmSubmitButton({
  children,
  className,
  confirmMessage,
  pendingChildren = "Deleting...",
}: {
  children: React.ReactNode;
  className?: string;
  confirmMessage: string;
  pendingChildren?: React.ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={
        className ??
        "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      }
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      type="submit"
    >
      {pending ? pendingChildren : children}
    </button>
  );
}
