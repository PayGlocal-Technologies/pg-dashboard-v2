import { parseApiDateTime } from "@/lib/utils/format";
import type { Client } from "@/features/dashboard/client-management/types";
import type { McaTransaction } from "@/features/dashboard/mca-transactions/types";

/**
 * Placeholder client book for the Client Management page. There is no client
 * endpoint wired up in v2 yet, so this module stands in for one — the same
 * arrangement as the SKU catalogue (sku-management/mock-data.ts) and the
 * Transactions page's settlement analytics. Wiring the backend up should mean
 * replacing this source with a query returning the same `Client[]` shape, not
 * touching the table.
 *
 * Every field is a literal, never a `Math.random()`/`Date.now()` draw: random
 * or clock-derived values differ between the server and client renders (a
 * hydration mismatch) and change on every re-render, which is exactly what
 * CLAUDE.md's purity rule forbids.
 *
 * The rows deliberately spread across the axes the table has to survive: a
 * dozen countries so the Country filter has something to narrow, several
 * currencies, business names both short and long enough to test the column's
 * width, and creation dates spanning two years so a date range excludes some
 * rows rather than all or none.
 *
 * A client carries no invoice counts and no received total of its own. Both
 * are derived from the transactions below (see clientInvoiceMetrics and
 * clientTotalReceived), so a client's figures can never disagree with the
 * transactions the details view lists underneath them.
 *
 * Every client is international. This is the merchant's cross-border client
 * book — the counterparties who remit *to* them — so a domestic Indian client
 * has no place in it, and none is listed here.
 */
