import { Suspense } from "react";
import { EbrcGenerationWizard } from "@/features/dashboard/ebrc-generation/EbrcGenerationWizard";

export default function EbrcGenerateWizardPage() {
  return (
    <Suspense>
      <EbrcGenerationWizard />
    </Suspense>
  );
}
