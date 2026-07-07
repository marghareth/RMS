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
      iconBg="bg-green-600"
      addNote="Select a resident to register them as a 4Ps beneficiary."
      detailBase="/registries/four-ps"
    />
  );
}