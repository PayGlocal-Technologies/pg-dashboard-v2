"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { COUNTRIES } from "@/components/ui";
import { useDelete, useGet, usePost, usePostQuery, usePut } from "@/lib/api/hooks";
import { useResolvedMids } from "@/lib/hooks/useResolvedMids";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";
import { buildTxnRequestBody } from "@/lib/utils/buildTxnRequestBody";
import { buildS3Headers } from "@/features/dashboard/mca-transactions/useInvoiceUpload";
import {
  clientByIdApi,
  clientContractDeleteApi,
  clientContractUploadApi,
  clientContractViewApi,
  clientCountryCodesApi,
  clientCreateApi,
  clientInvoiceSearchApi,
  clientInvoiceSummaryApi,
  clientSearchApi,
  clientStateCodesApi,
  clientTagOptionsApi,
  clientUpdateApi,
  invoiceDeleteApi,
  invoiceDuplicateApi,
  invoiceViewApi,
  zohoPullSyncApi,
  zohoStatusApi,
} from "@/features/dashboard/client-management/services";
import {
  CLIENT_PAGE_LIMIT,
  currencyForCountry,
} from "@/features/dashboard/client-management/constants";
import type {
  Client,
  ClientApiAddress,
  ClientApiRecord,
  ClientByIdResponse,
  ClientInvoice,
  ClientInvoicesResponse,
  ClientContractDocument,
  ClientContractPresignResponse,
  ClientContractViewResponse,
  ClientCountryCodesResponse,
  ClientCreateResponse,
  ClientFormValues,
  ClientInvoiceSummaryResponse,
  ClientMutationPayload,
  ClientSearchResponse,
  ClientStateCodesResponse,
  ClientTagOptionsResponse,
  InvoiceViewResponse,
  ZohoPullSyncPayload,
  ZohoStatusResponse,
} from "@/features/dashboard/client-management/types";
import type { TableReqBody } from "@/types/transactions";

// ── Wire ↔ render mapping ───────────────────────────────────────────────────
// The one place that knows both shapes. Components keep consuming Client exactly
// as they did when it came from MOCK_CLIENTS.

/**
 * Splits the API's single phone string into the dial code and the rest, which is
 * how v2 stores it so the table can group every row's digits identically.
 *
 * The API has one free-text "Primary Contact Number" field, so what arrives is
 * whatever the merchant typed — sometimes with a dial code, sometimes without.
 * The client's own country is tried first, since that is the code it will carry
 * in almost every case; failing that, the longest matching code from any country
 * wins, because +1 is a prefix of nothing but +1 while +44 and +4 would be
 * ambiguous the other way round. With no match the whole string stays in
 * `phoneNumber` rather than guessing — a wrong dial code silently changes a
 * phone number.
 */
function splitPhone(raw: string, countryIso2: string): { dialCode: string; number: string } {
  const value = (raw ?? "").trim();
  if (!value.startsWith("+")) return { dialCode: "", number: value };

  const own = COUNTRIES.find((c) => c.code === countryIso2)?.dialCode;
  if (own && value.startsWith(own)) {
    return { dialCode: own, number: value.slice(own.length).trim() };
  }

  const match = COUNTRIES.map((c) => c.dialCode)
    .filter((code) => code && value.startsWith(code))
    .sort((a, b) => b.length - a.length)[0];

  return match
    ? { dialCode: match, number: value.slice(match.length).trim() }
    : { dialCode: "", number: value };
}

/** The parts of a structured address, joined for display. Empty parts are
 *  dropped so a missing line two never leaves a doubled comma. */
function composeAddress(address: ClientApiAddress | undefined, countryName: string): string {
  if (!address) return countryName;
  return [
    address.streetAddress1,
    address.streetAddress2,
    address.city,
    address.state,
    address.zipcode,
    address.country || countryName,
  ]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(", ");
}

/**
 * Resolves a client's country into the code the flag needs and the name the cell
 * shows, from whichever of the two the record happens to carry.
 *
 * The record's `country` turned out to hold an **ISO2 code** ("NZ"), not the
 * display name the mapper first assumed. That single wrong assumption produced
 * both visible bugs at once: the cell printed "NZ" instead of "New Zealand", and
 * the ISO2 lookup missed, so every flag resolved to an empty code and rendered as
 * a broken image.
 *
 * Handled by detecting the shape rather than trusting either: an ISO2 code is
 * exactly two letters and no country name is, so the test is unambiguous and
 * works whichever form a given environment returns. The name comes from flux's
 * COUNTRIES — the same source the rest of the app names countries from — with the
 * fetched map as a fallback, so a correct flag no longer depends on that call
 * having resolved at all.
 */
function resolveCountry(
  raw: string,
  iso2ToName: Record<string, string>,
  nameToIso2: Record<string, string>
): { iso2: string; name: string } {
  const value = (raw ?? "").trim();
  if (!value) return { iso2: "", name: "" };

  const looksLikeIso2 = /^[A-Za-z]{2}$/.test(value);

  if (looksLikeIso2) {
    const iso2 = value.toUpperCase();
    const name =
      COUNTRIES.find((country) => country.code === iso2)?.name ?? iso2ToName[iso2] ?? iso2;
    return { iso2, name };
  }

  // A display name: keep it, and find its code so the flag still renders.
  const iso2 = nameToIso2[value] ?? COUNTRIES.find((country) => country.name === value)?.code ?? "";
  return { iso2, name: value };
}

