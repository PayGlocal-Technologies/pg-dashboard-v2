"use client";

import type { ReactNode } from "react";
import {
  Checkbox,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
  PasswordInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SingleSelect,
  Textarea,
  type SingleSelectOption,
} from "@/components/ui";
import { RequiredMark } from "@/components/common/RequiredMark";
import { useFieldContext } from "@/components/form/context";
import { validatorIsRequired } from "@/components/form/rules";

/**
 * The field components every form in the app renders through (registered on
 * useAppForm, used as `<form.AppField name="x">{(field) => <field.TextField …/>}`).
 *
 * They own the parts that must look and behave the same everywhere:
 *  - the label, with the red * before it when `required`;
 *  - `aria-invalid` on the control and the message under it;
 *  - the control's id, so a failed Save can focus the first bad field.
 *
 * When errors show is decided by the validators, not here: every rule runs on
 * change, so an untouched field shows nothing until Save, and an edited one
 * validates as it changes (the antd behaviour, see useAppForm).
 *
 * The * is automatic: a field whose onChange validator was built with
 * `rules(required(...))` is marked required, so the mark and the check can't
 * disagree. Pass `required` only to override that.
 *
 * The field's name is its DOM id unless `id` is passed.
 */

/** A validator can return a plain message or a schema issue; show the text. */
function firstError(errors: unknown[]): string | undefined {
  for (const error of errors) {
    if (!error) continue;
    if (typeof error === "string") return error;
    if (typeof error === "object" && "message" in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === "string" && message) return message;
    }
  }
  return undefined;
}

interface FrameProps {
  label?: ReactNode;
  /** Defaults to whether the field's rules include `required`. */
  required?: boolean;
  description?: ReactNode;
  className?: string;
  labelClassName?: string;
  errorClassName?: string;
  /** Overrides the DOM id (defaults to the field name). */
  id?: string;
}

/** Shared state for any field component: its id, error, and wiring. */
function useFieldBits<T>(id?: string, required?: boolean) {
  const field = useFieldContext<T>();
  const error = firstError(field.state.meta.errors);
  return {
    field,
    error,
    controlId: id ?? field.name,
    invalid: !!error,
    isRequired: required ?? validatorIsRequired(field.options.validators),
  };
}

function Frame({
  label,
  required,
  description,
  className,
  labelClassName,
  errorClassName,
  controlId,
  error,
  children,
}: FrameProps & { controlId: string; error: string | undefined; children: ReactNode }) {
  return (
    <Field className={className}>
      {label !== undefined && (
        <FieldLabel htmlFor={controlId} className={labelClassName}>
          {required && <RequiredMark />} {label}
        </FieldLabel>
      )}
      {children}
      {description && !error && <FieldDescription>{description}</FieldDescription>}
      <FieldError id={`${controlId}-error`} className={errorClassName}>
        {error}
      </FieldError>
    </Field>
  );
}

// ── Text ────────────────────────────────────────────────────────────────────

interface TextFieldProps extends FrameProps {
  placeholder?: string;
  type?: "text" | "email" | "tel" | "number" | "url";
  inputMode?: "text" | "email" | "tel" | "numeric" | "decimal" | "url";
  autoComplete?: string;
  maxLength?: number;
  disabled?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  inputClassName?: string;
  /** Rewrites what was typed before it is stored (e.g. upper-casing a GSTIN). */
  parse?: (raw: string) => string;
  /** Side effect after the value changes (the form value is already set). */
  onValueChange?: (value: string) => void;
  onFocus?: () => void;
}

export function TextField({
  placeholder,
  type,
  inputMode,
  autoComplete,
  maxLength,
  disabled,
  readOnly,
  autoFocus,
  inputClassName,
  parse,
  onValueChange,
  onFocus,
  ...frame
}: TextFieldProps) {
  const { field, error, controlId, invalid, isRequired } = useFieldBits<string>(
    frame.id,
    frame.required
  );
  return (
    <Frame {...frame} required={isRequired} controlId={controlId} error={error}>
      <Input
        id={controlId}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
        disabled={disabled}
        readOnly={readOnly}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        className={inputClassName}
        value={field.state.value ?? ""}
        onFocus={onFocus}
        onBlur={field.handleBlur}
        onChange={(e) => {
          const next = parse ? parse(e.target.value) : e.target.value;
          field.handleChange(next);
          onValueChange?.(next);
        }}
      />
    </Frame>
  );
}

interface PasswordFieldProps extends FrameProps {
  placeholder?: string;
  autoComplete?: "current-password" | "new-password" | "off";
  disabled?: boolean;
  autoFocus?: boolean;
  inputClassName?: string;
  onValueChange?: (value: string) => void;
}

export function PasswordField({
  placeholder,
  autoComplete,
  disabled,
  autoFocus,
  inputClassName,
  onValueChange,
  ...frame
}: PasswordFieldProps) {
  const { field, error, controlId, invalid, isRequired } = useFieldBits<string>(
    frame.id,
    frame.required
  );
  return (
    <Frame {...frame} required={isRequired} controlId={controlId} error={error}>
      <PasswordInput
        id={controlId}
        autoComplete={autoComplete}
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        className={inputClassName}
        value={field.state.value ?? ""}
        onBlur={field.handleBlur}
        onChange={(e) => {
          field.handleChange(e.target.value);
          onValueChange?.(e.target.value);
        }}
      />
    </Frame>
  );
}