export const MOCK_CLIENTS: Client[] = [
  {
    id: "cli-001",
    businessName: "Northwind Trading Co.",
    primaryContactName: "Amelia Hartley",
    email: "amelia.hartley@northwindtrading.co.uk",
    phoneDialCode: "+44",
    phoneNumber: "7911123456",
    billingAddress: "Unit 7, Chancery House, 53-64 Chancery Lane, London WC2A 1QS, United Kingdom",
    countryIso2: "GB",
    countryName: "United Kingdom",
    currency: "GBP",
    createdAt: "2024-11-04T09:20:00Z",
  },
  {
    id: "cli-002",
    businessName: "Meridian Logistics LLC",
    primaryContactName: "Daniel Okafor",
    email: "d.okafor@meridianlogistics.com",
    phoneDialCode: "+1",
    phoneNumber: "4155550142",
    billingAddress: "5 Penn Plaza, 14th Floor, New York, NY 10001, United States",
    countryIso2: "US",
    countryName: "United States",
    currency: "USD",
    createdAt: "2024-08-19T14:05:00Z",
  },
  {
    id: "cli-003",
    businessName: "Kessler Maschinenbau GmbH",
    primaryContactName: "Lena Fischer",
    email: "l.fischer@kessler-maschinenbau.de",
    phoneDialCode: "+49",
    phoneNumber: "15112345678",
    billingAddress: "Industriestraße 42, 70565 Stuttgart, Germany",
    countryIso2: "DE",
    countryName: "Germany",
    currency: "EUR",
    createdAt: "2025-02-27T11:45:00Z",
  },
  {
    id: "cli-005",
    businessName: "Harbourline Freight Pte Ltd",
    primaryContactName: "Wei Ling Tan",
    email: "weiling.tan@harbourline.sg",
    phoneDialCode: "+65",
    phoneNumber: "81234567",
    billingAddress: "12 Marina View, #21-01 Asia Square Tower 2, Singapore 018961",
    countryIso2: "SG",
    countryName: "Singapore",
    currency: "SGD",
    createdAt: "2025-06-03T02:10:00Z",
  },
  {
    id: "cli-006",
    businessName: "Bluegum Interiors",
    primaryContactName: "Chloe Barrett",
    email: "chloe@blueguminteriors.com.au",
    phoneDialCode: "+61",
    phoneNumber: "412345678",
    billingAddress: "Level 3, 88 Cambridge Street, Collingwood VIC 3066, Australia",
    countryIso2: "AU",
    countryName: "Australia",
    currency: "AUD",
    createdAt: "2025-01-16T22:40:00Z",
  },
  {
    id: "cli-007",
    businessName: "Al Noor General Trading",
    primaryContactName: "Fatima Al Zaabi",
    email: "fatima.alzaabi@alnoortrading.ae",
    phoneDialCode: "+971",
    phoneNumber: "501234567",
    billingAddress:
      "Office 1204, Burj Al Salam Tower, Sheikh Zayed Road, Dubai, United Arab Emirates",
    countryIso2: "AE",
    countryName: "United Arab Emirates",
    currency: "AED",
    createdAt: "2024-09-30T08:15:00Z",
  },
  {
    id: "cli-008",
    businessName: "Maple & Birch Studio",
    primaryContactName: "Owen Tremblay",
    email: "owen.tremblay@mapleandbirch.ca",
    phoneDialCode: "+1",
    phoneNumber: "6135550188",
    billingAddress: "220 Laurier Avenue West, Suite 900, Ottawa, ON K1P 5Z9, Canada",
    countryIso2: "CA",
    countryName: "Canada",
    currency: "CAD",
    createdAt: "2025-04-08T17:55:00Z",
  },
  {
    id: "cli-009",
    businessName: "Atelier Rousseau SARL",
    primaryContactName: "Camille Rousseau",
    email: "camille@atelier-rousseau.fr",
    phoneDialCode: "+33",
    phoneNumber: "612345678",
    billingAddress: "18 Rue du Faubourg Saint-Honoré, 75008 Paris, France",
    countryIso2: "FR",
    countryName: "France",
    currency: "EUR",
    createdAt: "2024-07-22T13:25:00Z",
  },
  {
    id: "cli-010",
    businessName: "Kiyomizu Craft KK",
    primaryContactName: "Haruto Nakamura",
    email: "h.nakamura@kiyomizucraft.jp",
    phoneDialCode: "+81",
    phoneNumber: "9012345678",
    billingAddress: "3-15 Higashiyama-ku, Kiyomizu, Kyoto 605-0862, Japan",
    countryIso2: "JP",
    countryName: "Japan",
    currency: "USD",
    createdAt: "2025-05-29T04:00:00Z",
  },
  {
    id: "cli-011",
    businessName: "Vaalpark Agri Holdings",
    primaryContactName: "Thandiwe Mokoena",
    email: "thandiwe.mokoena@vaalparkagri.co.za",
    phoneDialCode: "+27",
    phoneNumber: "821234567",
    billingAddress: "14 Rossouw Street, Vaalpark, Sasolburg 1947, South Africa",
    countryIso2: "ZA",
    countryName: "South Africa",
    currency: "USD",
    createdAt: "2024-12-11T10:35:00Z",
  },
  {
    id: "cli-012",
    businessName: "Costa Verde Alimentos Ltda",
    primaryContactName: "Beatriz Almeida",
    email: "beatriz.almeida@costaverdealimentos.br",
    phoneDialCode: "+55",
    phoneNumber: "11987654321",
    billingAddress: "Av. Paulista 1374, 8º andar, Bela Vista, São Paulo 01310-100, Brazil",
    countryIso2: "BR",
    countryName: "Brazil",
    currency: "USD",
    createdAt: "2025-03-19T19:05:00Z",
  },
  {
    id: "cli-013",
    businessName: "Lindqvist Design AB",
    primaryContactName: "Erik Lindqvist",
    email: "erik@lindqvistdesign.se",
    phoneDialCode: "+46",
    phoneNumber: "701234567",
    billingAddress: "Sveavägen 44, 111 34 Stockholm, Sweden",
    countryIso2: "SE",
    countryName: "Sweden",
    currency: "EUR",
    createdAt: "2025-07-24T07:50:00Z",
  },
  {
    id: "cli-014",
    businessName: "Te Awa Organics",
    primaryContactName: "Māia Rangi",
    email: "maia.rangi@teawaorganics.nz",
    phoneDialCode: "+64",
    phoneNumber: "211234567",
    billingAddress: "27 Te Awa Road, Havelock North, Hastings 4130, New Zealand",
    countryIso2: "NZ",
    countryName: "New Zealand",
    currency: "AUD",
    createdAt: "2024-10-07T21:15:00Z",
  },
  {
    id: "cli-016",
    businessName: "Pemberton & Hale Advisory",
    primaryContactName: "Julian Hale",
    email: "julian.hale@pembertonhale.co.uk",
    phoneDialCode: "+44",
    phoneNumber: "7700900321",
    billingAddress: "Sixth Floor, 30 St Mary Axe, London EC3A 8BF, United Kingdom",
    countryIso2: "GB",
    countryName: "United Kingdom",
    currency: "GBP",
    createdAt: "2024-06-14T15:30:00Z",
  },
  {
    id: "cli-017",
    businessName: "Solaris Renewables Inc.",
    primaryContactName: "Marcus Whitfield",
    email: "m.whitfield@solarisrenewables.com",
    phoneDialCode: "+1",
    phoneNumber: "2125550176",
    billingAddress: "1201 Market Street, Suite 2100, Philadelphia, PA 19107, United States",
    countryIso2: "US",
    countryName: "United States",
    currency: "USD",
    createdAt: "2025-09-11T12:00:00Z",
  },
  {
    id: "cli-018",
    businessName: "Van Doorn Handelsmaatschappij",
    primaryContactName: "Sanne van Doorn",
    email: "sanne@vandoornhandel.nl",
    phoneDialCode: "+31",
    phoneNumber: "612345678",
    billingAddress: "Keizersgracht 241, 1016 EA Amsterdam, Netherlands",
    countryIso2: "NL",
    countryName: "Netherlands",
    currency: "EUR",
    createdAt: "2025-10-28T09:10:00Z",
  },
];