/**
 * One client, wire → render.
 */
export function toClient(record: ClientApiRecord, countryMap: ClientCountryMap): Client {
  // The address's country first, the top-level one only as a fallback.
  //
  // The record carries the country twice and the two are not equivalent. The one
  // inside `address` is the authoritative copy: it is the field pg-dashboard's form
  // binds to (`["address", "country"]`) and the one its details page renders, so it
  // is what a create or an update actually writes. The top-level `country` is a
  // derived convenience its list column reads, and on a record written by either
  // app it can be absent entirely — neither sends one, since neither form collects
  // one at the top level.
  //
  // Reading only the top-level field is why the edit form opened with an empty
  // Country: the by-id record had the country under `address` and nothing above
  // it, so this resolved to "" and the select had no value to show.
  const { iso2: countryIso2, name: countryName } = resolveCountry(
    record.address?.country || record.country || "",
    countryMap.iso2ToName,
    countryMap.nameToIso2
  );
  const phone = splitPhone(record.number, countryIso2);

  return {
    id: record.id,
    mid: record.mid,
    businessName: record.businessName ?? "",
    primaryContactName: record.name ?? "",
    email: record.email ?? "",
    phoneDialCode: phone.dialCode,
    phoneNumber: phone.number,
    billingAddress: composeAddress(record.address, countryName),
    countryIso2,
    countryName,
    // The record's own currency where it has one; otherwise the currency the
    // client's country receives in, which is what the table's amounts would
    // have been denominated in anyway.
    currency: record.currency || (countryIso2 ? currencyForCountry(countryIso2) : ""),
    createdAt: record.createdAt ?? record.formattedCreationDate ?? "",
    totalInvoiceAmount: record.totalInvoiceAmount,
    outstandingAmount: record.outstandingAmount,
    businessType: record.type,
    website: record.websiteLink,
    tags: record.tags ?? [],
    // ?? undefined throughout: the wire address is nullable in both directions
    // (see ClientApiAddress), and the render model distinguishes only "present" from
    // "absent" — a null would otherwise reach a form field expecting a string.
    addressLine: record.address?.streetAddress1 ?? undefined,
    addressLine2: record.address?.streetAddress2 ?? undefined,
    city: record.address?.city ?? undefined,
    state: record.address?.state ?? undefined,
    zipcode: record.address?.zipcode ?? undefined,
    // The shipping address, kept so the edit form can round-trip it and so the
    // "same as billing" checkbox can be derived rather than guessed.
    shippingAddressLine: record.shippingAddress?.streetAddress1 ?? undefined,
    shippingAddressLine2: record.shippingAddress?.streetAddress2 ?? undefined,
    shippingCity: record.shippingAddress?.city ?? undefined,
    shippingState: record.shippingAddress?.state ?? undefined,
    shippingZipcode: record.shippingAddress?.zipcode ?? undefined,
    shippingCountryName: record.shippingAddress?.country ?? undefined,
    shippingCountryIso2: record.shippingAddress?.country
      ? resolveCountry(record.shippingAddress.country, countryMap.iso2ToName, countryMap.nameToIso2)
          .iso2
      : undefined,
    gstin: record.gstIn,
    notes: record.notes,
    // Drives the Zoho marker in the list, the card and the details view. Was
    // typed but never mapped, so the badge had nothing to render from.
    source: record.source,
    // No size: the API's contract object carries none (see ClientApiContract).
    // fileId is what marks this as a document the server can be asked to open.
    contract: record.contract
      ? {
          name:
            record.contract.originalFileName || record.contract.fileName || record.contract.name,
          fileId: record.contract.fileId,
        }
      : undefined,
  };
}

/**
 * Form values → create/update body.
 *
 * Byte for byte the shape pg-dashboard puts on the wire. Its handler spreads antd
 * form values straight into the request, and three properties of that fall out
 * which have to be reproduced deliberately rather than approximated:
 *
 * - **A rendered-but-empty field is `null`, not `""` and not absent.** antd
 *   registers every mounted field, so `websiteLink`, `tags` and an unfilled
 *   `streetAddress2` all arrive as explicit nulls.
 * - **A field behind a collapsed accordion is absent entirely**, because it was
 *   never mounted and so never registered. That is `gstIn` and `notes` — both live
 *   in "GST (Optional)" and "Notes & Contract (Optional)" panels. An absent GSTIN
 *   has nothing to validate; a `""` one is a value that must pass the GSTIN rule.
 * - **`sameAsBusinessName` is sent**, because pg-dashboard's checkbox is a
 *   registered form field. `sameAsBillingAddress` is not, because its equivalent
 *   there is local component state.
 *
 * There is no `mid` in the body: the merchant id is a path segment on this
 * endpoint (see clientCreateApi), and pg-dashboard sends it nowhere else despite
 * its own ClientCreateRequest type declaring one.
 *
 * Key order below follows production's payload too. Irrelevant to any parser, but
 * it makes the two bodies diffable side by side, which is how this was found.
 */
