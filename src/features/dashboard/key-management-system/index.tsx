"use client";

import { useState } from "react";
import { Button, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { MidGuard } from "@/components/common/MidGuard";
import { KMS_PAGE_SUBTITLE } from "@/features/dashboard/key-management-system/constants";
import {
  useGenerateApiKey,
  useGenerateRsaKey,
  useKmsScope,
} from "@/features/dashboard/key-management-system/hooks";
import { KeysTable } from "@/features/dashboard/key-management-system/components/KeysTable";
import { GeneratedApiKeyDialog } from "@/features/dashboard/key-management-system/components/GeneratedApiKeyDialog";
import { GeneratedRsaKeyDialog } from "@/features/dashboard/key-management-system/components/GeneratedRsaKeyDialog";
import type {
  GeneratedApiKey,
  KeyFile,
  KeyKind,
} from "@/features/dashboard/key-management-system/types";

/**
 * Key Management, at /key-management-system: pg-dashboard's KMS. A selected
 * MID must be PA (MidGuard), as there. The tab's Generate action sits on the
 * page header; what it returns (an API key and salt, or a private key file)
 * lives only in this component's state while its one-time dialog is open.
 */
export function KeyManagementFeature() {
  const scope = useKmsScope();
  const [kind, setKind] = useState<KeyKind>("certificate");
  // Back to the certificate tab if API keys turn out to be off for the MID.
  const activeKind = kind === "apiKey" && !scope.apiKeysEnabled ? "certificate" : kind;

  const [generatedApiKey, setGeneratedApiKey] = useState<GeneratedApiKey | null>(null);
  const [generatedRsaKey, setGeneratedRsaKey] = useState<KeyFile | null>(null);
  const apiKey = useGenerateApiKey(scope);
  const rsaKey = useGenerateRsaKey(scope);

  const canGenerate = !!scope.mid && !scope.isGuestUser;
  const generateAction =
    activeKind === "rsa" ? (
      <Button
        type="button"
        variant="primary"
        leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
        isLoading={rsaKey.isGenerating}
        disabled={!canGenerate}
        onClick={() => rsaKey.generate(setGeneratedRsaKey)}
      >
        Generate RSA key
      </Button>
    ) : activeKind === "apiKey" ? (
      <Button
        type="button"
        variant="primary"
        leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
        isLoading={apiKey.isGenerating}
        disabled={!canGenerate}
        onClick={() => apiKey.generate(setGeneratedApiKey)}
      >
        Generate API key
      </Button>
    ) : undefined;

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
      <PageHeader title="Key Management" subtitle={KMS_PAGE_SUBTITLE} actions={generateAction} />
      <MidGuard productType="PA">
        <KeysTable scope={scope} kind={activeKind} onKindChange={setKind} />
      </MidGuard>

      <GeneratedApiKeyDialog generated={generatedApiKey} onClose={() => setGeneratedApiKey(null)} />
      <GeneratedRsaKeyDialog file={generatedRsaKey} onClose={() => setGeneratedRsaKey(null)} />
    </div>
  );
}
