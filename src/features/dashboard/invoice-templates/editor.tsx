"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Button,
  Field,
  FieldDescription,
  FieldLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Shimmer,
} from "@/components/ui";
import { useGet } from "@/lib/api/hooks";
import {
  useInvoiceAsset,
  useInvoiceMerchantId,
  useInvoiceThemes,
  useMcaCurrencies,
} from "@/features/dashboard/create-invoice/hooks";
import {
  billerDetailsApi,
  getInvoiceDetailsApi,
} from "@/features/dashboard/create-invoice/services";
import { brandingFrom, emptyForm, toFormState } from "@/features/dashboard/create-invoice/helpers";
import { DUE_TERM_OPTIONS } from "@/features/dashboard/create-invoice/constants";
import { toDateKey } from "@/features/dashboard/create-invoice/components/InvoiceHeaderChips";
import { LineItemsSection } from "@/features/dashboard/create-invoice/components/LineItemsSection";
import { NotesAndTermsSection } from "@/features/dashboard/create-invoice/components/NotesAndTermsSection";
import { RecurringSection } from "@/features/dashboard/create-invoice/components/RecurringSection";
import { BrandingSection } from "@/features/dashboard/create-invoice/components/BrandingSection";
import { AssetUploadDialog } from "@/features/dashboard/create-invoice/components/AssetUploadDialog";
import { InvoiceDocumentPreview } from "@/features/dashboard/create-invoice/components/preview/InvoiceDocumentPreview";
import { useInvoiceTemplates } from "@/features/dashboard/invoice-templates/hooks";
import {
  applyTemplateSnapshot,
  toTemplateSnapshot,
} from "@/features/dashboard/invoice-templates/helpers";
import {
  TemplateEditorHeader,
  type SaveState,
} from "@/features/dashboard/invoice-templates/components/TemplateEditorHeader";
import type {
  BillerDetailsResponse,
  InvoiceDetailsResponse,
  InvoiceFormState,
  ThemeMetadata,
} from "@/features/dashboard/create-invoice/types";

/**
 * The template editor, at /invoice-template/new and /invoice-template/[id].
 *
 * It renders the same section components as the invoice editor, because a
 * template IS the reusable half of an invoice and building a second form for it
 * would mean every future invoice field had to be added twice. What it does not
 * do is reuse `InvoiceEditor` itself: that component derives its form from a
 * fetched document (`{...serverForm, ...edits}`) purely to survive the race
 * between a debounced autosave and a react-query revalidation. A template has
 * neither, so this holds its form directly.
 *
 * The other thing it does not do is create an invoice. The old "Edit template"
 * sent merchants to /create-invoice, which POSTs a draft on mount, so every
 * look at a template left a DRAFT row in Invoice management.
 */
