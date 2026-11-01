// FILE: src/app/(dashboard)/registries/pwd/page.tsx
"use client";

import { Accessibility } from "lucide-react";
import RegistryManager from "@/components/registries/RegistryManager";

export default function PwdRegistryPage() {
  return (
    <RegistryManager
      registryType="PWD"
      title="PWD Registry"
      subtitle="Persons with disability"
      icon={Accessibility}
      iconBg="bg-(--brand)"
      addNote="Select a resident and specify their disability type to register them."
      detailBase="/registries/pwd"
    />
  );
}