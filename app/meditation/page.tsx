import { createAdminRepository } from "@/src/infrastructure/supabase/repositories/create-admin-repository";
import { loadMeditationAudioMap, loadMeditations } from "@/src/features/meditation/server";
import { requireAuthenticatedUserId } from "@/src/ui/shared/require-authenticated-user";
import MeditationPageClient from "./meditation-page-client";

export const metadata = {
  title: "Meditáció",
  description: "Lassú, atmoszferikus meditációs tér",
};

export const dynamic = "force-dynamic";

export default async function MeditationPage() {
  const userId = await requireAuthenticatedUserId();
  const adminRepository = createAdminRepository();
  const membership = await adminRepository.getMembershipByUserId(userId);
  const meditations = await loadMeditations();
  const audioMap = await loadMeditationAudioMap();

  return <MeditationPageClient meditations={meditations} audioMap={audioMap} isAdmin={Boolean(membership)} />;
}
