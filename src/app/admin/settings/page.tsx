import { redirect } from "next/navigation";

import { getActiveTournamentSlug } from "@/lib/tournaments/data";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const slug = await getActiveTournamentSlug();
  redirect(slug ? `/admin/tournaments/${slug}/settings` : "/admin/tournaments");
}