export function toClientApiPayload(
  values: ClientFormValues,
  /** ISO2 → the country string this API takes. Not a display name: pg-dashboard's
   *  country select is built from get-country-details and submits one of that
   *  map's own keys verbatim — which in every environment seen so far is the ISO2
   *  code ("NZ"), not the name. See useClientCountryMap's iso2ToApiCountry. */
  apiCountryFor: (iso2: string) => string
): ClientMutationPayload {
  const countryName = apiCountryFor(values.country);

  const address = toApiAddress({
    country: countryName,
    state: values.state,
    streetAddress1: values.addressLine,
    streetAddress2: values.addressLine2,
    city: values.city,
    zipcode: values.zipcode,
  });

  // Ticked "same as billing" sends a copy of the billing address, which is
  // exactly what pg-dashboard does behind its own checkbox. Unticked sends what
  // the shipping fields collected.
  const shippingAddress = values.sameAsBillingAddress
    ? address
    : toApiAddress({
        country: apiCountryFor(values.shippingCountry) || countryName,
        state: values.shippingState,
        streetAddress1: values.shippingAddressLine,
        streetAddress2: values.shippingAddressLine2,
        city: values.shippingCity,
        zipcode: values.shippingZipcode,
      });

  // Ticked "same as business name" sends the business name as the contact name,
  // the other half of pg-dashboard's pair of mirroring checkboxes.
  const contactName = values.sameAsBusinessName
    ? values.businessName.trim()
    : values.primaryContactName.trim();

  return {
    businessName: values.businessName.trim(),
    name: contactName || values.businessName.trim(),
    sameAsBusinessName: values.sameAsBusinessName,
    email: values.primaryContactEmail.trim(),
    // Recombined into the single string the API stores, which is the one free-text
    // field pg-dashboard collects this as. The dial code is kept — v2 collects it
    // as its own picker, and production's field accepts a "+"-prefixed number too
    // (it carries no format rule, only `required`), so this is strictly more
    // information in the same shape rather than a different one.
    number: `${dialCodeOf(values.phoneCountry)}${values.phoneNumber.replace(/\D/g, "")}`,
    websiteLink: emptyToNull(values.website),
    // Already an API enum code, not a label — see CLIENT_BUSINESS_TYPES. This is
    // what the 400 was: v2 offered business types of its own devising and sent
    // "Company" where the API's enum is "COMPANY".
    type: values.businessType.trim(),
    tags: values.tags.length ? values.tags : null,
    address,
    shippingAddress,
    // Accordion-gated in production, so absent rather than null when unfilled.
    ...(values.gstin.trim() ? { gstIn: values.gstin.trim() } : {}),
    ...(values.notes.trim() ? { notes: values.notes.trim() } : {}),
  };
}

/** "" → null, matching what a registered-but-empty antd field serialises to. */
function emptyToNull(value: string): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * The address as production sends it: every part present as a key, each one
 * trimmed, and an unfilled part as `null` rather than an empty string — all six
 * fields are mounted in pg-dashboard's form, so all six are registered.
 */
function toApiAddress(parts: Record<keyof ClientApiAddress, string>): ClientApiAddress {
  return {
    country: emptyToNull(parts.country),
    state: emptyToNull(parts.state),
    streetAddress1: emptyToNull(parts.streetAddress1),
    streetAddress2: emptyToNull(parts.streetAddress2),
    city: emptyToNull(parts.city),
    zipcode: emptyToNull(parts.zipcode),
  };
}

function dialCodeOf(countryIso2: string): string {
  return COUNTRIES.find((c) => c.code === countryIso2)?.dialCode ?? "";
}

/**
 * Whether the client's shipping address is the same as its billing one.
 *
 * Derived rather than read: the API has no "same as" flag, only the two address
 * objects, so the checkbox's state has to be recovered by comparing them. A
 * client with no shipping address at all counts as the same — that is what an
 * absent one means, and it is what pg-dashboard sends for it.
 */
function shippingMatchesBilling(client: Client): boolean {
  if (!client.shippingAddressLine && !client.shippingCity && !client.shippingZipcode) return true;
  return (
    (client.shippingAddressLine ?? "") === (client.addressLine ?? "") &&
    (client.shippingAddressLine2 ?? "") === (client.addressLine2 ?? "") &&
    (client.shippingCity ?? "") === (client.city ?? "") &&
    (client.shippingState ?? "") === (client.state ?? "") &&
    (client.shippingZipcode ?? "") === (client.zipcode ?? "")
  );
}

/** A saved client back into form values, so Edit opens pre-filled. The inverse
 *  of toClientApiPayload. */
