"use client";

import { useParams } from "next/navigation";
import { UserRound } from "lucide-react";
import RegistryDetail from "@/components/registries/RegistryDetail";

export default function SeniorCitizenDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <RegistryDetail
      entryId={parseInt(id)}
      title="Senior Citizens"
      icon={UserRound}
      iconBg="bg-amber-500"
      accentText="text-amber-700"
      listBase="/registries/senior-citizens"
    />
  );
}