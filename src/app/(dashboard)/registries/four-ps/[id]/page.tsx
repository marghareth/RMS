"use client";

import { useParams } from "next/navigation";
import { HandCoins } from "lucide-react";
import RegistryDetail from "@/components/registries/RegistryDetail";

export default function FourPsDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <RegistryDetail
      entryId={parseInt(id)}
      title="4Ps Beneficiaries"
      icon={HandCoins}
      iconBg="bg-green-600"
      accentText="text-green-700"
      listBase="/registries/four-ps"
    />
  );
}