export function toClientFormValues(client: Client): ClientFormValues {
  return {
    businessName: client.businessName,
    businessType: client.businessType ?? "",
    website: client.website ?? "",
    tags: client.tags ?? [],
    primaryContactName: client.primaryContactName,
    primaryContactEmail: client.email,
    // The phone's country is recovered from its dial code rather than reusing the
    // address country: a client can perfectly well have a UK address and an
    // Indian contact number, and the record keeps them independent.
    phoneCountry:
      COUNTRIES.find((c) => c.dialCode && c.dialCode === client.phoneDialCode)?.code ??
      client.countryIso2,
    phoneNumber: client.phoneNumber,
    country: client.countryIso2,
    state: client.state ?? "",
    addressLine: client.addressLine ?? "",
    addressLine2: client.addressLine2 ?? "",
    city: client.city ?? "",
    zipcode: client.zipcode ?? "",
    // Ticked when the two really are the same string, so reopening a client
    // created that way shows the same collapsed form it was saved from.
    sameAsBusinessName: client.primaryContactName === client.businessName,
    // Every field equal means the client is shipped to where it is billed, which
    // is what the checkbox says. Compared field by field rather than trusting a
    // stored flag, because the API stores no such flag — only the two addresses.
    sameAsBillingAddress: shippingMatchesBilling(client),
    shippingAddressLine: client.shippingAddressLine ?? "",
    shippingAddressLine2: client.shippingAddressLine2 ?? "",
    shippingCity: client.shippingCity ?? "",
    shippingState: client.shippingState ?? "",
    shippingZipcode: client.shippingZipcode ?? "",
    shippingCountry: client.shippingCountryIso2 ?? "",
    gstin: client.gstin ?? "",
    notes: client.notes ?? "",
    contract: client.contract ? { name: client.contract.name, size: 0 } : null,
  };
}

// ── MID resolution ──────────────────────────────────────────────────────────

/**
 * The client book's merchant id, which every one of its endpoints takes as a path
 * segment for every user — not just partners. `urlMid || midFilter[0]` resolves to
 * the same id pg-dashboard computes as `selectedMid || paCbMids[0] || profile.mid`.
 * Same pattern the SKU catalogue and the settlement report use.
 *
 * `midFilter` comes back alongside it for the search body's own filter, whose key
 * is **`mid`**, not `merchantId` — see useClients.
 */
export function useClientPathMid() {
  const { urlMid, midFilter, isReady, guardState } = useResolvedMids("PACB");
  const mid = urlMid || midFilter?.value?.[0] || "";
  return { mid, midFilter, isReady: isReady && !!mid, guardState };
}

/**
 * Whether several PACB MIDs are in play with none selected — the state where an
 * action has to be told which account it applies to. Mirrors pg-dashboard's
 * `pacbMids.length > 1 && !selectedMid`, which is what turns its header buttons
 * into MID pickers.
 */
export function useClientMidScope(): {
  needsMidChoice: boolean;
  midOptions: string[];
  selectMid: (mid: string) => void;
} {
  const paCbMids = useApp((s) => s.paCbMids);
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);
  const setSelectedMidDetails = useAccountSetup((s) => s.setSelectedMidDetails);

  return {
    needsMidChoice: paCbMids.length > 1 && !selectedMid,
    midOptions: paCbMids,
    // Colour tints the header's merchant chip; pg-dashboard sets one here too
    // when a page selects a MID on the merchant's behalf, so the chip doesn't
    // appear blank afterwards.
    selectMid: (mid: string) => setSelectedMidDetails({ mid, color: "#E5B5FF" }),
  };
}

// ── Reference data ──────────────────────────────────────────────────────────

/** The country reference data, normalised so callers never have to know which
 *  way round the endpoint sent it. */
export interface ClientCountryMap {
  iso2ToName: Record<string, string>;
  nameToIso2: Record<string, string>;
  /**
   * The map's own keys, in the order the endpoint returned them.
   *
   * This is what the country filter sends, because it is exactly what
   * pg-dashboard's dropdown sends: its options are `Object.keys(countryCodes)`
   * used as both label and value. Whatever side of the map the backend keys by is
   * therefore the side its own filter matches on, so passing the keys through
   * verbatim is right without having to know which side that is.
   */
  filterKeys: string[];
  /**
   * ISO2 → the country string this API takes on a write, which is the map's own
   * key for that country.
   *
   * Same reasoning as `filterKeys`, for the create/update body rather than the
   * filter: pg-dashboard's country select submits one of the map's keys verbatim,
   * so a write has to carry that key and not a display name of our own. Observed
   * payloads key by ISO2 ("NZ"), but this is derived rather than assumed, so a
   * name-keyed environment resolves correctly too.
   */
  iso2ToApiCountry: Record<string, string>;
}

/**
 * The country reference list, normalised in both directions.
 *
 * `countryCodes` is a flat `Record<string, string>`, which is the same type
 * whichever way round it is populated — name→code or code→name — and the two are
 * indistinguishable from the type alone. Rather than assume (the assumption that
 * produced the broken flags in the first place), the direction is detected: ISO2
 * codes are exactly two letters and country names never are, so whichever side
 * matches that is the code side.
 *
 * App-level configuration, not merchant-scoped, so the query key carries no mid
 * and every surface shares one cached response.
 */
