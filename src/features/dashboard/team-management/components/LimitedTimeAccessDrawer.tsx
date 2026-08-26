"use client";

import { useState } from "react";
import type { QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Field,
  FieldLabel,
  Input,
} from "@/components/ui";
import { usePut } from "@/lib/api/hooks";
import { setLimitedTimeApi } from "@/features/dashboard/team-management/services";
import type { TeamMemberRow } from "@/features/dashboard/team-management/types";

interface LimitedTimeVariables {
  dynamicUrl: string;
  limitedTimeAccessUser: true;
  limitedTimeAccessHours: number;
  limitedTimeAccessMinutes: number;
}

interface LimitedTimeFormProps {
  row: TeamMemberRow;
  invalidateKey: QueryKey[];
  onDone: () => void;
}

// Keyed by row.id in the parent so each member gets a fresh instance (fresh
// useState initialisers) rather than syncing from props via an effect.
// Access window rules ported from pg-dashboard's useLimitedTimeAccessFields:
// hours 1–3, minutes 0–59, and minutes are pinned to 0 once hours reaches 3.
function LimitedTimeForm({ row, invalidateKey, onDone }: LimitedTimeFormProps) {
  const [hours, setHours] = useState("1");
  const [minutes, setMinutes] = useState("0");

  const { mutate, isPending } = usePut<unknown, LimitedTimeVariables>("", {
    invalidateQueries: invalidateKey,
  });

  const hoursNum = Number(hours);
  const minutesDisabled = hoursNum >= 3;
  const effectiveMinutes = minutesDisabled ? 0 : Number(minutes) || 0;
  const isValid = hoursNum >= 1 && hoursNum <= 3 && effectiveMinutes >= 0 && effectiveMinutes <= 59;

  function handleSubmit() {
    mutate(
      {
        dynamicUrl: setLimitedTimeApi(row.merchantId, row.username),
        limitedTimeAccessUser: true,
        limitedTimeAccessHours: hoursNum,
        limitedTimeAccessMinutes: effectiveMinutes,
      },
      {
        onSuccess: () => {
          toast.success("Limited-time access updated");
          onDone();
        },
        onError: (error) => toast.error(error.message),
      }
    );
  }

  return (
    <>
      <div className="border-b border-border px-6 py-4 pr-14">
        <DialogTitle>
          {row.limitedTimeAccessUser ? "Edit limited time" : "Set limited time"}
        </DialogTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          {row.firstName} {row.lastName} · {row.username}
        </p>
      </div>

      <div className="grid gap-3 px-6 py-5 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="lt-hours">Hours (1–3)</FieldLabel>
          <Input
            id="lt-hours"
            type="number"
            min={1}
            max={3}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="lt-minutes">Minutes (0–59)</FieldLabel>
          <Input
            id="lt-minutes"
            type="number"
            min={0}
            max={59}
            value={minutesDisabled ? "0" : minutes}
            disabled={minutesDisabled}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </Field>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
        <Button type="button" variant="outline" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={!isValid || isPending}
          onClick={handleSubmit}
        >
          Save
        </Button>
      </div>
    </>
  );
}

interface LimitedTimeAccessDrawerProps {
  row: TeamMemberRow | null;
  onOpenChange: (open: boolean) => void;
  invalidateKey: QueryKey[];
}

export function LimitedTimeAccessDrawer({
  row,
  onOpenChange,
  invalidateKey,
}: LimitedTimeAccessDrawerProps) {
  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-125 gap-0 p-0">
        {row && (
          <LimitedTimeForm
            key={row.id}
            row={row}
            invalidateKey={invalidateKey}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
