"use client";

import {
  Button,
  Checkbox,
  Input,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { SmoothSelect as Select } from "@/features/dashboard/payment-pages/components/SmoothSelect";
import { Icon } from "@/components/icon";
import { CUSTOM_FIELD_TYPE_OPTIONS, EMPTY_CUSTOM_FIELD } from "@/features/dashboard/payment-pages/constants";
import type { CustomField, CustomFieldType } from "@/features/dashboard/payment-pages/types";

interface CustomFieldsEditorProps {
  value: CustomField[];
  onChange: (next: CustomField[]) => void;
}

/** Editable list of custom fields for the payment page: each row is a type +
 * label, with optional "set a default value" and "mark as optional" toggles.
 * Kept as its own component so the builder container stays focused. */
export function CustomFieldsEditor({ value, onChange }: CustomFieldsEditorProps) {
  function patchField(index: number, patch: Partial<CustomField>) {
    onChange(value.map((field, i) => (i === index ? { ...field, ...patch } : field)));
  }

  function removeField(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function addField() {
    onChange([...value, { ...EMPTY_CUSTOM_FIELD }]);
  }

  return (
    <div className="flex flex-col gap-4">
      {value.map((field, index) => (
        <div
          key={index}
          className="flex flex-col gap-3 duration-200 animate-in fade-in-0 slide-in-from-top-1"
        >
          {index > 0 && <div className="my-2 border-t border-border" />}

          <div className="flex items-start gap-2">
            <Select
              value={field.type}
              onValueChange={(v) => patchField(index, { type: v as CustomFieldType })}
            >
              <SelectTrigger className="w-40 shrink-0 cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {CUSTOM_FIELD_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Label name"
              value={field.label}
              onChange={(e) => patchField(index, { label: e.target.value })}
              className="flex-1"
            />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Remove field"
              onClick={() => removeField(index)}
              className="h-9 w-9 min-h-0 min-w-0 shrink-0 cursor-pointer rounded-md p-0 text-muted-foreground hover:text-destructive"
            >
              <Icon name="trash-2" className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-col gap-2 pl-1">
            <label className="flex cursor-pointer items-center gap-2.5">
              <Checkbox
                checked={field.hasDefault}
                onCheckedChange={(checked) => patchField(index, { hasDefault: checked === true })}
              />
              <span className="text-[13px] font-medium text-foreground">Set a default value</span>
              <Icon name="info" className="h-3.5 w-3.5 text-muted-foreground" />
            </label>

            {field.hasDefault && (
              <Input
                placeholder="Default value"
                value={field.defaultValue}
                onChange={(e) => patchField(index, { defaultValue: e.target.value })}
                className="duration-200 animate-in fade-in-0 slide-in-from-top-1"
              />
            )}

            <label className="flex cursor-pointer items-center gap-2.5">
              <Checkbox
                checked={field.optional}
                onCheckedChange={(checked) => patchField(index, { optional: checked === true })}
              />
              <span className="text-[13px] font-medium text-foreground">Mark as optional</span>
            </label>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
        onClick={addField}
        className="cursor-pointer self-start rounded-full border-dashed text-primary hover:text-primary"
      >
        Add another field
      </Button>
    </div>
  );
}
