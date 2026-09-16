"use client";

import { useState, type KeyboardEvent } from "react";
import { Input, Tag, TagGroup } from "@/components/ui";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Chip entry for email recipients: type an address, press Enter or comma to
 * commit it. Modelled on client-management's ClientTagsInput but validating on
 * commit, because a mistyped recipient here means an invoice that silently
 * never arrives. Production applies the same rule with multiEmailValidator.
 */
export function EmailRecipientsInput({
  id,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  value: string[];
  placeholder?: string;
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const commit = () => {
    const email = draft.trim().replace(/,$/, "");
    if (!email) return;

    if (!EMAIL_PATTERN.test(email)) {
      setError(`"${email}" is not a valid email address`);
      return;
    }
    // A duplicate is a no-op, not a mistake worth interrupting for.
    if (!value.includes(email)) onChange([...value, email]);
    setDraft("");
    setError(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      // Enter would otherwise submit the surrounding form.
      e.preventDefault();
      commit();
      return;
    }
    if (e.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="space-y-1.5">
      {value.length > 0 && (
        <TagGroup>
          {value.map((email) => (
            <Tag key={email} onRemove={() => onChange(value.filter((item) => item !== email))}>
              {email}
            </Tag>
          ))}
        </TagGroup>
      )}

      <Input
        id={id}
        type="email"
        placeholder={placeholder ?? "Enter an email address"}
        value={draft}
        aria-invalid={!!error}
        onChange={(e) => {
          setDraft(e.target.value);
          if (error) setError(null);
        }}
        onKeyDown={handleKeyDown}
        // Committing on blur means a typed-but-not-entered address is not
        // silently dropped when the merchant clicks Send.
        onBlur={commit}
      />

      {error && <p className="text-[12px] text-destructive">{error}</p>}
    </div>
  );
}
