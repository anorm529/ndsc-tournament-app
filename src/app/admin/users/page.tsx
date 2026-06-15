import { KeyRound, Plus, Save, Trash2, Users } from "lucide-react";

import { ActionForm, ConfirmSubmitButton } from "@/components/admin/action-form";
import { ButtonShell, PageHeader, Panel, Stat } from "@/components/admin/admin-ui";
import { prisma } from "@/lib/db";

import { createAdminUser, deleteAdminUser, updateAdminUser } from "./actions";

export const dynamic = "force-dynamic";

const roleOptions = [
  ["owner", "Owner"],
  ["tournament_admin", "Tournament admin"],
  ["scorekeeper", "Scorekeeper"],
  ["viewer", "Viewer"],
];

export default async function AdminUsersPage() {
  const users = await prisma.adminUser.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Admin Users" description="Manage named admin access for tournament operations." />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={Users} label="Users" value={`${users.length}`} detail="Can access admin" />
        <Stat icon={KeyRound} label="Roles" value={`${new Set(users.map((user) => user.role)).size}`} detail="In use" />
        <Stat icon={Users} label="Fallback" value={users.length === 0 ? "On" : "Off"} detail="Env password only before users exist" />
      </div>

      <Panel title="Create admin user">
        <ActionForm action={createAdminUser} className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-end">
          <TextField label="Name" name="name" required />
          <TextField label="Email" name="email" required type="email" />
          <SelectField label="Role" name="role" value="tournament_admin" />
          <TextField label="Password" name="password" required type="password" />
          <ButtonShell><Plus size={16} /> Add</ButtonShell>
        </ActionForm>
      </Panel>

      <Panel title="Current users">
        <div className="grid gap-3">
          {users.map((user) => (
            <div key={user.id} className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <ActionForm action={updateAdminUser} className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto_auto] lg:items-end">
                <input name="userId" type="hidden" value={user.id} />
                <TextField label="Name" name="name" required value={user.name} />
                <TextField label="Email" name="email" required type="email" value={user.email} />
                <SelectField label="Role" name="role" value={user.role} />
                <TextField label="New password" name="password" placeholder="Leave unchanged" type="password" />
                <ButtonShell><Save size={16} /> Save</ButtonShell>
              </ActionForm>
              <ActionForm action={deleteAdminUser} className="mt-3">
                <input name="userId" type="hidden" value={user.id} />
                <ConfirmSubmitButton confirmMessage={`Delete admin user ${user.name}?`}>
                  <Trash2 size={14} /> Delete
                </ConfirmSubmitButton>
              </ActionForm>
            </div>
          ))}
          {users.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-300 bg-white p-5 text-sm font-semibold text-slate-600">
              No named admin users yet. Create one here, then future logins will use email and password.
            </p>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}

function TextField({
  label,
  name,
  placeholder,
  required,
  type = "text",
  value,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  value?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
      <input
        className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm font-medium"
        defaultValue={value}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  );
}

function SelectField({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
      <select
        className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm font-medium"
        defaultValue={value}
        name={name}
      >
        {roleOptions.map(([role, label]) => (
          <option key={role} value={role}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
