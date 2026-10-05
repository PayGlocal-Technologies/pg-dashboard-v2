"use client";

import { Suspense } from "react";
import { Icon } from "@/components/icon";
import { BANK_LOGOS, LazyBankLogo, type BankLogoEntry } from "@/components/icon/banks";
import { cn } from "@/lib/utils";

/** Words that don't tell banks apart, dropped before matching names. */
const NOISE = /\b(the|limited|ltd|bank|of|and|co|operative|india)\b|[.&,()-]/gi;
const normalise = (s: string) => s.replace(NOISE, " ").replace(/\s+/g, " ").trim().toLowerCase();

/** How banks are commonly written that their official names don't cover. */
const ALIASES: Record<string, string> = {
  sbi: "sbin",
  "state bank": "sbin",
  pnb: "punb",
  bob: "barb",
  baroda: "barb",
  boi: "bkid",
  "j k": "jaka",
  rbl: "ratn",
  "idfc first": "idfb",
  idfc: "idfb",
  uco: "ucba",
  "standard chartered": "scbl",
  kotak: "kkbk",
  axis: "utib",
  yes: "yesb",
  paytm: "pytm",
  airtel: "airp",
  jio: "jiop",
  ujjivan: "ujvn",
  au: "aubl",
  "au small finance": "aubl",
};

const BY_NAME = new Map(BANK_LOGOS.map((b) => [normalise(b.name), b]));
const BY_SLUG = new Map(BANK_LOGOS.map((b) => [b.slug, b]));
/** Exact names first: some ("Bank of India") are nothing but common words. */
const BY_EXACT = new Map(BANK_LOGOS.map((b) => [b.name.toLowerCase(), b]));

/**
 * The bank behind a name ("HDFC Bank", "State Bank of India", "SBI") or an
 * IFSC code / prefix ("HDFC0001234", "SBIN"), or undefined when the library
 * has no logo for it.
 */
export function findBank(nameOrIfsc?: string): BankLogoEntry | undefined {
  if (!nameOrIfsc) return undefined;
  const raw = nameOrIfsc.trim();
  const ifsc = /^([A-Za-z]{4})(0[A-Za-z0-9]{6})?$/.exec(raw);
  if (ifsc && BY_SLUG.has(ifsc[1]!.toLowerCase())) return BY_SLUG.get(ifsc[1]!.toLowerCase());
  const exact = BY_EXACT.get(raw.toLowerCase().replace(/\s+(limited|ltd\.?)$/, ""));
  if (exact) return exact;
  const key = normalise(raw);
  if (!key) return undefined;
  const alias = ALIASES[key];
  if (alias) return BY_SLUG.get(alias);
  if (BY_NAME.has(key)) return BY_NAME.get(key);
  // "HDFC Bank Ltd, Mumbai" and similar: the longest bank name it contains.
  let best: BankLogoEntry | undefined;
  for (const [name, bank] of BY_NAME) {
    if (` ${key} `.includes(` ${name} `) && (!best || name.length > normalise(best.name).length)) {
      best = bank;
    }
  }
  return best;
}

const FRAME =
  "inline-flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border";

function GenericBank({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn(FRAME, "bg-muted text-muted-foreground", className)}>
      <Icon name="building-2" size={11} />
    </span>
  );
}

/**
 * A bank's logo from the indian-banks library (@/components/icon/banks), in a
 * small framed square sized to sit beside the bank's name. Each logo is
 * loaded on demand; while it loads, and for a bank the library doesn't have,
 * a neutral bank glyph holds the same space, so rows never shift.
 * Decorative: the name beside it carries the meaning.
 */
export function BankLogo({ name, className }: { name?: string; className?: string }) {
  const bank = findBank(name);
  if (!bank) return <GenericBank className={className} />;
  return (
    <Suspense fallback={<GenericBank className={className} />}>
      <span aria-hidden className={cn(FRAME, "bg-white p-0.5", className)}>
        <LazyBankLogo slug={bank.slug} className="h-full w-full" aria-hidden role="presentation" />
      </span>
    </Suspense>
  );
}

/** A bank's logo and name together, as a detail value. */
export function BankName({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <BankLogo name={name} />
      <span>{name}</span>
    </span>
  );
}
