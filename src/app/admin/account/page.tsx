import { KeyRound, ShieldCheck } from "lucide-react";

import { ActionForm } from "@/components/admin/action-form";
import { ButtonShell, PageHeader, Panel } from "@/components/admin/admin-ui";
import { getCurrentAdminUser } from "@/lib/current-admin";

import { changeOwnPassword } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminAccountPage() {
  const currentUser = await getCurrentAdminUser();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Account"
        description="Change your own admin password. Owners can still manage all users from the Users page."
      />

      {!currentUser ? (
        <Panel title="Named login required">
          <p className="text-sm font-medium text-slate-600">
            You are using the temporary fallback admin login. Create a named admin user, then log in with email and password to manage your own account.
          </p>
        </Panel>
      ) : (
        <>
          <Panel title="Your access">
            <div className="grid gap-3 sm:grid-cols-3">
              <ReadOnlyField label="Name" value={currentUser.name} />
              <ReadOnlyField label="Email" value={currentUser.email} />
              <ReadOnlyField label="Role" value={formatRole(currentUser.role)} />
            </div>
          </Panel>

          <Panel title="Change password">
            <ActionForm action={changeOwnPassword} className="grid gap-3 md:grid-cols-3 md:items-end">
              <PasswordField label="Current password" name="currentPassword" />
              <PasswordField label="New password" name="newPassword" />
              <PasswordField label="Confirm new password" name="confirmPassword" />
              <div className="md:col-span-3">
                <ButtonShell>
                  <KeyRound size={16} /> Change password
                </ButtonShell>
              </div>
            </ActionForm>
          </Panel>
        </>
      )}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
        <ShieldCheck size={16} />
        {label}
      </div>
      <p className="mt-2 text-lg font-bold text-slate-950">{value}</p>
    </div>
  );
}

function PasswordField({ label, name }: { label: string; name: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
      <input
        autoComplete={name === "currentPassword" ? "current-password" : "new-password"}
        className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm font-medium"
        name={name}
        required
        type="password"
      />
    </label>
  );
}

function formatRole(role: string) {
  return role.replaceAll("_", " ");
}
