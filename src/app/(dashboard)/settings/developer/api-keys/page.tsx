import { type Metadata } from "next";
import { ApiKeysFeature } from "@/features/dashboard/settings/components/ApiKeysFeature";

export const metadata: Metadata = { title: "API Keys" };

export default function ApiKeysPage() {
  return <ApiKeysFeature />;
}