export function useClientCountryMap(): ClientCountryMap & { isLoading: boolean } {
  const { data, isPending } = useGet<ClientCountryCodesResponse>(
    ["client-country-codes"],
    clientCountryCodesApi
  );

  const raw = data?.data?.countryCodes;

  const normalised = useMemo<ClientCountryMap>(() => {
    const iso2ToName: Record<string, string> = {};
    const nameToIso2: Record<string, string> = {};
    const isIso2 = (value: string) => /^[A-Za-z]{2}$/.test(value.trim());

    // The map's key for each country, by ISO2 — whichever side the endpoint keys
    // by. This is what a write has to send; see iso2ToApiCountry.
    const iso2ToApiCountry: Record<string, string> = {};

    for (const [key, value] of Object.entries(raw ?? {})) {
      if (isIso2(key) && !isIso2(value)) {
        // code → name
        iso2ToName[key.toUpperCase()] = value;
        nameToIso2[value] = key.toUpperCase();
        iso2ToApiCountry[key.toUpperCase()] = key;
      } else if (isIso2(value)) {
        // name → code, which is how pg-dashboard's own client list reads it
        nameToIso2[key] = value.toUpperCase();
        iso2ToName[value.toUpperCase()] = key;
        iso2ToApiCountry[value.toUpperCase()] = key;
      }
    }

    return { iso2ToName, nameToIso2, iso2ToApiCountry, filterKeys: Object.keys(raw ?? {}) };
  }, [raw]);

  return { ...normalised, isLoading: isPending };
}

/** Indian state names for the form's State field. Every non-India address
 *  collapses to "OTHER COUNTRY" in this map, which is how pg-dashboard's form
 *  treats one. */
export function useClientStateCodes(): { states: string[]; isLoading: boolean } {
  const { data, isPending } = useGet<ClientStateCodesResponse>(
    ["client-state-codes"],
    clientStateCodesApi
  );

  const states = useMemo(
    () => Object.keys(data?.data?.stateCodes ?? {}).filter((name) => name !== "OTHER COUNTRY"),
    [data]
  );

  return { states, isLoading: isPending };
}

/** Tags already in use for this merchant's clients, as suggestions in the form.
 *  Entries without a name are dropped rather than offered blank. */
export function useClientTagOptions(midOverride?: string): {
  tags: string[];
  isLoading: boolean;
} {
  const { mid: pathMid, isReady } = useClientPathMid();
  const mid = midOverride || pathMid;

  const { data, isPending } = useGet<ClientTagOptionsResponse>(
    ["client-tag-options", mid],
    clientTagOptionsApi(mid),
    { enabled: midOverride ? !!midOverride : isReady }
  );

  const tags = useMemo(
    () => (data?.data?.McaTags ?? []).map((tag) => tag.name ?? "").filter(Boolean),
    [data]
  );

  return { tags, isLoading: isReady && isPending };
}

// ── Reads ───────────────────────────────────────────────────────────────────

interface ClientsArgs {
  /** The search box's query, already trimmed by the caller. */
  search: string;
  /**
   * Values from the Country chip, passed through to `fieldSearch.country`
   * untouched — see ClientCountryMap.filterKeys for why they are not translated.
   */
  countries: string[];
  /** 1-based page, as the table holds it. */
  page: number;
}

export function useClients({ search, countries, page }: ClientsArgs): {
  clients: Client[];
  totalCount: number;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  guardState: "ready" | "not-applicable";
  refetch: () => void;
} {
  const { mid, midFilter, isReady, guardState } = useClientPathMid();
  const countryMap = useClientCountryMap();

  // Stable across renders as long as its inputs are — usePostQuery folds the body
  // into the query key, so an object rebuilt every render would refetch forever.
  //
  // Two filters, because two is all pg-dashboard's client list has: a text input
  // that becomes `queryString`, and a multi-select country dropdown that becomes
  // `fieldSearch.country`. Earlier revisions also sent an email field filter and a
  // creation-date range; neither exists on this endpoint's own screen in
  // production, and inventing keys for them is why those chips never worked.
  const body = useMemo<TableReqBody>(() => {
    const built = buildTxnRequestBody(
      { country: countries },
      {
        searchQuery: search || undefined,
        // The key is `mid`, not `merchantId`: midFilter names itself merchantId
        // because that is what the OpenSearch txn endpoints want, while the client
        // search wants `mid`. Only the values carry over.
        selectedMid: midFilter ? { key: "mid", value: midFilter.value } : undefined,
        pageLimit: CLIENT_PAGE_LIMIT,
        from: (page - 1) * CLIENT_PAGE_LIMIT,
      }
    );

    // With nothing but the MID filter, the derived type would be FILTER_TYPE, but
    // pg-dashboard's client list explicitly sends DEFAULT for exactly that case
    // (the effect in mca-clients/index.tsx) and only lets the derived type through
    // once a real filter is applied. Reproduced rather than tidied away: which one
    // the backend wants is its business, not ours.
    const hasUserFilter = !!(search || countries.length);
    return hasUserFilter ? built : { ...built, searchFilterType: "DEFAULT" };
  }, [search, countries, midFilter, page]);

  const { data, isPending, isFetching, isError, refetch } = usePostQuery<
    ClientSearchResponse,
    TableReqBody
  >(["clients", mid], clientSearchApi(mid), body, { staleTime: 0 }, isReady);

  const clients = useMemo(
    () => (data?.data?.data ?? []).map((record) => toClient(record, countryMap)),
    [data, countryMap]
  );

  return {
    clients,
    totalCount: data?.data?.totalCount ?? 0,
    isLoading: isReady && isPending,
    isFetching,
    isError,
    guardState,
    refetch: () => void refetch(),
  };
}