/**
 * The transactions the Client Details view lists for a client, standing in for
 * the same `McaTransaction[]` the Transactions page fetches from
 * mcaTxnSearchApi. Shaped as real MCA transactions (not a client-specific
 * type) precisely so the details view can render them through the Transactions
 * page's own columns and card list without a translation layer — see
 * ClientTransactionsSection.
 *
 * A client's transactions are keyed by `partnerCustomerFullName`: the client's
 * business is the remitter on the transactions it settles, so filtering by
 * business name is what ties the two together (see clientTransactions below).
 * Once a real endpoint exists, that filter becomes a query parameter and this
 * module goes away; nothing else about the section changes.
 */
/**
 * The three settlement states a client's transaction can be in, and the raw
 * `externalStatus` each one is sent as. Named for what the Settlement Status
 * column actually renders, since that is the contract being pinned here: these
 * three values map, through the Transactions page's own MCA_STATUS_META, onto
 * exactly "Invoice Pending", "Sent for Review", and "Settled" — no fourth
 * badge, and no new status vocabulary of this feature's own.
 */
const SETTLEMENT_STATE = {
  invoicePending: "DOCUMENT_PENDING",
  sentForReview: "SENT_FOR_REVIEW",
  settled: "SETTLED",
} as const;

type SettlementState = keyof typeof SETTLEMENT_STATE;

interface ClientTransactionSeed {
  clientId: string;
  amount: string;
  state: SettlementState;
  /** "DD/MM/YYYY HH:mm:ss", the shape the transactions API sends and
   *  parseApiDateTime expects. */
  createdAt: string;
  /** ISO 8601, the shape the API sends settlement dates in. Only ever set on a
   *  "settled" seed — see the invariant enforced when the rows are built. */
  settlementDate?: string;
}

