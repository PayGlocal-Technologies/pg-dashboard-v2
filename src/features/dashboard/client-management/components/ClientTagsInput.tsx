"use client";

import { useState, type KeyboardEvent } from "react";
import { Input, Tag, TagGroup } from "@/components/ui";

interface ClientTagsInputProps {
  id: string;
  value: string[];
  onChange: (next: string[]) => void;
}

/**
 * Free-form tag entry: type a label, press Enter (or comma) to commit it,
 * and it joins the row of chips above the field. The chips are flux's own
 * Tag/TagGroup with Tag's built-in `onRemove`, so the dismiss affordance and
 * its styling are the design system's rather than anything drawn here.
 *
 * Deliberately not CheckboxSelect, flux's other multi-value control: that one
 * picks from a fixed option list, and client tags are whatever the merchant
 * decides to file this client under.
 */
export function ClientTagsInput({ id, value, onChange }: ClientTagsInputProps) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const tag = draft.trim().replace(/,$/, "");
    // Silently ignores a duplicate rather than erroring: adding a tag that is
    // already there is a no-op, not a mistake worth interrupting for.
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setDraft("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      // Enter would otherwise submit the surrounding form, which is the wrong
      // outcome for a key that means "finish this tag".
      e.preventDefault();
      commit();
      return;
    }
    // Backspace on an empty field removes the last chip — the standard
    // behaviour for a token field, and the only way to correct a tag without
    // reaching for the mouse.
    if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <TagGroup>
          {value.map((tag) => (
            <Tag key={tag} onRemove={() => onChange(value.filter((t) => t !== tag))}>
              {tag}
            </Tag>
          ))}
        </TagGroup>
      )}
      <Input
        id={id}
        placeholder="Add a tag and press Enter"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        // Commits whatever is half-typed when focus leaves, so a tag isn't
        // silently lost by tabbing onward or submitting the form.
        onBlur={commit}
      />
    </div>
  );
}
