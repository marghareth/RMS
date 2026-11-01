// FILE: src/app/(dashboard)/registries/pwd/[id]/page.tsx
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
      iconBg="bg-(--brand)"
      accentText="text-(--brand-fg-strong)"
      listBase="/registries/pwd"
    />
  );
}