"use client";

import { Accessibility } from "lucide-react";
import RegistryManager from "@/components/registries/RegistryManager";

export default function PwdRegistryPage() {
  return (
    <RegistryManager
      registryType="PWD"
      title="PWD"
      subtitle="Persons with disability registry"
      icon={Accessibility}
      addNote="Select a resident and specify their disability type to register them in the PWD registry."
    />
  );
}