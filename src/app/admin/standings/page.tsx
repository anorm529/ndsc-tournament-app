import { redirect } from "next/navigation";

import { getActiveTournamentSlug } from "@/lib/tournaments/data";

export const dynamic = "force-dynamic";

export default async function AdminStandingsPage() {
  const slug = await getActiveTournamentSlug();
  redirect(slug ? `/admin/tournaments/${slug}/standings` : "/admin/tournaments");
}
