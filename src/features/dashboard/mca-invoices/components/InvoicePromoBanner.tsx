import { PageIntroBanner } from "@/components/common/PageIntroBanner";

/** "Customise your invoices" banner at the top of Invoice Management; shows on
 *  every load, the × hides it until the next one. */
export function InvoicePromoBanner() {
  return (
    <PageIntroBanner
      image="/assets/invbannerforpage.png"
      aspectClassName="aspect-4680/892"
      title="Customise your invoices. Make them yours."
      description="Choose from ready-to-use templates and personalise them with your brand, colours and design."
    />
  );
}
