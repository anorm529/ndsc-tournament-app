import { ShieldCheck } from "lucide-react";

import { PageHeader, Panel } from "@/components/admin/admin-ui";
import { getCurrentAdminUser } from "@/lib/current-admin";

export const dynamic = "force-dynamic";

export default async function AdminAccountPage() {
  const currentUser = await getCurrentAdminUser();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Account"
        description="Your login is managed through the main NDSC platform."
      />

      {!currentUser ? (
        <Panel title="Not signed in">
          <p className="text-sm font-medium text-slate-600">
            Sign in with your NDSC account email and password to access the admin area.
          </p>
        </Panel>
      ) : (
        <Panel title="Your access">
          <div className="grid gap-3 sm:grid-cols-3">
            <ReadOnlyField label="Name" value={currentUser.name} />
            <ReadOnlyField label="Email" value={currentUser.email} />
            <ReadOnlyField label="Role" value={formatRole(currentUser.role)} />
          </div>
          <p className="mt-4 text-sm text-slate-500">
            To change your password or update your account details, use the main NDSC platform.
          </p>
        </Panel>
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

function formatRole(role: string) {
  return role.replaceAll("_", " ");
}
