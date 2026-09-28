"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Field,
  FieldLabel,
  Input,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "@/features/dashboard/payment-pages/components/RichTextEditor";
import { PAYMENT_PAGE_RECENT_PRODUCTS } from "@/features/dashboard/payment-pages/constants";
import type { PaymentPageProduct } from "@/features/dashboard/payment-pages/types";

interface AddProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (product: PaymentPageProduct) => void;
}

type Step = "search" | "details";

function slugify(title: string): string {
  return title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function AddProductModal({ open, onOpenChange, onAdd }: AddProductModalProps) {
  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<PaymentPageProduct>({ id: "", title: "", description: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    // FileReader runs in this event handler (not during render), so the data
    // URL is produced off the render path — safe per the hooks-purity rules.
    const reader = new FileReader();
    reader.onload = () => {
      setDraft((prev) => ({ ...prev, coverImage: String(reader.result) }));
    };
    reader.readAsDataURL(file);
  }

  function reset() {
    setStep("search");
    setQuery("");
    setDraft({ id: "", title: "", description: "" });
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function selectProduct(product: PaymentPageProduct) {
    setDraft(product);
    setStep("details");
  }

  function handleSave() {
    const title = draft.title.trim();
    if (!title) return;
    onAdd({
      id: draft.id || slugify(title) || "product",
      title,
      description: draft.description,
      coverImage: draft.coverImage,
    });
    handleOpenChange(false);
  }

  const q = query.trim().toLowerCase();
  const matches = PAYMENT_PAGE_RECENT_PRODUCTS.filter((p) => p.title.toLowerCase().includes(q));
  const hasExact = PAYMENT_PAGE_RECENT_PRODUCTS.some((p) => p.title.toLowerCase() === q);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-120 gap-0 p-0">
        {step === "search" ? (
          <div key="search" className="flex flex-col duration-200 animate-in fade-in-0">
            <div className="px-6 pt-6">
              <DialogTitle>Add a product</DialogTitle>
            </div>

            <div className="px-6 pt-4">
              <div className="relative">
                <Icon
                  name="search"
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  autoFocus
                  placeholder="Search or add a product…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto px-6 pb-2 pt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Recent
              </p>
              {/* Native <button> here (not flux Button): flux Button forces
               * `justify-center` on its content, which centres the icon+text; a
               * left-aligned list row needs plain flex-start, so it's a
               * documented exception to the flux-ui rule. */}
              <div className="overflow-hidden rounded-xl border border-border">
                {matches.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => selectProduct(product)}
                    className="flex w-full cursor-pointer items-center gap-3.5 border-b border-border px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-muted/60"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon name="package" className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[13px] font-semibold text-foreground">
                        {product.title}
                      </span>
                      <span className="truncate text-[12px] text-muted-foreground">
                        {product.description}
                      </span>
                    </span>
                  </button>
                ))}

                {q && !hasExact && (
                  <button
                    type="button"
                    onClick={() => selectProduct({ id: "", title: query.trim(), description: "" })}
                    className="flex w-full cursor-pointer items-center gap-3.5 border-b border-border px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-muted/60"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon name="plus" className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[13px] font-semibold text-foreground">
                      Add &quot;{query.trim()}&quot;
                    </span>
                  </button>
                )}
              </div>
            </div>

            <div className="border-t border-border p-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="w-full cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div key="details" className="flex flex-col duration-200 animate-in fade-in-0">
            <div className="px-6 pt-6">
              <DialogTitle>Product details</DialogTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<Icon name="chevron-left" className="h-3.5 w-3.5" />}
                onClick={() => setStep("search")}
                className="mt-2 h-auto min-h-0 cursor-pointer px-0 text-muted-foreground hover:text-foreground"
              >
                Back to search
              </Button>
            </div>

            <div className="flex flex-col gap-4 px-6 py-4">
              <Field>
                <FieldLabel htmlFor="product-title">Product title</FieldLabel>
                <Input
                  id="product-title"
                  value={draft.title}
                  onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="product-cover">Product image</FieldLabel>
                {draft.coverImage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-auto min-h-0 w-full cursor-pointer overflow-hidden rounded-lg border border-border bg-muted p-0"
                  >
                    <Image
                      src={draft.coverImage}
                      alt="Product image"
                      width={472}
                      height={176}
                      unoptimized
                      // object-contain (not cover) so any aspect ratio shows fully
                      // without cropping; the muted backdrop fills the letterbox.
                      className="h-44 w-full object-contain"
                    />
                  </Button>
                ) : (
                  <Button
                    id="product-cover"
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-auto min-h-0 cursor-pointer flex-col gap-1.5 rounded-lg border-dashed py-6 text-muted-foreground"
                  >
                    <Icon name="image-plus" className="h-5 w-5" />
                    <span className="text-[13px]">Add a cover image (optional)</span>
                  </Button>
                )}
                {/* No flux-ui file-picker component exists; a hidden native input
                 * triggered by the button above is the documented exception. */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverChange}
                  className="hidden"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="product-description">Product description</FieldLabel>
                <RichTextEditor
                  value={draft.description}
                  onChange={(html) => setDraft((prev) => ({ ...prev, description: html }))}
                  placeholder="Describe your product…"
                />
              </Field>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border p-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="flex-1 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleSave}
                disabled={!draft.title.trim()}
                leftIcon={<Icon name="check" className="h-3.5 w-3.5" />}
                className={cn("flex-1", draft.title.trim() && "cursor-pointer")}
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
