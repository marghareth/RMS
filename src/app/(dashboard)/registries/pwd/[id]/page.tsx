"use client";

import { useParams } from "next/navigation";
import { Accessibility } from "lucide-react";
import RegistryDetail from "@/components/registries/RegistryDetail";

export default function PwdDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <RegistryDetail
      entryId={parseInt(id)}
      title="PWD"
      icon={Accessibility}
      iconBg="bg-[#3B82F6]"
      accentText="text-blue-700"
      listBase="/registries/pwd"
    />
  );
}