"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { COUNTRIES } from "@/components/ui";
import { useDelete, useGet, usePost, usePostQuery, usePut } from "@/lib/api/hooks";
import { useResolvedMids } from "@/lib/hooks/useResolvedMids";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";
import { buildTxnRequestBody } from "@/lib/utils/buildTxnRequestBody";
import { mcaTxnSearchApi } from "@/features/dashboard/mca-transactions/services";
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
  CLIENT_TRANSACTIONS_PAGE_LIMIT,
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
import type {
  McaTransaction,
  McaTransactionsResponse,
} from "@/features/dashboard/mca-transactions/types";
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
  const { iso2: countryIso2, name: countryName } = resolveCountry(
    record.country ?? "",
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
    addressLine: record.address?.streetAddress1,
    addressLine2: record.address?.streetAddress2,
    city: record.address?.city,
    state: record.address?.state,
    zipcode: record.address?.zipcode,
    // The shipping address, kept so the edit form can round-trip it and so the
    // "same as billing" checkbox can be derived rather than guessed.
    shippingAddressLine: record.shippingAddress?.streetAddress1,
    shippingAddressLine2: record.shippingAddress?.streetAddress2,
    shippingCity: record.shippingAddress?.city,
    shippingState: record.shippingAddress?.state,
    shippingZipcode: record.shippingAddress?.zipcode,
    shippingCountryName: record.shippingAddress?.country,
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
 * Form values → create/update body, field-for-field from pg-dashboard's submit
 * handler (AddClientForm).
 *
 * Both of pg-dashboard's mirroring checkboxes are honoured: ticked "same as
 * billing address" sends `shippingAddress` as a copy of `address`, and ticked
 * "same as business name" sends `name` as a copy of `businessName`. Unticked,
 * each sends what its own fields collected.
 */
export function toClientApiPayload(
  values: ClientFormValues,
  mid: string,
  countryNameFor: (iso2: string) => string
): ClientMutationPayload {
  const countryName = countryNameFor(values.country);

  const address: ClientApiAddress = {
    streetAddress1: values.addressLine.trim(),
    streetAddress2: values.addressLine2.trim(),
    city: values.city.trim(),
    state: values.state.trim(),
    country: countryName,
    zipcode: values.zipcode.trim(),
  };

  // Ticked "same as billing" sends a copy of the billing address, which is
  // exactly what pg-dashboard does behind its own checkbox. Unticked sends what
  // the shipping fields collected.
  const shippingAddress: ClientApiAddress = values.sameAsBillingAddress
    ? address
    : {
        streetAddress1: values.shippingAddressLine.trim(),
        streetAddress2: values.shippingAddressLine2.trim(),
        city: values.shippingCity.trim(),
        state: values.shippingState.trim(),
        country: countryNameFor(values.shippingCountry) || countryName,
        zipcode: values.shippingZipcode.trim(),
      };

  // Ticked "same as business name" sends the business name as the contact name,
  // the other half of pg-dashboard's pair of mirroring checkboxes.
  const contactName = values.sameAsBusinessName
    ? values.businessName.trim()
    : values.primaryContactName.trim();

  return {
    mid,
    gstIn: values.gstin.trim(),
    businessName: values.businessName.trim(),
    name: contactName || values.businessName.trim(),
    email: values.primaryContactEmail.trim(),
    // Recombined into the single string the API stores, which is also the shape
    // the merchant would have typed into pg-dashboard's one phone field.
    number: `${dialCodeOf(values.phoneCountry)}${values.phoneNumber.replace(/\D/g, "")}`,
    address,
    shippingAddress,
    ...(values.website.trim() ? { websiteLink: values.website.trim() } : {}),
    ...(values.notes.trim() ? { notes: values.notes.trim() } : {}),
    ...(values.tags.length ? { tags: values.tags } : {}),
    ...(values.businessType.trim() ? { type: values.businessType.trim() } : {}),
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

    for (const [key, value] of Object.entries(raw ?? {})) {
      if (isIso2(key) && !isIso2(value)) {
        // code → name
        iso2ToName[key.toUpperCase()] = value;
        nameToIso2[value] = key.toUpperCase();
      } else if (isIso2(value)) {
        // name → code, which is how pg-dashboard's own client list reads it
        nameToIso2[key] = value.toUpperCase();
        iso2ToName[value.toUpperCase()] = key;
      }
    }

    return { iso2ToName, nameToIso2 };
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
export function useClientTagOptions(): { tags: string[]; isLoading: boolean } {
  const { mid, isReady } = useClientPathMid();

  const { data, isPending } = useGet<ClientTagOptionsResponse>(
    ["client-tag-options", mid],
    clientTagOptionsApi(mid),
    { enabled: isReady }
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
  /** The email chip, which the builder routes to an exact-match rather than a
   *  full-text query — the same treatment pg-dashboard gives an email. */
  email: string;
  /** ISO2 codes from the country chip. Converted to names for the request. */
  countryIso2s: string[];
  startTime?: number;
  endTime?: number;
  /** 1-based page, as the table holds it. */
  page: number;
}

export function useClients({
  search,
  email,
  countryIso2s,
  startTime,
  endTime,
  page,
}: ClientsArgs): {
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
  const body = useMemo<TableReqBody>(() => {
    const built = buildTxnRequestBody(
      {
        // The ISO2 codes as the chip holds them, because that is what the record's
        // own `country` field contains. This previously converted them to display
        // names before sending, which is why the country chip matched nothing: it
        // was filtering "New Zealand" against a column holding "NZ".
        country: countryIso2s,
        startTime,
        endTime,
      },
      {
        // Only the search box feeds the full-text query. The email chip is its own
        // field filter below — the two are separate controls, so folding both into
        // one queryString would mean whichever was set last silently replaced the
        // other.
        searchQuery: search || undefined,
        // The key is `mid`, not `merchantId`: midFilter names itself merchantId
        // because that is what the OpenSearch txn endpoints want, while the client
        // search wants `mid`. Only the values carry over.
        selectedMid: midFilter ? { key: "mid", value: midFilter.value } : undefined,
        pageLimit: CLIENT_PAGE_LIMIT,
        from: (page - 1) * CLIENT_PAGE_LIMIT,
      }
    );

    // The email chip filters on the record's own `email` field rather than going
    // through the builder's email path, which routes to `encEmailId` — an
    // encrypted-id field belonging to the transaction search, not this one. That
    // mismatch is why the chip returned nothing. The key follows the same
    // convention as every other fieldSearch key here: the record's field name.
    const withEmail = email
      ? {
          ...built,
          fieldSearch: { ...(built.fieldSearch ?? {}), email: [email] },
        }
      : built;

    // With nothing but the MID filter, the derived type would be FILTER_TYPE, but
    // pg-dashboard's client list explicitly sends DEFAULT for exactly this case
    // (see the effect in mca-clients/index.tsx) and only lets the derived type
    // through once a real filter is applied. Reproduced rather than tidied away:
    // which one the backend wants is its business, not ours.
    const hasUserFilter = !!(search || email || countryIso2s.length || startTime || endTime);
    if (!hasUserFilter) return { ...withEmail, searchFilterType: "DEFAULT" };

    // An email filter is a field filter, so the type has to say so — the builder
    // derived its type before the key was added.
    return email && withEmail.searchFilterType === "DEFAULT"
      ? { ...withEmail, searchFilterType: "FILTER_TYPE" }
      : withEmail;
  }, [search, email, countryIso2s, startTime, endTime, midFilter, page]);

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

/**
 * The transactions remitted by one client, for the details view's transactions
 * section.
 *
 * There is no client id on a transaction and no pg-dashboard call site that
 * filters the transaction search by client, so the link is the client's business
 * name matched as a full-text query — which is a shape the search genuinely
 * supports, since "Customer name" is one of the things the Transactions page's own
 * search box matches. Because that is a full-text match, the rows are then
 * narrowed to an exact `partnerCustomerFullName` equality, so a client whose name
 * is a substring of another's cannot pull in the other's transactions. The
 * consequence to know: `totalCount` describes the server's looser match, so it can
 * exceed the rows shown.
 */
export function useClientTransactions(
  businessName: string | undefined,
  page: number
): { transactions: McaTransaction[]; totalCount: number; isLoading: boolean } {
  const { urlMid, midFilter, isReady } = useResolvedMids("PACB");
  const enabled = isReady && !!businessName;

  const body = useMemo<TableReqBody>(
    () =>
      buildTxnRequestBody(
        {},
        {
          searchQuery: businessName || undefined,
          selectedMid: midFilter ? { key: midFilter.key, value: midFilter.value } : undefined,
          pageLimit: CLIENT_TRANSACTIONS_PAGE_LIMIT,
          from: (page - 1) * CLIENT_TRANSACTIONS_PAGE_LIMIT,
        }
      ),
    [businessName, midFilter, page]
  );

  const { data, isPending } = usePostQuery<McaTransactionsResponse, TableReqBody>(
    ["client-transactions", urlMid, businessName ?? ""],
    mcaTxnSearchApi(urlMid),
    body,
    { staleTime: 0 },
    enabled
  );

  const transactions = useMemo(
    () => (data?.data?.data ?? []).filter((txn) => txn.partnerCustomerFullName === businessName),
    [data, businessName]
  );

  return {
    transactions,
    totalCount: data?.data?.totalCount ?? 0,
    isLoading: enabled && isPending,
  };
}

// ── Writes ──────────────────────────────────────────────────────────────────
// Every mutation invalidates the client list rather than calling refetch with a
// remembered body, which is how pg-dashboard threads `refetch(reqBody)` through
// its modals. Invalidation is equivalent and cannot go stale against a body the
// table has since changed.

const CLIENTS_KEY = ["clients"];

/** POST .../create. Resolves with the new client's id, which the contract upload
 *  needs — a contract can only be attached to a client that exists. */
export function useCreateClient(): {
  createClient: (payload: ClientMutationPayload, onCreated?: (clientId: string) => void) => void;
  isPending: boolean;
} {
  const { mid } = useClientPathMid();

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
      invalidateQueries: [CLIENTS_KEY],
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
export function useClientContractUpload(): {
  uploadContract: (args: { clientId: string; rowMid?: string; file: File }) => void;
  isPending: boolean;
} {
  const { mid } = useClientPathMid();

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
  >("", { invalidateQueries: [CLIENTS_KEY] });

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
    invalidateQueries: [CLIENTS_KEY],
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
    invalidateQueries: [CLIENTS_KEY],
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
