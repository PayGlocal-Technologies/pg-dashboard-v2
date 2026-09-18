"use client";

import { useState, type KeyboardEvent } from "react";
import { Button, InputGroup, InputGroupAddon, InputGroupInput, Tag } from "@/components/ui";

interface ClientTagsInputProps {
  id: string;
  value: string[];
  onChange: (next: string[]) => void;
  /**
   * Tags already in use across this merchant's clients, offered below the field
   * (see useClientTagOptions). Suggestions only — the field stays free-form, so a
   * merchant can still type a tag nobody has used yet. Filing two clients under
   * "retainer" and "Retainer" is the thing this exists to prevent.
   */
  suggestions?: string[];
}

/**
 * Free-form tag entry as a single token field: the committed tags sit inside
 * the input's own box, and the caret stays where it was — immediately after the
 * last chip — so typing continues in the same place the previous tag was typed.
 * Type a label, press Enter (or comma), and it becomes a chip in front of the
 * caret rather than moving anywhere.
 *
 * Built from flux's InputGroup: the group draws the field's border, background,
 * and focus ring, an inline-start addon holds the chips inside it, and
 * InputGroupInput is the caret's own borderless input. Three behaviours come
 * free from that composition and are the reason for using it rather than a
 * bordered div:
 *
 * - clicking anywhere in the field focuses the input (the addon's own onClick),
 *   which is what makes the whole box read as one control;
 * - that same handler ignores clicks that land on a button, so a chip's ×
 *   removes its tag instead of stealing focus;
 * - the group's ring responds to the inner input's focus, so the field lights up
 *   exactly as any other Input does.
 *
 * The chips are flux's Tag with its built-in `onRemove`, so the dismiss
 * affordance and its styling are the design system's rather than anything drawn
 * here. Deliberately not CheckboxSelect, flux's other multi-value control: that
 * one picks from a fixed option list, and client tags are whatever the merchant
 * decides to file this client under.
 */
export function ClientTagsInput({ id, value, onChange, suggestions = [] }: ClientTagsInputProps) {
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

  // Case-insensitive, because the point of offering these is to stop the same
  // label being filed twice under different capitalisation.
  const chosen = new Set(value.map((tag) => tag.toLowerCase()));
  const unusedSuggestions = suggestions.filter((tag) => !chosen.has(tag.toLowerCase()));

  return (
    // The field and its suggestion row stack, so the suggestions read as
    // belonging to it rather than as a separate control below.
    <div className="flex flex-col gap-2">
      {/* h-auto/flex-wrap override InputGroup's fixed h-11 single row: enough tags
          to fill the width push the caret onto a second line inside the same
          field, growing the box downward instead of scrolling it sideways.
          items-center keeps the chips and the caret on a shared centre line, and
          the vertical padding is what stops the chips touching the border once it
          grows. */}
      <InputGroup className="h-auto min-h-11 flex-wrap items-center gap-1.5 py-1.5">
        {value.length > 0 && (
          // min-h-0 cancels the addon's own min-h-11, which is sized for a single
          // icon in a fixed-height field and would otherwise hold the box open at
          // one row's height regardless of how many chips it carries.
          <InputGroupAddon align="inline-start" className="min-h-0 flex-wrap gap-1.5">
            {value.map((tag) => (
              <Tag key={tag} onRemove={() => onChange(value.filter((t) => t !== tag))}>
                {tag}
              </Tag>
            ))}
          </InputGroupAddon>
        )}
        <InputGroupInput
          id={id}
          // Once there are chips the field has demonstrated what it does, so the
          // hint shortens to leave the caret room on the same line as them.
          placeholder={value.length ? "Add another" : "Add a tag and press Enter"}
          // flex-1 with a floor, so the caret always has somewhere to sit: it
          // takes the space left on the chips' line where there is any, and wraps
          // to its own line where there isn't.
          className="min-w-[7rem] flex-1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          // Commits whatever is half-typed when focus leaves, so a tag isn't
          // silently lost by tabbing onward or submitting the form.
          onBlur={commit}
        />
      </InputGroup>

      {/* Only the ones not already on this client, so the row shrinks as they
          are used and disappears once there is nothing left to offer. Buttons,
          not Tags: a Tag carries a remove affordance, and these add. */}
      {unusedSuggestions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Used before:</span>
          {unusedSuggestions.map((tag) => (
            <Button
              key={tag}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange([...value, tag])}
              className="h-auto min-h-0 rounded-full px-2 py-0.5 text-[11px] font-normal"
            >
              {tag}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