// Deliberately uneven: the first few clients carry enough transactions to page
// through, several carry a handful, and two (cli-013, cli-014) carry none at
// all, so the section's empty state — and the table's own em-dash for a client
// who has received nothing yet — are both reachable from the UI rather than
// only in theory. Every row is one of the three states above and nothing else.
//
// Every client's invoice counts and received total are read off these seeds,
// so this list is now the single description of a client's billing history:
// adding a settled seed here is what moves that client's Total received and
// Paid invoices figures, and there is nowhere else to change them.
const CLIENT_TRANSACTION_SEEDS: ClientTransactionSeed[] = [
  {
    clientId: "cli-001",
    amount: "18400.00",
    state: "settled",
    createdAt: "12/06/2026 09:14:22",
    settlementDate: "2026-06-15T10:02:11Z",
  },
  {
    clientId: "cli-001",
    amount: "9250.50",
    state: "invoicePending",
    createdAt: "28/06/2026 14:41:05",
  },
  {
    clientId: "cli-001",
    amount: "12600.00",
    state: "sentForReview",
    createdAt: "03/07/2026 11:27:48",
  },
  {
    clientId: "cli-001",
    amount: "7999.99",
    state: "settled",
    createdAt: "19/05/2026 16:03:37",
    settlementDate: "2026-05-22T08:45:00Z",
  },
  {
    clientId: "cli-001",
    amount: "4310.00",
    state: "sentForReview",
    createdAt: "21/07/2026 08:52:14",
  },
  {
    clientId: "cli-001",
    amount: "26750.00",
    state: "settled",
    createdAt: "04/04/2026 13:19:56",
    settlementDate: "2026-04-07T09:30:42Z",
  },

  {
    clientId: "cli-002",
    amount: "54200.00",
    state: "settled",
    createdAt: "02/07/2026 10:05:33",
    settlementDate: "2026-07-05T11:14:20Z",
  },
  {
    clientId: "cli-002",
    amount: "31890.75",
    state: "invoicePending",
    createdAt: "15/07/2026 17:22:09",
  },
  {
    clientId: "cli-002",
    amount: "22450.00",
    state: "sentForReview",
    createdAt: "09/07/2026 12:48:51",
  },
  {
    clientId: "cli-002",
    amount: "78300.00",
    state: "settled",
    createdAt: "11/06/2026 07:36:44",
    settlementDate: "2026-06-14T10:11:03Z",
  },
  {
    clientId: "cli-002",
    amount: "15720.40",
    state: "sentForReview",
    createdAt: "24/07/2026 15:09:27",
  },

  {
    clientId: "cli-003",
    amount: "8400.00",
    state: "settled",
    createdAt: "18/03/2026 09:41:12",
    settlementDate: "2026-03-21T08:20:00Z",
  },
  {
    clientId: "cli-003",
    amount: "13950.00",
    state: "settled",
    createdAt: "06/05/2026 11:58:03",
    settlementDate: "2026-05-09T14:37:19Z",
  },

  {
    clientId: "cli-005",
    amount: "11320.25",
    state: "settled",
    createdAt: "08/07/2026 04:22:18",
    settlementDate: "2026-07-11T05:03:55Z",
  },
  {
    clientId: "cli-005",
    amount: "6480.00",
    state: "sentForReview",
    createdAt: "20/07/2026 03:47:02",
  },

  {
    clientId: "cli-007",
    amount: "142600.00",
    state: "settled",
    createdAt: "26/06/2026 09:33:41",
    settlementDate: "2026-06-29T11:22:08Z",
  },
  {
    clientId: "cli-007",
    amount: "88900.00",
    state: "invoicePending",
    createdAt: "14/07/2026 12:56:17",
  },
  {
    clientId: "cli-007",
    amount: "54400.00",
    state: "sentForReview",
    createdAt: "01/07/2026 08:11:29",
  },

  {
    clientId: "cli-009",
    amount: "9640.00",
    state: "settled",
    createdAt: "13/06/2026 14:07:36",
    settlementDate: "2026-06-16T09:18:44Z",
  },
  {
    clientId: "cli-009",
    amount: "8320.00",
    state: "settled",
    createdAt: "29/04/2026 10:44:53",
    settlementDate: "2026-05-02T13:26:31Z",
  },

  {
    clientId: "cli-012",
    amount: "46200.00",
    state: "settled",
    createdAt: "07/07/2026 19:12:05",
    settlementDate: "2026-07-10T20:41:37Z",
  },
  {
    clientId: "cli-012",
    amount: "42225.60",
    state: "invoicePending",
    createdAt: "23/07/2026 18:35:49",
  },

  {
    clientId: "cli-017",
    amount: "486000.00",
    state: "settled",
    createdAt: "05/07/2026 12:26:14",
    settlementDate: "2026-07-08T13:52:29Z",
  },
  {
    clientId: "cli-017",
    amount: "312240.00",
    state: "sentForReview",
    createdAt: "18/07/2026 11:41:58",
  },
  {
    clientId: "cli-017",
    amount: "120000.00",
    state: "sentForReview",
    createdAt: "25/07/2026 09:04:33",
  },

  {
    clientId: "cli-006",
    amount: "7420.00",
    state: "settled",
    createdAt: "22/06/2026 23:18:40",
    settlementDate: "2026-06-25T22:04:12Z",
  },
  {
    clientId: "cli-006",
    amount: "3160.00",
    state: "settled",
    createdAt: "10/05/2026 21:52:07",
    settlementDate: "2026-05-13T20:31:55Z",
  },
  {
    clientId: "cli-006",
    amount: "2900.00",
    state: "invoicePending",
    createdAt: "27/07/2026 22:09:31",
  },

  {
    clientId: "cli-008",
    amount: "15380.00",
    state: "settled",
    createdAt: "16/06/2026 18:02:55",
    settlementDate: "2026-06-19T16:44:08Z",
  },
  {
    clientId: "cli-008",
    amount: "4115.25",
    state: "sentForReview",
    createdAt: "26/07/2026 17:31:12",
  },

  {
    clientId: "cli-010",
    amount: "28600.00",
    state: "settled",
    createdAt: "09/06/2026 05:14:26",
    settlementDate: "2026-06-12T04:37:50Z",
  },
  {
    clientId: "cli-010",
    amount: "19450.00",
    state: "settled",
    createdAt: "17/04/2026 03:48:19",
    settlementDate: "2026-04-20T05:12:33Z",
  },
  {
    clientId: "cli-010",
    amount: "11200.00",
    state: "settled",
    createdAt: "02/03/2026 06:25:44",
    settlementDate: "2026-03-05T04:59:17Z",
  },

  {
    clientId: "cli-011",
    amount: "34700.00",
    state: "settled",
    createdAt: "30/06/2026 11:36:58",
    settlementDate: "2026-07-03T10:18:24Z",
  },
  {
    clientId: "cli-011",
    amount: "28610.00",
    state: "invoicePending",
    createdAt: "22/07/2026 10:47:03",
  },

  {
    clientId: "cli-016",
    amount: "41250.00",
    state: "settled",
    createdAt: "12/07/2026 08:29:37",
    settlementDate: "2026-07-15T09:41:06Z",
  },
  {
    clientId: "cli-016",
    amount: "18900.00",
    state: "sentForReview",
    createdAt: "19/07/2026 14:16:22",
  },
  {
    clientId: "cli-016",
    amount: "14350.00",
    state: "invoicePending",
    createdAt: "28/07/2026 10:03:49",
  },

  {
    clientId: "cli-018",
    amount: "22400.00",
    state: "settled",
    createdAt: "24/06/2026 09:55:11",
    settlementDate: "2026-06-27T11:07:38Z",
  },
  {
    clientId: "cli-018",
    amount: "9375.90",
    state: "sentForReview",
    createdAt: "21/07/2026 13:42:05",
  },
];

