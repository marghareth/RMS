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
      iconBg="bg-[#3B82F6]"
      addNote="Select a resident and specify their disability type to register them."
      detailBase="/registries/pwd"
    />
  );
}