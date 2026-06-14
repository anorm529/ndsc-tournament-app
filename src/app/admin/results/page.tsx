import { redirect } from "next/navigation";

import { getActiveTournamentSlug } from "@/lib/tournaments/data";

export const dynamic = "force-dynamic";

export default async function AdminResultsPage() {
  const slug = await getActiveTournamentSlug();
  redirect(slug ? `/admin/tournaments/${slug}/results` : "/admin/tournaments");
}
