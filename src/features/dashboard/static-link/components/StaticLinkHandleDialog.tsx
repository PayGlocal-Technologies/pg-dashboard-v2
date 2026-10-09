"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Field,
  FieldError,
  FieldLabel,
  Input,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import {
  STATIC_LINK_HANDLE_MAX,
  STATIC_LINK_HANDLE_MIN,
} from "@/features/dashboard/static-link/constants";
import {
  CollectedFieldsChecklist,
  toRequiredKeys,
} from "@/features/dashboard/static-link/components/CollectedFieldsPopover";
import {
  buildDisplayFieldsRequest,
  sanitizeStaticLinkHandle,
  validateStaticLinkHandle,
} from "@/features/dashboard/static-link/helpers";
import type {
  StaticLinkCollectedField,
  StaticLinkDisplayFieldsRequest,
} from "@/features/dashboard/static-link/types";

/** The link as it will read, with the handle picked out. */
function LinkPreview({ prefix, handle }: { prefix: string; handle: string }) {
  return (
    <p className="truncate rounded-lg bg-muted px-3 py-2.5 text-[14px] text-muted-foreground">
      {prefix}
      <span className="font-semibold text-foreground">{handle}</span>
    </p>
  );
}

/**
 * The dialog's insides. Rendered inside DialogContent, which unmounts on
 * close, so every opening starts from the link's current handle rather than
 * whatever was typed and abandoned last time.
 */
function HandleSteps({
  currentHandle,
  linkPrefix,
  fields,
  isSaving,
  onCancel,
  onSaveFields,
  onConfirm,
}: {
  currentHandle: string;
  linkPrefix: string;
  fields: StaticLinkCollectedField[];
  isSaving: boolean;
  onCancel: () => void;
  onSaveFields: (body: StaticLinkDisplayFieldsRequest) => void;
  onConfirm: (handle: string) => void;
}) {
  const [handle, setHandle] = useState(currentHandle);
  const [requiredKeys, setRequiredKeys] = useState(() => toRequiredKeys(fields));
  const [confirming, setConfirming] = useState(false);

  // Sanitized as they type, so what they confirm is what the server stores.
  const sanitized = sanitizeStaticLinkHandle(handle);
  const error = validateStaticLinkHandle(handle);

  const toggle = (field: StaticLinkCollectedField) => {
    if (field.platformLocked) return;
    setRequiredKeys((keys) =>
      keys.includes(field.fieldKey)
        ? keys.filter((key) => key !== field.fieldKey)
        : [...keys, field.fieldKey]
    );
  };

  // The details save first (only the rows that moved, as Configure sends
  // them), then the name: the call that names the link is the one that
  // switches it on and locks it.
  const confirm = () => {
    const displayFields = buildDisplayFieldsRequest(fields, requiredKeys);
    if (displayFields.length) onSaveFields({ displayFields });
    onConfirm(sanitized);
  };

  if (confirming) {
    return (
      <>
        <DialogTitle>This can&apos;t be changed later</DialogTitle>
        <DialogDescription className="mt-2">
          Your link will be set to the address below, and it becomes permanent: it can&apos;t be
          edited or reverted afterwards. Anything already shared pointing at the old address will
          stop working.
        </DialogDescription>
        <div className="mt-4">
          <LinkPreview prefix={linkPrefix} handle={sanitized} />
        </div>
        {/* The same call that names the link is the one that switches it on. */}
        <p className="mt-3 text-xs text-muted-foreground">
          Confirming also makes your link live and ready to accept payments.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSaving}
            onClick={() => setConfirming(false)}
          >
            Back
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            isLoading={isSaving}
            leftIcon={<Icon name="check" className="h-3.5 w-3.5" />}
            onClick={confirm}
          >
            Confirm and lock
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <DialogTitle>Edit your static link</DialogTitle>
      <DialogDescription className="mt-2">
        Name the address customers will see, and choose what they fill in before paying. The name
        can be set once, so pick carefully.
      </DialogDescription>

      <Field className="mt-5 gap-2">
        <FieldLabel htmlFor="static-link-handle">Link name</FieldLabel>
        <Input
          id="static-link-handle"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="yourbusiness"
          aria-invalid={Boolean(handle && error)}
          autoComplete="off"
        />
        {handle && error ? (
          <FieldError>{error}</FieldError>
        ) : (
          <p className="text-xs text-muted-foreground">
            {STATIC_LINK_HANDLE_MIN} to {STATIC_LINK_HANDLE_MAX} characters, letters and numbers
            only.
          </p>
        )}
      </Field>

      <div className="mt-5 space-y-2">
        <p className="text-sm font-medium text-foreground">Your link will be</p>
        <LinkPreview prefix={linkPrefix} handle={sanitized || "yourbusiness"} />
      </div>

      <div className="mt-5">
        <p className="text-sm font-medium text-foreground">Details to collect</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Ticked details are required before a customer can pay.
        </p>
        <CollectedFieldsChecklist
          fields={fields}
          requiredKeys={requiredKeys}
          onToggle={toggle}
          className="mt-3"
        />
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          // The current name can be kept: confirming still switches the link on.
          disabled={Boolean(error)}
          onClick={() => setConfirming(true)}
        >
          Continue
        </Button>
      </div>
    </>
  );
}

/**
 * Edit Static Link: the one chance a merchant gets to name their own link
 * (pg-dashboard's StaticLinkHandleModal), together with the details the
 * checkout collects (its CollectedFieldsDropdown). Two steps on purpose: an
 * ordinary edit, then a confirmation that spells out the name cannot be
 * undone, since the server locks the handle the moment the activation
 * succeeds.
 */
export function StaticLinkHandleDialog({
  open,
  onOpenChange,
  currentHandle,
  linkPrefix,
  fields,
  isSaving,
  onSaveFields,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The handle the link currently carries, the starting value. */
  currentHandle: string;
  /** Everything before the handle, e.g. "buy.payglocal.com/@". */
  linkPrefix: string;
  /** The details the checkout collects, the checklist's starting state. */
  fields: StaticLinkCollectedField[];
  isSaving: boolean;
  /** The changed details, saved just before the name. */
  onSaveFields: (body: StaticLinkDisplayFieldsRequest) => void;
  /** Confirmed: send it. Also activates the link, which is what locks it. */
  onConfirm: (handle: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[30rem] p-6">
        <HandleSteps
          currentHandle={currentHandle}
          linkPrefix={linkPrefix}
          fields={fields}
          isSaving={isSaving}
          onCancel={() => onOpenChange(false)}
          onSaveFields={onSaveFields}
          onConfirm={onConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}
