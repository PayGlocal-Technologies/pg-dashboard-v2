"use client";

import type { ReactNode } from "react";
import {
  Field,
  FieldError,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { DEAL_LABEL_MAX, REFERRAL_TYPES } from "@/features/dashboard/partner-deals/constants";
import { dealLabelError, referralTypeError } from "@/features/dashboard/partner-deals/validation";
import type { DealForm } from "@/features/dashboard/partner-deals/form";

/** A major page section's heading: hierarchy from type, not a container. */
export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
        <p className="text-[13px] text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function DealDetailsSection({ form }: { form: DealForm }) {
  return (
    <section className="space-y-4">
      <SectionHeading
        title="Deal details"
        description="Basic information for this referral deal."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <form.Field
          name="referralType"
          validators={{
            onChange: ({ value }) => referralTypeError(value),
            onSubmit: ({ value }) => referralTypeError(value),
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor="deal-referral-type">Referral type</FieldLabel>
              <Select value={field.state.value} onValueChange={field.handleChange}>
                <SelectTrigger
                  id="deal-referral-type"
                  className="w-full"
                  aria-invalid={field.state.meta.errors.length > 0 || undefined}
                >
                  <SelectValue placeholder="Select referral type" />
                </SelectTrigger>
                <SelectContent>
                  {REFERRAL_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>{field.state.meta.errors[0]}</FieldError>
            </Field>
          )}
        </form.Field>

        <form.Field
          name="dealLabel"
          validators={{
            onBlur: ({ value }) => dealLabelError(value),
            onSubmit: ({ value }) => dealLabelError(value),
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor="deal-label">Deal label</FieldLabel>
              <Input
                id="deal-label"
                placeholder="e.g. Q4 exporters offer"
                maxLength={DEAL_LABEL_MAX}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.errors.length > 0 || undefined}
              />
              <FieldError>{field.state.meta.errors[0]}</FieldError>
            </Field>
          )}
        </form.Field>
      </div>
    </section>
  );
}
