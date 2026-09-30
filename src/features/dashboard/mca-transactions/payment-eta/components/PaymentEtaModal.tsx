"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogTitle, IconButton } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PaymentEtaForm } from "@/features/dashboard/mca-transactions/payment-eta/components/PaymentEtaForm";
import { PaymentEtaResult } from "@/features/dashboard/mca-transactions/payment-eta/components/PaymentEtaResult";
import type { EtaFormValues } from "@/features/dashboard/mca-transactions/payment-eta/eta";

type Step = "form" | "result";

/**
 * Two steps in one dialog: the form, then the estimate. The entered values
 * live here, above both, so the result's pencil returns to a form that still
 * holds them. Everything resets when the dialog closes (the parent remounts
 * this per open), so each check starts clean.
 */
export function PaymentEtaModal({
  open,
  onOpenChange,
  initialValues,
  todayKey,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues: EtaFormValues;
  todayKey: string;
}) {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState<Step>("form");
  const [values, setValues] = useState<EtaFormValues>(initialValues);

  const title =
    step === "form" ? "Check status of your payment" : "Here's when to expect your payment";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-black/40"
        className="flex max-h-[calc(100dvh-2rem)] max-w-[min(100%-1.5rem,42.5rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0"
      >
        <div className="px-6 pt-6 pb-5 sm:px-8 sm:pt-7">
          <div className="flex items-center gap-2 pr-10">
            {/* Back to the details on the result step; the form keeps what
                was entered. -ml-2 lines the arrow's glyph up with the body's
                left edge rather than its button padding. */}
            {step === "result" && (
              <IconButton
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Back to payment details"
                onClick={() => setStep("form")}
                className="-ml-2 h-8 w-8 min-h-0 min-w-0 shrink-0 text-foreground"
              >
                <Icon name="arrow-left" size={18} aria-hidden />
              </IconButton>
            )}
            <DialogTitle className="pr-0 text-xl font-bold tracking-tight text-foreground">
              {title}
            </DialogTitle>
          </div>
          {step === "form" ? (
            <DialogDescription className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-muted-foreground">
              Even after your client sends it, a payment takes 1–3 working days to reach you,
              depending on the currency and payment mode. Share a few details to see when to expect
              yours.
            </DialogDescription>
          ) : (
            <DialogDescription className="sr-only">
              The estimated arrival of your payment, from the details you shared.
            </DialogDescription>
          )}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            className="flex min-h-0 flex-1 flex-col"
            initial={reduceMotion ? false : { opacity: 0, x: step === "result" ? 16 : -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: step === "result" ? -16 : 16 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {step === "form" ? (
              <PaymentEtaForm
                initialValues={values}
                todayKey={todayKey}
                onSubmit={(next) => {
                  setValues(next);
                  setStep("result");
                }}
              />
            ) : (
              <PaymentEtaResult
                values={values}
                todayKey={todayKey}
                onDone={() => onOpenChange(false)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