/**
 * One client in full. The details view refetches rather than rendering the table's
 * row, because the list response is a subset: pg-dashboard's own form does the
 * same before it can populate its fields.
 */
export function useClient(id: string | null): { client: Client | undefined; isLoading: boolean } {
  const { mid, isReady } = useClientPathMid();
  const countryMap = useClientCountryMap();
  const enabled = isReady && !!id;

  const { data, isPending } = useGet<ClientByIdResponse>(
    ["client", mid, id ?? ""],
    clientByIdApi(mid, id ?? ""),
    { enabled }
  );

  const record = data?.data?.client;

  return {
    client: useMemo(
      () => (record ? toClient(record, countryMap) : undefined),
      [record, countryMap]
    ),
    isLoading: enabled && isPending,
  };
}

/** Per-client invoice counts for the details view's KPI row. Counts only — the
 *  amounts beside them come from the client record's own totals, because this
 *  endpoint returns none. */
export function useClientInvoiceSummary(clientId: string | null): {
  counts: { total: number; paid: number; outstanding: number } | undefined;
  isLoading: boolean;
} {
  const { mid, isReady } = useClientPathMid();
  const enabled = isReady && !!clientId;

  const { data, isPending } = useGet<ClientInvoiceSummaryResponse>(
    ["client-invoice-summary", mid, clientId ?? ""],
    clientInvoiceSummaryApi(mid, clientId ?? ""),
    { enabled }
  );

  const summary = data?.data?.data;

  return {
    counts: summary
      ? {
          // totalCreated, not totalNo: production's "Total Invoices Completed"
          // card reads totalCreated, and totalNo counts drafts alongside them.
          total: summary.totalCreated,
          paid: summary.totalPaid,
          outstanding: summary.totalOutstanding,
        }
      : undefined,
    isLoading: enabled && isPending,
  };
}

// ── Writes ──────────────────────────────────────────────────────────────────
// Every mutation invalidates the client list rather than calling refetch with a
// remembered body, which is how pg-dashboard threads `refetch(reqBody)` through
// its modals. Invalidation is equivalent and cannot go stale against a body the
// table has since changed.

const CLIENTS_KEY = ["clients"];
/**
 * The by-id record, which both the details views and the edit form read (see
 * useClient). Invalidated alongside the list by everything that changes a client,
 * because "clients" does not match it — react-query matches by key *prefix*, and
 * ["client", …] and ["clients"] share no first segment. Without this an edit
 * saved successfully and then reopened showing the values it had replaced, since
 * only the list had been refreshed. pg-dashboard refetches the same record
 * explicitly after a save (its getClientData); this is that, expressed as
 * invalidation.
 */
const CLIENT_KEY = ["client"];

/** POST .../create. Resolves with the new client's id, which the contract upload
 *  needs — a contract can only be attached to a client that exists. */
export function useCreateClient(midOverride?: string): {
  createClient: (payload: ClientMutationPayload, onCreated?: (clientId: string) => void) => void;
  isPending: boolean;
} {
  const { mid: pathMid } = useClientPathMid();
  const mid = midOverride || pathMid;

  const { mutate, isPending } = usePost<ClientCreateResponse, ClientMutationPayload>(
    clientCreateApi(mid),
    {
      invalidateQueries: [CLIENTS_KEY],
      onError: (error: Error) => toast.error(error.message || "Client creation failed."),
    }
  );

  return {
    createClient: (payload, onCreated) =>
      mutate(payload, {
        onSuccess: (res) => {
          toast.success("Client created successfully!");
          onCreated?.(res?.data?.clientId ?? "");
        },
      }),
    isPending,
  };
}

/** PUT .../{id}/update. `rowMid` is the row's own MID, which matters for a
 *  multi-MID merchant looking at every account at once. */
export function useUpdateClient(): {
  updateClient: (args: {
    id: string;
    rowMid?: string;
    payload: ClientMutationPayload;
    onUpdated?: () => void;
  }) => void;
  isPending: boolean;
} {
  const { mid } = useClientPathMid();

  const { mutate, isPending } = usePut<unknown, ClientMutationPayload & { dynamicUrl: string }>(
    "",
    {
      invalidateQueries: [CLIENTS_KEY, CLIENT_KEY],
      onError: (error: Error) => toast.error(error.message || "Client updation failed."),
    }
  );

  return {
    updateClient: ({ id, rowMid, payload, onUpdated }) =>
      mutate(
        { dynamicUrl: clientUpdateApi(rowMid || mid, id), ...payload },
        {
          onSuccess: () => {
            toast.success("Client updated successfully!");
            onUpdated?.();
          },
        }
      ),
    isPending,
  };
}

/**
 * Attaches a contract to a client: ask our API for a presigned S3 PUT, then PUT
 * the bytes straight to S3.
 *
 * The headers on leg 2 are the ones pg-dashboard sends (getUploadHeaders with the
 * gid from leg 1's metaData); without them S3 rejects the PUT it was presigned
 * for. Leg 1's presigned URL is keyed by the file's own name, which is why it is
 * read out of the response by that name rather than from a fixed field.
 */