/**
 * Placeholder merchant id. Never a real one: MIDs are treated as sensitive
 * (see CLAUDE.md), and this only ever surfaces in the partner-user Merchant ID
 * column, which mock data has no business populating with anything genuine.
 */
const MOCK_MERCHANT_ID = "MID_PLACEHOLDER";

/**
 * The FRM state each settlement state is sent with. Every one of these is
 * deliberately *not* "PENDING_MERCHANT_UPLOAD": getStatusMeta treats that value
 * as an override and renders "Action Required" whatever the externalStatus
 * says, which would put a fourth badge on this table. Keeping it out is what
 * guarantees an invoice-pending row actually reads "Invoice Pending".
 */
const SETTLEMENT_STATE_FRM: Record<SettlementState, McaTransaction["frmStatus"]> = {
  invoicePending: "NO_FRM",
  sentForReview: "REVIEW_IN_PROGRESS",
  settled: "APPROVED",
};

// Built at module scope, once, rather than per render: the seeds above are
// literals, and each transaction inherits its remitter identity (name,
// country) and currency straight from the client it belongs to, so a client's
// transactions can never disagree with the client row that opened them.
//
// Seeds whose client isn't in MOCK_CLIENTS are dropped rather than rendered
// against a blank remitter — that's what keeps a removed client's transactions
// out of the table by construction, instead of relying on every seed being
// deleted by hand alongside it.
export const MOCK_CLIENT_TRANSACTIONS: McaTransaction[] = CLIENT_TRANSACTION_SEEDS.flatMap(
  (seed, index) => {
    const client = MOCK_CLIENTS.find((c) => c.id === seed.clientId);
    if (!client) return [];
    return [
      {
        gid: `mcatxn_${String(index + 1).padStart(3, "0")}_${seed.clientId}`,
        merchantId: MOCK_MERCHANT_ID,
        amount: seed.amount,
        currency: client.currency,
        externalStatus: SETTLEMENT_STATE[seed.state],
        internalStatus: SETTLEMENT_STATE[seed.state],
        formattedCreationDateTime: seed.createdAt,
        // One instant for both: on a real record these differ by up to a
        // minute (the FFMS row is written just after the transaction), but the
        // table and the details header read the transaction field, so a
        // separate mock value here would only invent a discrepancy no surface
        // shows. Both are populated because both are required.
        formattedTransactionCreationDateTime: seed.createdAt,
        partnerCustomerFullName: client.businessName,
        // Null, not a masked variant: these are the merchant's own known
        // clients, so the table shows the business name in full (the Remitter
        // Name column falls back to partnerCustomerFullName when this is null).
        partnerMaskedCustomerFullName: null,
        partnerCustomerCountry: client.countryIso2,
        frmStatus: SETTLEMENT_STATE_FRM[seed.state],
        // Only a settled transaction carries one, whatever a seed says — a
        // settlement date on a pending row would contradict its own badge.
        settlementDate: seed.state === "settled" ? seed.settlementDate : undefined,
      },
    ];
  }
);

/**
 * A client's transactions, matched on business name exactly as the Client
 * Details view needs them: the client's business is the remitter, so its
 * transactions are the ones remitted in its name and no others. Newest first,
 * which is the order the Transactions page itself lists them in.
 */
export function clientTransactions(businessName: string): McaTransaction[] {
  return MOCK_CLIENT_TRANSACTIONS.filter(
    (txn) => txn.partnerCustomerFullName === businessName
  ).sort(
    (a, b) =>
      (parseApiDateTime(b.formattedCreationDateTime)?.getTime() ?? 0) -
      (parseApiDateTime(a.formattedCreationDateTime)?.getTime() ?? 0)
  );
}