export function TemplateEditorFeature({ templateId }: { templateId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const store = useInvoiceTemplates();

  /**
   * The invoice to seed from, captured once.
   *
   * "Start from a past invoice" lands here as `?fromInvoice=`. Read in a lazy
   * initializer so it survives any later navigation that rewrites the query.
   */
  const [fromInvoiceId] = useState(() => searchParams.get("fromInvoice") ?? "");

  const isNew = !templateId;
  const template = templateId
    ? (store.templates.find((row) => row.id === templateId) ?? null)
    : null;

  /**
   * Everything needed before the form can be seeded.
   *
   * Note what is NOT here: a read of /templates/{id}. That endpoint bumps
   * `lastUsedAt` as a documented side effect — it is the only way `markUsed`
   * can record a use — so loading the editor through it would make opening a
   * template to edit it count as using it, and the picker's recency order would
   * quietly become "most recently edited". The list query already carries
   * complete templates, so this reads from there.
   */
  // `isFetching` matters as much as `isReady`: saving a new template
  // invalidates the list and then routes here, so for a moment the id is absent
  // from a cache that is merely stale. Declaring it missing then would greet the
  // merchant with "no longer exists" for the template they just created.
  const isMissing = !!templateId && store.isReady && !store.isFetching && !template;

  if (isMissing) return <TemplateNotFound onBack={() => router.push("/mca-invoices/templates")} />;

  // The list is the only source (see above), so "asked for an id, don't have
  // it yet" is simply the list still loading.
  if (templateId && !template) return <EditorLoading />;

  return (
    <TemplateEditorBody
      key={templateId ?? fromInvoiceId ?? "blank"}
      templateId={templateId}
      isNew={isNew}
      fromInvoiceId={fromInvoiceId}
    />
  );
}

function TemplateEditorBody({
  templateId,
  isNew,
  fromInvoiceId,
}: {
  templateId?: string;
  isNew: boolean;
  fromInvoiceId: string;
}) {
  const router = useRouter();
  const store = useInvoiceTemplates();
  const merchantId = useInvoiceMerchantId();
  const palette = useInvoiceThemes();
  const { currencies, symbolFor } = useMcaCurrencies();

  const logo = useInvoiceAsset("LOGO");
  const signature = useInvoiceAsset("SIGNATURE");
  const [uploadingAsset, setUploadingAsset] = useState<"LOGO" | "SIGNATURE" | null>(null);

  // Lazy initializer: `new Date()` must not run on every render.
  const [today] = useState(() => toDateKey(new Date()));

  const template = templateId
    ? (store.templates.find((row) => row.id === templateId) ?? null)
    : null;

  /**
   * The invoice being copied, when the merchant chose "start from a past one".
   *
   * A plain read: nothing is written back to it, and the template takes only
   * the reusable half. `toFormState` is the invoice editor's own mapper, so the
   * copy carries exactly what the editor would have shown.
   */
  /**
   * The merchant's own biller profile.
   *
   * Merchant-level, not invoice-level, so the template preview can draw the
   * real "Issued by" block. Without it the document rendered a bare dash where
   * the merchant's own name and address will be, which makes the preview look
   * broken rather than unfinished.
   */
  const { data: billerData } = useGet<BillerDetailsResponse>(
    ["biller-details", merchantId],
    billerDetailsApi(merchantId),
    undefined,
    { enabled: !!merchantId }
  );

  const { data: sourceInvoice, isLoading: sourceLoading } = useGet<InvoiceDetailsResponse>(
    ["template-source-invoice", merchantId, fromInvoiceId],
    fromInvoiceId ? getInvoiceDetailsApi(merchantId, fromInvoiceId) : "",
    undefined,
    { enabled: !!fromInvoiceId && !!merchantId }
  );

  const [seeded, setSeeded] = useState(false);
  const [name, setName] = useState(() => template?.name ?? "");
  const [form, setForm] = useState<InvoiceFormState>(() => ({
    ...emptyForm(today, template?.snapshot.currency ?? ""),
    ...(template ? applyTemplateSnapshot(template) : {}),
  }));
  const [branding, setBranding] = useState<ThemeMetadata>(() => brandingFrom(template?.snapshot));
  const [saveState, setSaveState] = useState<SaveState>("clean");

  /**
   * Seeds from a source invoice, once it lands.
   *
   * setState in an effect body is rejected by the React Compiler lint plugin
   * (see CLAUDE.md), so this runs from a timer callback, the same shape the
   * invoice editor uses for its own one-shot template apply.
   */
  useEffect(() => {
    if (seeded || !fromInvoiceId) return;
    const invoice = sourceInvoice?.data?.invoice;
    if (!invoice) return;

    const id = setTimeout(() => {
      setForm(toFormState(invoice, emptyForm(today, currencies[0]?.currencyCode ?? "")));
      setBranding(brandingFrom(invoice.themeMetadata));
      setSeeded(true);
    }, 0);
    return () => clearTimeout(id);
  }, [seeded, fromInvoiceId, sourceInvoice, today, currencies]);

  const patch = useCallback((next: Partial<InvoiceFormState>) => {
    setForm((current) => ({ ...current, ...next }));
    setSaveState("dirty");
  }, []);

  const patchBranding = useCallback((next: Partial<ThemeMetadata>) => {
    setBranding((current) => ({ ...current, ...next }));
    setSaveState("dirty");
  }, []);

  const handleNameChange = (next: string) => {
    setName(next);
    setSaveState("dirty");
  };

  const trimmedName = name.trim();
  const nameError = !trimmedName
    ? "Give the template a name."
    : store.isNameTaken(trimmedName, templateId ?? null)
      ? "Another template already has that name."
      : null;

  const isDirty = saveState === "dirty";
  const canSave = !nameError && saveState !== "saving" && (isDirty || isNew);

  /**
   * Warns before losing unsaved work.
   *
   * The invoice editor needs none of this because it autosaves; this one saves
   * only when asked, so closing the tab mid-edit would otherwise be silent.
   */
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const settleSaved = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (settleSaved.current) clearTimeout(settleSaved.current);
    },
    []
  );

  const markSaved = useCallback(() => {
    setSaveState("saved");
    if (settleSaved.current) clearTimeout(settleSaved.current);
    settleSaved.current = setTimeout(() => setSaveState("clean"), 2500);
  }, []);

  const snapshot = () => toTemplateSnapshot(form, branding, template?.snapshot);

  const handleSave = () => {
    if (nameError) return;
    setSaveState("saving");

    if (template) {
      // One request carrying both the new name and the new contents. `rename`
      // and `update` each rebuild the body from the cached template, so issuing
      // both would race and the second would undo the first's half.
      store.replace(template.id, trimmedName, snapshot(), () => {
        markSaved();
        toast.success("Template saved");
      });
      return;
    }

    store.save(trimmedName, snapshot(), (newId) => {
      markSaved();
      toast.success("Template saved", { description: `"${trimmedName}" is ready to reuse.` });
      // replace, not push: the blank route is not somewhere Back should return
      // to, and this makes a refresh reopen the template that now exists.
      router.replace(`/invoice-template/${newId}`);
    });
  };

  const handleSaveAsNew = () => {
    if (nameError) return;
    const forkName = store.isNameTaken(trimmedName, null)
      ? store.suggestCopyName(trimmedName)
      : trimmedName;
    setSaveState("saving");
    store.save(forkName, snapshot(), (newId) => {
      markSaved();
      toast.success("Saved as a new template", { description: `"${forkName}" is ready to reuse.` });
      router.replace(`/invoice-template/${newId}`);
    });
  };

  const handleClose = () => {
    if (isDirty && !window.confirm("Discard unsaved changes to this template?")) return;
    router.push("/mca-invoices/templates");
  };

  /**
   * Uploading an asset is an intent to show it, so the toggle follows. Same
   * rule as the invoice editor: a logo uploaded and left switched off would be
   * a logo the merchant put nowhere.
   */
  const handleAssetUpload = (file: File) => {
    if (uploadingAsset === "SIGNATURE") {
      signature.upload(file);
      if (!form.signatureEnabled) patch({ signatureEnabled: true });
      return;
    }
    logo.upload(file);
    if (!form.logoEnabled) patch({ logoEnabled: true });
  };

  const previewSource = {
    form,
    biller: billerData?.data,
    client: undefined,
    account: undefined,
    logoUrl: logo.url,
    signatureUrl: signature.url,
    symbol: symbolFor(form.currency),
    // The per-invoice fields render as stand-ins rather than as blanks, so the
    // merchant sees the real document without being shown gaps that read as
    // fields they forgot. See PreviewSource.placeholders.
    placeholders: true,
    theme: branding.theme,
    primaryHex: palette.colorHexFor(branding.color),
    accentHex: palette.accentHexFor(branding.accent),
  };

  if (fromInvoiceId && !seeded && sourceLoading) return <EditorLoading />;

  return (
    <div className="flex h-full flex-col">
      <TemplateEditorHeader
        name={name}
        nameError={nameError}
        saveState={saveState}
        isNew={isNew}
        canSave={canSave}
        onNameChange={handleNameChange}
        onSave={handleSave}
        onSaveAsNew={handleSaveAsNew}
        onClose={handleClose}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_40rem]">
        <div className="min-h-0 overflow-y-auto">
          <div className="mx-auto max-w-[860px] space-y-5 px-6 py-6 lg:px-10">
            {/* What a template holds and what it does not, stated once at the
                top. The same split the save dialog spells out, on the page
                where the decision is actually made. */}
            <p className="rounded-lg border border-dashed border-border px-4 py-3 text-[12.5px] text-muted-foreground">
              A template saves the items, terms and branding below. The client, invoice number,
              dates and receiving account are chosen on each invoice.
            </p>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <Field>
                <FieldLabel htmlFor="template-due-term">Payment term</FieldLabel>
                <Select
                  value={form.dueTermId ?? "none"}
                  onValueChange={(next) => patch({ dueTermId: next === "none" ? null : next })}
                >
                  <SelectTrigger id="template-due-term" className="w-full sm:w-[16rem]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No default term</SelectItem>
                    {DUE_TERM_OPTIONS.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* The offset is reusable, the date is not — so the term is
                    what a template stores, and the due date is computed from
                    the issue date when the template is applied. */}
                <FieldDescription>
                  The due date is worked out from this when the template is applied.
                </FieldDescription>
              </Field>
            </div>

            <LineItemsSection
              lineItems={form.lineItems}
              onLineItemsChange={(lineItems) => patch({ lineItems })}
              currency={form.currency}
              currencies={currencies}
              symbolFor={symbolFor}
              onCurrencyChange={(currency) => patch({ currency })}
              discountName={form.discountName}
              discountValue={form.discountValue}
              discountType={form.discountType}
              taxName={form.taxName}
              taxValue={form.taxValue}
              onTotalsFieldChange={patch}
              linkedExpectedTotal={null}
              linkedCurrency={form.currency}
            />

            <NotesAndTermsSection
              memo={form.memo}
              notes={form.notes}
              lut={form.lut}
              onChange={patch}
            />

            <RecurringSection
              isRecurring={form.isRecurring}
              recurringType={form.recurringType}
              recurringStartDate={form.recurringStartDate}
              minStartDate={today}
              hideStartDate
              onChange={patch}
            />
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto bg-muted">
          <div className="space-y-4 p-4 md:p-6">
            <div>
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                Preview
              </h2>
              {/* Says which parts of the document are stand-ins. The values
                  themselves are deliberately generic ("Client name", "INV-0000")
                  so they cannot be mistaken for entered data, but naming them
                  once here saves the merchant working it out. */}
              <p className="mb-3 mt-1 text-[11.5px] text-muted-foreground">
                Client, invoice number, dates and bank details are examples. They are filled in when
                you create an invoice from this template.
              </p>
              <InvoiceDocumentPreview
                source={previewSource}
                onLogoClick={() => setUploadingAsset("LOGO")}
              />
            </div>
            <BrandingSection
              logoEnabled={form.logoEnabled}
              signatureEnabled={form.signatureEnabled}
              branding={branding}
              palette={palette}
              logo={logo}
              signature={signature}
              onChange={patch}
              onBrandingChange={patchBranding}
              onResetColors={() => patchBranding(brandingFrom(null))}
              onOpenUpload={setUploadingAsset}
            />
          </div>
        </div>
      </div>

      <AssetUploadDialog
        open={!!uploadingAsset}
        onOpenChange={(open) => setUploadingAsset(open ? uploadingAsset : null)}
        label={uploadingAsset === "SIGNATURE" ? "Signature" : "Logo"}
        isUploading={uploadingAsset === "SIGNATURE" ? signature.isUploading : logo.isUploading}
        onUpload={handleAssetUpload}
      />
    </div>
  );
}

function EditorLoading() {
  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_40rem]">
      <div className="space-y-5 px-6 py-6 lg:px-10">
        <Shimmer className="h-16 w-full rounded-xl" />
        <Shimmer className="h-64 w-full rounded-xl" />
        <Shimmer className="h-40 w-full rounded-xl" />
      </div>
      <div className="bg-muted p-4 md:p-6">
        <Shimmer className="h-[36rem] w-full rounded-xl" />
      </div>
    </div>
  );
}

function TemplateNotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-[15px] font-semibold text-foreground">That template no longer exists</p>
      <p className="max-w-sm text-[13px] text-muted-foreground">
        It may have been deleted from another tab or by someone else on your team.
      </p>
      <Button type="button" variant="secondary" size="sm" onClick={onBack}>
        Back to templates
      </Button>
    </div>
  );
}