export function useClientContractUpload(midOverride?: string): {
  uploadContract: (args: { clientId: string; rowMid?: string; file: File }) => void;
  isPending: boolean;
} {
  const { mid: pathMid } = useClientPathMid();
  const mid = midOverride || pathMid;

  const { mutate: presign, isPending: isPresigning } = usePut<
    ClientContractPresignResponse,
    {
      dynamicUrl: string;
      reqBody: { merchantDocument: ClientContractDocument; merchantId: string };
    }
  >("");

  const { mutate: uploadToS3, isPending: isUploading } = usePut<
    void,
    { dynamicUrl: string; customHeaders: Record<string, string>; reqBody: File }
  >("", { invalidateQueries: [CLIENTS_KEY, CLIENT_KEY] });

  return {
    uploadContract: ({ clientId, rowMid, file }) => {
      const extension = file.name.includes(".") ? (file.name.split(".").pop() ?? "") : "";
      const merchantId = rowMid || mid;

      presign(
        {
          dynamicUrl: clientContractUploadApi(merchantId, clientId),
          reqBody: {
            merchantDocument: {
              // Fixed by the contract, not a v2 choice.
              merchantDocType: "MCA_CLIENT_ATTRIBUTES",
              name: file.name,
              fileExtension: `.${extension}`,
            },
            merchantId,
          },
        },
        {
          onSuccess: (res) => {
            const presignedUrl = res?.data?.[file.name];
            const gid = res?.data?.metaData?.gid;

            if (typeof presignedUrl !== "string" || !gid) {
              toast.error("Failed to get presigned URL for contract upload.");
              return;
            }

            uploadToS3(
              {
                dynamicUrl: presignedUrl,
                // The exact header set pg-dashboard signs this PUT with — shared
                // with the invoice upload rather than rewritten here, because S3
                // rejects a PUT whose metadata headers don't match the ones the
                // URL was presigned for, and the names are case-sensitive and
                // easy to get subtly wrong. merchantId is deliberately absent:
                // production passes "" for a client contract (getUploadHeaders
                // omits the header when it's empty), and maxSize is "5", not the
                // default 10.
                customHeaders: buildS3Headers({
                  fileExtension: extension,
                  merchantId: "",
                  gid,
                  maxSize: "5",
                }),
                reqBody: file,
              },
              {
                onSuccess: () => toast.success("Contract uploaded."),
                onError: (error: Error) =>
                  toast.error(`Client saved, but contract upload failed: ${error.message}`),
              }
            );
          },
          onError: (error: Error) => toast.error(error.message || "Failed to upload contract."),
        }
      );
    },
    isPending: isPresigning || isUploading,
  };
}

/** PUT .../delete-contract. No body. */
export function useClientContractDelete(): {
  deleteContract: (args: { clientId: string; rowMid?: string }) => void;
  isPending: boolean;
} {
  const { mid } = useClientPathMid();

  const { mutate, isPending } = usePut<unknown, { dynamicUrl: string }>("", {
    invalidateQueries: [CLIENTS_KEY, CLIENT_KEY],
    onError: (error: Error) => toast.error(error.message || "Failed to remove contract."),
  });

  return {
    deleteContract: ({ clientId, rowMid }) =>
      mutate({ dynamicUrl: clientContractDeleteApi(rowMid || mid, clientId) }),
    isPending,
  };
}

/**
 * Opens a stored contract. A POST returning a presigned GET, so the URL is
 * fetched at the moment of the click and never held: a presigned link has a
 * lifetime, and one obtained on mount would be expired by the time it is used.
 */
export function useClientContractView(): {
  viewContract: (args: { clientId: string; rowMid?: string }) => void;
  isPending: boolean;
} {
  const { mid } = useClientPathMid();

  const { mutate, isPending } = usePost<ClientContractViewResponse, { dynamicUrl: string }>("", {
    invalidateQueries: false,
    onError: (error: Error) => toast.error(error.message || "Failed to open contract."),
  });

  return {
    viewContract: ({ clientId, rowMid }) =>
      mutate(
        { dynamicUrl: clientContractViewApi(rowMid || mid, clientId) },
        {
          onSuccess: (res) => {
            const url = res?.data?.url;
            if (!url) {
              toast.error("Failed to open contract.");
              return;
            }
            window.open(url, "_blank", "noopener,noreferrer");
          },
        }
      ),
    isPending,
  };
}

// ── Client invoice ledger ───────────────────────────────────────────────────

/** Rows per page in the ledger. pg-dashboard's own `pageLimit: 5`. */
const LEDGER_PAGE_LIMIT = 5;

const LEDGER_KEY = ["client-invoices"];

interface ClientInvoicesArgs {
  clientId: string | null;
  /** Statuses to narrow to. Empty means every status. */
  statuses: string[];
  page: number;
}

/**
 * One client's invoices.
 *
 * The client link here is a real filter, not a name match: the invoice search
 * takes `fieldSearch.clientId`, which pg-dashboard's own ledger sends. That is
 * why this list is exact where the transactions section next to it can only
 * approximate — a transaction carries no client id, an invoice does.
 *
 * pg-dashboard forces `searchFilterType: "FILTER_TYPE"` on this body regardless
 * of what its builder derived, so that is reproduced rather than tidied away.
 */
