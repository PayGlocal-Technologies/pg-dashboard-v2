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
  Textarea,
} from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { cn } from "@/lib/utils";
import { PAYMENT_PAGE_RECENT_PRODUCTS } from "@/features/dashboard/payment-pages/constants";
import type { PaymentPageProduct } from "@/features/dashboard/payment-pages/types";

interface AddProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (product: PaymentPageProduct) => void;
}

type Step = "search" | "details";

// Decorative rich-text toolbar (non-functional) — mirrors the reference design.
const TOOLBAR_ICONS: IconName[] = [
  "bold",
  "italic",
  "underline",
  "list",
  "list-ordered",
  "link",
  "image",
  "video",
];

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
      <DialogContent className="w-[calc(100%-2rem)] max-w-[420px] gap-0 p-0">
        {step === "search" ? (
          <div className="flex flex-col">
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
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                {matches.map((product) => (
                  <Button
                    key={product.id}
                    type="button"
                    variant="ghost"
                    onClick={() => selectProduct(product)}
                    className="h-auto min-h-0 w-full cursor-pointer items-center justify-start gap-3 rounded-none px-3 py-2 text-left hover:bg-muted/60"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon name="package" className="h-4 w-4" />
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-[13px] font-semibold leading-none text-foreground">
                        {product.title}
                      </span>
                      <span className="truncate text-[12px] leading-none text-muted-foreground">
                        {product.description}
                      </span>
                    </span>
                  </Button>
                ))}

                {q && !hasExact && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => selectProduct({ id: "", title: query.trim(), description: "" })}
                    className="h-auto min-h-0 w-full cursor-pointer items-center justify-start gap-3 rounded-none px-3 py-2 text-left hover:bg-muted/60"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon name="plus" className="h-4 w-4" />
                    </span>
                    <span className="text-[13px] font-semibold text-foreground">
                      Add &quot;{query.trim()}&quot;
                    </span>
                  </Button>
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
          <div className="flex flex-col">
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
                <FieldLabel htmlFor="product-title">Page title</FieldLabel>
                <Input
                  id="product-title"
                  value={draft.title}
                  onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="product-cover">Cover image</FieldLabel>
                {draft.coverImage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-auto min-h-0 w-full cursor-pointer overflow-hidden rounded-lg border border-border bg-muted p-0"
                  >
                    <Image
                      src={draft.coverImage}
                      alt="Cover image"
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
                <FieldLabel htmlFor="product-description">Page description</FieldLabel>
                <div className="overflow-hidden rounded-lg border border-border">
                  <Textarea
                    id="product-description"
                    rows={3}
                    value={draft.description}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className="resize-none border-0 shadow-none focus-visible:ring-0"
                  />
                  <div className="flex items-center gap-1 border-t border-border bg-muted/40 px-2 py-1.5">
                    {TOOLBAR_ICONS.map((name) => (
                      <Button
                        key={name}
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={name}
                        className="h-7 w-7 min-h-0 min-w-0 cursor-pointer rounded-md p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Icon name={name} className="h-3.5 w-3.5" />
                      </Button>
                    ))}
                  </div>
                </div>
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
