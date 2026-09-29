"use client";

import { useRef, type ComponentProps, type ReactNode } from "react";
import { createFormHook } from "@tanstack/react-form";
import { Button } from "@/components/ui";
import { DisabledReason } from "@/components/common/DisabledReason";
import { fieldContext, formContext, useFormContext } from "@/components/form/context";
import {
  CheckboxField,
  CustomField,
  SelectField,
  SingleSelectField,
  PasswordField,
  TextareaField,
  TextField,
} from "@/components/form/fields";

/**
 * The one form hook the app uses: TanStack Form with our field components and
 * form behaviour built in, so every form looks and validates the same way.
 *
 *   const form = useAppForm({ defaultValues, onSubmit: ({ value }) => save(value) });
 *   <form.AppForm>
 *     <form.Form>
 *       <form.AppField name="city" validators={{ onChange: rules(required("City")) }}>
 *         {(field) => <field.TextField label="City" />}
 *       </form.AppField>
 *       <form.SubmitButton>Save</form.SubmitButton>
 *     </form.Form>
 *   </form.AppForm>
 *
 * Validation timing (the antd default, applied app-wide): put every rule on
 * `onChange`. TanStack runs onChange validators only for the field being
 * edited, and runs all of them on submit, so an untouched field stays quiet
 * until Save, an edited one validates as it changes, and Save shows every
 * error. Don't use onBlur: leaving a field alone must not raise anything.
 *
 * A failed submit moves focus to the first invalid control (form.Form does it).
 */

const FOCUSABLE = 'input, button, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Focuses the first invalid control inside `container`, after the errors
 *  have rendered. A group (radio set, recipient list, file drop) is marked
 *  invalid as a whole; the first control inside it gets focus. */
export function focusFirstInvalid(container: HTMLElement | null) {
  // Two frames: onSubmitInvalid may have just opened a collapsed section, and
  // its fields need to commit before there is anything to focus.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const invalid = container?.querySelector<HTMLElement>('[aria-invalid="true"]');
      const target = invalid?.matches(FOCUSABLE)
        ? invalid
        : (invalid?.querySelector<HTMLElement>(FOCUSABLE) ?? invalid);
      target?.focus();
    })
  );
}

/**
 * Submits a form that isn't wrapped in form.Form (a second form inside the
 * first, where HTML forbids a nested <form>), with the same focus behaviour.
 */
export async function submitAppForm(
  form: { handleSubmit: () => Promise<void>; state: { isValid: boolean } },
  container: HTMLElement | null
) {
  await form.handleSubmit();
  if (!form.state.isValid) focusFirstInvalid(container);
}

/** Wraps the fields in a <form> that submits through TanStack and, when the
 *  submit fails validation, focuses the first invalid control on screen. */
function Form({
  id,
  className,
  children,
}: {
  /** Lets a button outside the submit flow find this form (submitAppForm). */
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  const form = useFormContext();
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      id={id}
      noValidate
      className={className}
      onSubmit={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await submitAppForm(form, ref.current);
      }}
    >
      {children}
    </form>
  );
}

type SubmitButtonProps = Omit<ComponentProps<typeof Button>, "type" | "disabled"> & {
  /** Keeps the button disabled with this hover reason. Only for the few cases
   *  with no field to point at (a file still to pick, a permission). */
  disabledReason?: string | null;
  /** Extra busy state the form doesn't know about (a request in flight). */
  pending?: boolean;
  /** Layout classes for the tooltip wrapper while disabledReason is set (e.g.
   *  "flex-1" or "w-full"), so a stretched button keeps its width. */
  wrapperClassName?: string;
};

/** The form's submit button: live unless submitting, pending, or given a reason. */
function SubmitButton({
  disabledReason,
  pending,
  wrapperClassName,
  children,
  ...props
}: SubmitButtonProps) {
  const form = useFormContext();
  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <DisabledReason reason={disabledReason} className={wrapperClassName}>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            {...props}
            disabled={!!disabledReason || isSubmitting || !!pending}
          >
            {children}
          </Button>
        </DisabledReason>
      )}
    </form.Subscribe>
  );
}

const { useAppForm: useBaseAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    PasswordField,
    TextareaField,
    SelectField,
    SingleSelectField,
    CheckboxField,
    CustomField,
  },
  formComponents: {
    Form,
    SubmitButton,
  },
});

/**
 * createFormHook's hook with one app-wide default: `canSubmitWhenInvalid`.
 * Without it, TanStack's first submit returns early as soon as any edited
 * field is already invalid, before validating the rest, so an untouched
 * required field only showed "X is required" on the second Save. With it,
 * every Save validates every field; an invalid form still never reaches
 * onSubmit (TanStack checks isFieldsValid/isFormValid after validating).
 */
export const useAppForm = ((options) =>
  useBaseAppForm({ canSubmitWhenInvalid: true, ...options })) as typeof useBaseAppForm;

export { withForm };
