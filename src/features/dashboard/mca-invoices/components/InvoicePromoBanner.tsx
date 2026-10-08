import { PageIntroBanner } from "@/components/common/PageIntroBanner";

/** Bump when the banner's message changes, so it shows again to everyone who
 *  closed the previous one. */
const DISMISSED_KEY = "payglocal_mca_invoices_banner_dismissed_v1";

/** "Customise your invoices" banner at the top of Invoice Management. Shows
 *  until the merchant closes it with the ×, then stays closed in this browser
 *  (see DISMISSED_KEY). */
export function InvoicePromoBanner() {
  return (
    <PageIntroBanner
      storageKey={DISMISSED_KEY}
      image="/assets/invbannerforpage.png"
      aspectClassName="aspect-4680/892"
      title={
        <>
          Customise your invoices.
          <br />
          Make them yours.
        </>
      }
      description="Choose from ready-to-use templates and personalise them with your brand, colours and design."
    />
  );
}