interface TextareaFieldProps extends FrameProps {
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  disabled?: boolean;
  inputClassName?: string;
}

export function TextareaField({
  placeholder,
  rows,
  maxLength,
  disabled,
  inputClassName,
  ...frame
}: TextareaFieldProps) {
  const { field, error, controlId, invalid, isRequired } = useFieldBits<string>(
    frame.id,
    frame.required
  );
  return (
    <Frame {...frame} required={isRequired} controlId={controlId} error={error}>
      <Textarea
        id={controlId}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        className={inputClassName}
        value={field.state.value ?? ""}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
      />
    </Frame>
  );
}

// ── Choice ──────────────────────────────────────────────────────────────────

interface SelectFieldProps extends FrameProps {
  options: ReadonlyArray<{ value: string; label: ReactNode }>;
  placeholder?: string;
  disabled?: boolean;
  triggerClassName?: string;
  onValueChange?: (value: string) => void;
}

/** A short, fixed list (Radix Select). Long lists want SingleSelectField. */
export function SelectField({
  options,
  placeholder,
  disabled,
  triggerClassName,
  onValueChange,
  ...frame
}: SelectFieldProps) {
  const { field, error, controlId, invalid, isRequired } = useFieldBits<string>(
    frame.id,
    frame.required
  );
  return (
    <Frame {...frame} required={isRequired} controlId={controlId} error={error}>
      <Select
        value={field.state.value ?? ""}
        disabled={disabled}
        onValueChange={(next) => {
          field.handleChange(next);
          onValueChange?.(next);
        }}
      >
        <SelectTrigger
          id={controlId}
          aria-invalid={invalid || undefined}
          className={triggerClassName ?? "w-full"}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Frame>
  );
}

interface SingleSelectFieldProps extends FrameProps {
  options: SingleSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  selectClassName?: string;
  onValueChange?: (value: string) => void;
}

/** A long or searchable list (flux SingleSelect). */
export function SingleSelectField({
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled,
  selectClassName,
  onValueChange,
  ...frame
}: SingleSelectFieldProps) {
  const { field, error, controlId, invalid, isRequired } = useFieldBits<string>(
    frame.id,
    frame.required
  );
  return (
    <Frame {...frame} required={isRequired} controlId={controlId} error={error}>
      <SingleSelect
        id={controlId}
        value={field.state.value ?? ""}
        options={options}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyText={emptyText}
        disabled={disabled}
        invalid={invalid}
        className={selectClassName}
        onChange={(next) => {
          field.handleChange(next);
          onValueChange?.(next);
        }}
      />
    </Frame>
  );
}

interface CheckboxFieldProps {
  /** The text beside the box. */
  children: ReactNode;
  required?: boolean;
  id?: string;
  className?: string;
}

/** A single tick (consent, terms). The * sits before its text when required. */
export function CheckboxField({ children, required, id, className }: CheckboxFieldProps) {
  const { field, error, controlId, invalid, isRequired } = useFieldBits<boolean>(id, required);
  return (
    <div className={className}>
      <label className="flex cursor-pointer items-start gap-2.5">
        <Checkbox
          id={controlId}
          aria-invalid={invalid || undefined}
          checked={!!field.state.value}
          onCheckedChange={(next) => field.handleChange(next === true)}
          className="mt-0.5"
        />
        <span className="text-[12.5px] text-muted-foreground">
          {isRequired && <RequiredMark />} {children}
        </span>
      </label>
      <FieldError>{error}</FieldError>
    </div>
  );
}

// ── Anything else ───────────────────────────────────────────────────────────

interface ControlProps<T> {
  id: string;
  /** The error message's id, for the control's aria-describedby. */
  errorId: string;
  value: T;
  invalid: boolean;
  onChange: (next: T) => void;
  onBlur: () => void;
}

interface CustomFieldProps<T> extends FrameProps {
  /** Renders the control (date picker, combobox, OTP, file drop…) wired to the field. */
  children: (control: ControlProps<T>) => ReactNode;
  /** Side effect after the value changes. */
  onValueChange?: (value: T) => void;
}

/**
 * The same label / * / error frame around any control the named components
 * don't cover, so a date picker or combobox reads exactly like a text field.
 */
export function CustomField<T>({ children, onValueChange, ...frame }: CustomFieldProps<T>) {
  const { field, error, controlId, invalid, isRequired } = useFieldBits<T>(
    frame.id,
    frame.required
  );
  return (
    <Frame {...frame} required={isRequired} controlId={controlId} error={error}>
      {children({
        id: controlId,
        errorId: `${controlId}-error`,
        value: field.state.value,
        invalid,
        onBlur: field.handleBlur,
        onChange: (next) => {
          field.handleChange(next);
          onValueChange?.(next);
        },
      })}
    </Frame>
  );
}