export function useClientInvoices({ clientId, statuses, page }: ClientInvoicesArgs): {
  invoices: ClientInvoice[];
  totalCount: number;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => void;
} {
  const { mid, midFilter, isReady } = useClientPathMid();
  const enabled = isReady && !!clientId;

  const body = useMemo<TableReqBody>(() => {
    const fieldSearch: Record<string, string | string[]> = {
      clientId: [clientId ?? ""],
    };
    if (midFilter) fieldSearch.mid = midFilter.value;
    if (statuses.length) fieldSearch.status = statuses;

    return {
      pageLimit: LEDGER_PAGE_LIMIT,
      from: (page - 1) * LEDGER_PAGE_LIMIT,
      // Verbatim from pg-dashboard's ClientInvoicesTable, which overrides
      // whatever its builder derived with this constant.
      searchFilterType: "FILTER_TYPE",
      fieldSearch,
    };
  }, [clientId, midFilter, statuses, page]);

  const { data, isPending, isFetching, refetch } = usePostQuery<
    ClientInvoicesResponse,
    TableReqBody
  >(
    [...LEDGER_KEY, mid, clientId ?? ""],
    clientInvoiceSearchApi(mid),
    body,
    { staleTime: 0 },
    enabled
  );

  return {
    invoices: data?.data?.data ?? [],
    totalCount: data?.data?.totalCount ?? 0,
    isLoading: enabled && isPending,
    isFetching,
    refetch: () => void refetch(),
  };
}

/** Duplicate, delete and download for one invoice row. Each addresses the
 *  invoice by its own `mid`, as pg-dashboard's row actions do. */
export function useInvoiceRowActions(): {
  duplicateInvoice: (invoice: ClientInvoice) => void;
  deleteInvoice: (invoice: ClientInvoice) => void;
  downloadInvoice: (invoice: ClientInvoice) => void;
} {
  const { mutate: duplicate } = usePost<unknown, { dynamicUrl: string }>("", {
    invalidateQueries: [LEDGER_KEY],
    onError: (error: Error) => toast.error(error.message || "Failed to duplicate invoice."),
  });

  const { mutate: remove } = useDelete<unknown, { dynamicUrl: string }>("", {
    invalidateQueries: [LEDGER_KEY],
    onError: (error: Error) => toast.error(error.message || "Failed to delete invoice."),
  });

  // Presigned GET fetched at the moment of the click, never held: the link has a
  // lifetime, so one obtained earlier would already be expired.
  const { mutate: view } = usePost<InvoiceViewResponse, { dynamicUrl: string }>("", {
    invalidateQueries: false,
    onError: (error: Error) => toast.error(error.message || "Failed to open invoice."),
  });

  return {
    duplicateInvoice: (invoice) =>
      duplicate(
        { dynamicUrl: invoiceDuplicateApi(invoice.mid, invoice.id) },
        {
          onSuccess: () =>
            toast.success(`Invoice ${invoice.invoiceNumber} duplicated successfully`),
        }
      ),
    deleteInvoice: (invoice) =>
      remove(
        { dynamicUrl: invoiceDeleteApi(invoice.mid, invoice.id) },
        {
          onSuccess: () => toast.success(`Invoice ${invoice.invoiceNumber} deleted successfully`),
        }
      ),
    downloadInvoice: (invoice) =>
      view(
        { dynamicUrl: invoiceViewApi(invoice.mid, invoice.id) },
        {
          onSuccess: (res) => {
            const url = res?.data?.url;
            if (!url) {
              toast.error("Failed to open invoice.");
              return;
            }
            window.open(url, "_blank", "noopener,noreferrer");
          },
        }
      ),
  };
}

// ── Zoho ────────────────────────────────────────────────────────────────────

/**
 * Whether this merchant has a connected Zoho account, and the pull-sync that
 * imports clients from it.
 *
 * Gated on `status === "CONNECTED"` rather than the response's own `connected`
 * boolean, because that is what pg-dashboard checks — the two could disagree and
 * production's answer is the one that matters.
 */
export function useZohoClientSync(): {
  isConnected: boolean;
  isSyncing: boolean;
  syncClients: (mid?: string) => void;
} {
  const { mid, isReady } = useClientPathMid();

  const { data, refetch: refetchStatus } = useGet<ZohoStatusResponse>(
    ["zoho-status", mid],
    zohoStatusApi(mid),
    { enabled: isReady }
  );

  const { mutate, isPending } = usePost<unknown, ZohoPullSyncPayload & { dynamicUrl: string }>("", {
    invalidateQueries: [CLIENTS_KEY, CLIENT_KEY],
    onError: (error: Error) => toast.error(error.message || "Sync failed"),
  });

  return {
    isConnected: data?.data?.status === "CONNECTED",
    isSyncing: isPending,
    syncClients: (syncMid) =>
      mutate(
        {
          dynamicUrl: zohoPullSyncApi(syncMid || mid),
          // Clients only. The same call can pull invoices, and the client list
          // deliberately doesn't ask it to.
          isClientSync: true,
          isInvoiceSync: false,
        },
        {
          onSuccess: () => {
            void refetchStatus();
            toast.success("Sync completed successfully");
          },
        }
      ),
  };
}
