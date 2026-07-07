"use client";

import { UserRound } from "lucide-react";
import RegistryManager from "@/components/registries/RegistryManager";

export default function SeniorCitizensPage() {
  return (
    <RegistryManager
      registryType="SENIOR_CITIZEN"
      title="Senior Citizens"
      subtitle="Residents aged 60 and above"
      icon={UserRound}
      iconBg="bg-amber-500"
      addNote="Auto-flagged from the RBI when a resident is 60 or older. You can also add manually."
      minAge={60}
      detailBase="/registries/senior-citizens"
    />
  );
}