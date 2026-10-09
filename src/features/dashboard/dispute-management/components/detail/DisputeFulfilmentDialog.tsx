"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Field,
  FieldLabel,
  Input,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import type { FulfilmentData } from "@/features/dashboard/dispute-management/useDisputeResolutionFlow";

const EMPTY: FulfilmentData = { fulfillmentId: "", trackingCompany: "", trackingNumber: "" };

const FIELDS: { key: keyof FulfilmentData; label: string }[] = [
  { key: "fulfillmentId", label: "Fulfilment ID" },
  { key: "trackingCompany", label: "Shipping company" },
  { key: "trackingNumber", label: "Tracking number" },
];

/**
 * The shipment step a case can ask for before it is accepted or contested
 * (`fulfillmentDataRequired`): pg-dashboard's AcceptContestDrawer pre-step,
 * POST `/v2/cb/{mid}/fulfillment/{cbId}`. pg-dashboard sets no rules on the
 * three fields, so none are required here either; the flow carries on to the
 * chosen action once it is saved.
 */
export function DisputeFulfilmentDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FulfilmentData) => void;
  isSubmitting: boolean;
}) {
  const [values, setValues] = useState<FulfilmentData>(EMPTY);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setValues(EMPTY);
          onClose();
        }
      }}
    >
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <div className="flex items-start gap-3 px-6 pt-6 pr-14">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon name="package" size={18} aria-hidden />
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-lg leading-tight">
              Please enter order shipment data
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-[13px]">
              This dispute needs the order&apos;s shipment details before you respond.
            </DialogDescription>
          </div>
        </div>

        <form
          className="flex flex-col gap-3 px-6 pt-5 pb-6"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(values);
          }}
        >
          {FIELDS.map((field) => (
            <Field key={field.key}>
              <FieldLabel htmlFor={`fulfilment-${field.key}`}>{field.label}</FieldLabel>
              <Input
                id={`fulfilment-${field.key}`}
                value={values[field.key]}
                onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
              />
            </Field>
          ))}
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Go back
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Submit fulfillment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
