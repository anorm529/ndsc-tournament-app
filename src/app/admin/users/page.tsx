import { Save, Shield, Users } from "lucide-react";

import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { PageHeader, Panel } from "@/components/admin/admin-ui";
import {
  canManageAdminUsers,
  adminPermissionTypes,
  permissionLabels,
  getUserPermissions,
  type AdminPermissionType,
} from "@/lib/current-admin";
import { mainDbPool } from "@/lib/main-db";
import { prisma } from "@/lib/db";

import { saveUserPermissions } from "./actions";

export const dynamic = "force-dynamic";

type MainDbUser = {
  id: string;
  email: string;
  name: string;
  role: "owner" | "admin";
};

async function getAdminUsersFromMainDb(): Promise<MainDbUser[]> {
  const result = await mainDbPool.query<MainDbUser>(`
    SELECT u.id::text AS id, u.email, u.role,
           COALESCE(p.display_name, split_part(u.email, '@', 1)) AS name
    FROM users u
    LEFT JOIN players p ON u.player_id = p.id
    WHERE u.role IN ('owner', 'admin')
    ORDER BY u.role DESC, name
  `);
  return result.rows;
}

export default async function AdminUsersPage() {
  const canManageUsers = await canManageAdminUsers();

  if (!canManageUsers) {
    return (
      <div className="space-y-5">
        <PageHeader title="Admin Users" description="Only owners can manage permissions." />
        <Panel title="Owner access required">
          <p className="text-sm font-medium text-slate-600">
            Only users with the owner role can assign permissions to other admins.
          </p>
        </Panel>
      </div>
    );
  }

  const [mainUsers, allPermissions] = await Promise.all([
    getAdminUsersFromMainDb(),
    prisma.adminPermission.findMany(),
  ]);

  const permissionsByUser = new Map<string, Set<AdminPermissionType>>();
  for (const row of allPermissions) {
    if (!permissionsByUser.has(row.userId)) {
      permissionsByUser.set(row.userId, new Set());
    }
    permissionsByUser.get(row.userId)!.add(row.permission as AdminPermissionType);
  }

  const owners = mainUsers.filter((u) => u.role === "owner");
  const admins = mainUsers.filter((u) => u.role === "admin");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Admin Users"
        description="Assign tournament permissions to users with the admin role. Owners always have full access."
      />

      {owners.length > 0 && (
        <Panel title="Owners">
          <p className="mb-3 text-xs text-slate-500">
            Owners have full access to everything and cannot be restricted.
          </p>
          <div className="grid gap-2">
            {owners.map((user) => (
              <div key={user.id} className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                <Shield size={16} className="shrink-0 text-rose-600" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-950">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                <span className="ml-auto shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                  Owner
                </span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel title="Admins">
        {admins.length === 0 ? (
          <p className="text-sm font-medium text-slate-600">
            No admin users found in the main NDSC platform. Grant a user the admin role there to give them access here.
          </p>
        ) : (
          <div className="grid gap-4">
            {admins.map((user) => {
              const userPerms = permissionsByUser.get(user.id) ?? new Set<AdminPermissionType>();
              return (
                <div key={user.id} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <Users size={16} className="shrink-0 text-slate-500" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <ActionForm action={saveUserPermissions} className="space-y-3">
                    <input type="hidden" name="userId" value={user.id} />
                    <div className="grid gap-2 sm:grid-cols-2">
                      {adminPermissionTypes.map((permission) => (
                        <label key={permission} className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 transition hover:border-slate-300">
                          <input
                            type="checkbox"
                            name={`permission_${permission}`}
                            defaultChecked={userPerms.has(permission)}
                            className="accent-slate-950"
                          />
                          <span className="text-sm font-medium text-slate-700">
                            {permissionLabels[permission]}
                          </span>
                        </label>
                      ))}
                    </div>
                    <SubmitButton className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
                      <Save size={14} /> Save permissions
                    </SubmitButton>
                  </ActionForm>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
