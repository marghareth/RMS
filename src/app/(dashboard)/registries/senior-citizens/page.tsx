"use client";

import { UserRound } from "lucide-react";
import RegistryManager from "@/components/registries/RegistryManager";

export default function SeniorCitizensRegistryPage() {
  return (
    <RegistryManager
      registryType="SENIOR_CITIZEN"
      title="Senior Citizens"
      subtitle="Residents aged 60 and above"
      icon={UserRound}
      addNote="Auto-flagged from the RBI when a resident is 60 or older. You can also add a resident manually below."
      minAge={60}
    />
  );
}