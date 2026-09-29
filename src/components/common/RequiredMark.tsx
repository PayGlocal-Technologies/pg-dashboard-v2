/**
 * The red asterisk on a required field's label.
 *
 * aria-hidden because the asterisk means nothing read aloud; the input's own
 * aria-invalid and the FieldError under it are what a screen reader gets.
 * Always placed before the label text, so required-ness reads the same way
 * in every form: `<FieldLabel><RequiredMark /> Name</FieldLabel>`.
 */
export function RequiredMark() {
  return (
    <span aria-hidden className="text-destructive">
      *
    </span>
  );
}
