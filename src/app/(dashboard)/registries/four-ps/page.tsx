"use client";

import { HandCoins } from "lucide-react";
import RegistryManager from "@/components/registries/RegistryManager";

export default function FourPsRegistryPage() {
  return (
    <RegistryManager
      registryType="FOUR_PS"
      title="4Ps Beneficiaries"
      subtitle="Pantawid Pamilyang Pilipino Program"
      icon={HandCoins}
      addNote="Select the household's representative resident to mark their household as a 4Ps beneficiary."
    />
  );
}