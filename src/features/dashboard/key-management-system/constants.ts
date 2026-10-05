import type { BadgeTrailIcon, BadgeVariant } from "@payglocal_ui/flux-ui";
import type { KeyKind, MerchantKey } from "@/features/dashboard/key-management-system/types";

export const KMS_PAGE_SUBTITLE =
  "Keys and certificates your integration uses to encrypt and authenticate its API requests";

export const KEY_KIND_TABS: { value: KeyKind; label: string }[] = [
  { value: "certificate", label: "PayGlocal certificate" },
  { value: "rsa", label: "RSA keys" },
  { value: "apiKey", label: "API keys" },
];

/**
 * The one row the certificate tab shows, pg-dashboard's PCC_DATA: PayGlocal's
 * own public certificate, the same for every merchant, so nothing is fetched
 * for it until it is downloaded.
 */
export const PAYGLOCAL_CERTIFICATE_ROW: MerchantKey = {
  kid: "PayGlocal Key/Certificate for message level encryption",
  keyStatus: "ACTIVE",
  keyType: "RSA_PUBCERT",
  creationDate: null,
  expiryDate: null,
  strength: "256 bytes",
};

type StatusMeta = { label: string; variant: BadgeVariant; trailIcon?: BadgeTrailIcon };

/** pg-dashboard's mapping: active positive, revoked negative. */
export const KEY_STATUS_META: Record<string, StatusMeta> = {
  ACTIVE: { label: "Active", variant: "success", trailIcon: "check" },
  REVOKED: { label: "Revoked", variant: "danger", trailIcon: "x" },
};

/** Key ID and Actions: the Columns picker can't hide them, as in pg-dashboard. */
export const KMS_FIXED_COLUMNS = ["kid"];
