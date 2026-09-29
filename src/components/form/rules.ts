/**
 * Field rules for the app form layer, modelled on pg-dashboard's antd rules
 * (`rules: [IsRequired({ fieldName }), emailValidator()]`):
 *
 *  - `required` is its own rule and names the field ("City is required").
 *  - Every format rule passes on an empty value, so it only speaks once
 *    something has been entered; pair it with `required` when the field must
 *    be filled.
 *  - `rules(...)` runs them in order and returns the first message. It is a
 *    TanStack validator, so it goes straight into `validators={{ onChange }}`.
 *
 * A validator built by `rules()` carries whether it contains `required`, and
 * the field components read that to draw the red * (see fields.tsx), so the
 * mark and the check can never disagree. `rules(...).required` can be forced
 * with `requiredWhen` for conditionally required fields.
 */

type Rule<T> = (value: T) => string | undefined;

/** Text rules accept the optional/nullable strings API records carry. */
type Text = string | null | undefined;

/** A TanStack field validator that also says whether it enforces "required".
 *  Its parameter is `unknown` so it fits any field's value type. */
export type AppValidator = ((props: { value: unknown }) => string | undefined) & {
  isRequired: boolean;
};

const REQUIRED = Symbol("required");
type RequiredRule<T> = Rule<T> & { [REQUIRED]: true };

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "boolean") return value === false;
  return false;
}

/** Composes rules into one validator; the first failing rule's message wins. */
export function rules(...list: Array<Rule<any> | false | null | undefined>): AppValidator {
  const active = list.filter(Boolean) as Rule<any>[];
  const validator = (({ value }: { value: unknown }) => {
    for (const rule of active) {
      const message = rule(value);
      if (message) return message;
    }
    return undefined;
  }) as AppValidator;
  validator.isRequired = active.some((rule) => REQUIRED in rule);
  return validator;
}

/** "<Label> is required" (or `message`) when the value is empty. */
export function required<T = Text>(label: string, message?: string): Rule<T> {
  const rule = ((value: T) =>
    isEmpty(value) ? (message ?? `${label} is required`) : undefined) as RequiredRule<T>;
  rule[REQUIRED] = true;
  return rule;
}

/** `required` only while `when` is true; the * follows it (pass the same flag). */
export function requiredWhen<T = Text>(when: boolean, label: string, message?: string) {
  return when ? required<T>(label, message) : undefined;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function email(message = "Enter a valid email address"): Rule<Text> {
  return (value) => (!isEmpty(value) && !EMAIL_RE.test((value ?? "").trim()) ? message : undefined);
}

export function pattern(re: RegExp, message: string): Rule<Text> {
  return (value) => (!isEmpty(value) && !re.test((value ?? "").trim()) ? message : undefined);
}

export function minLength(length: number, message: string): Rule<Text> {
  return (value) => (!isEmpty(value) && (value ?? "").trim().length < length ? message : undefined);
}

export function maxLength(length: number, message: string): Rule<Text> {
  return (value) => (!isEmpty(value) && (value ?? "").trim().length > length ? message : undefined);
}

/** An amount strictly above zero (empty passes; pair with `required`). */
export function positiveAmount(message = "Enter an amount greater than zero"): Rule<Text> {
  return (value) => (!isEmpty(value) && !(Number(value) > 0) ? message : undefined);
}

/** Any other check, written inline. Return a message to fail. */
export function check<T>(fn: (value: T) => string | undefined | false | null): Rule<T> {
  return (value) => fn(value) || undefined;
}

/** Whether a field's validators include `required`, for the red *. */
export function validatorIsRequired(validators: unknown): boolean {
  const onChange = (validators as { onChange?: unknown } | undefined)?.onChange;
  return !!(onChange && typeof onChange === "function" && (onChange as AppValidator).isRequired);
}
