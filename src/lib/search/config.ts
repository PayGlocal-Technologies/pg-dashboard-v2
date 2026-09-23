import type { IconName } from "@/components/icon";
import type { NavContext } from "@/stores/useProductContext";
import { settlementListPath } from "@/features/dashboard/settlement-reports/routes";

/**
 * Everything hand-maintained about the header search lives in this file. The
 * search index itself is *derived* from the sidebar nav (see registry.ts) so a
 * new feature becomes searchable the moment it lands in navigation.ts; the
 * tables below only ever enrich or restrict entries that already survived the
 * sidebar's own permission and product filtering. Nothing here can surface a
 * page the user cannot reach.
 */

/**
 * Routes that actually have a page under src/app/(dashboard).
 *
 * navigation.ts still lists ~13 hrefs whose pages were never built in v2
 * (/configure, /payment-products, /invoice-links, /manage-mandates,
 * /invoice-download, /shipping-bill-regularisation, /key-management-system,
 * /scheduler, and the five partner routes). The
 * sidebar links to them anyway, but a *search result* that 404s reads as a
 * broken feature rather than an unfinished one, so search filters against this
 * list. Add a route here in the same commit you add its page.tsx.
 */
export const NAVIGABLE_ROUTES: ReadonlySet<string> = new Set([
  "/client-management",
  "/dashboard",
  // /dispute-management is deliberately absent, though the page exists and the
  // nav links to it from both the Payments and global-tenant trees. It still
  // renders MOCK_DISPUTE_ROWS, so a search result would promise a feature the
  // data does not yet back. Re-add it here (and its keywords below) once the
  // list is server-backed.
  "/ebrc",
  "/ebrc-generation",
  "/echo",
  "/edpms",
  "/irm-repository",
  "/mca-dashboard",
  "/mca-invoices",
  "/mca-links",
  "/mca-settlement-report",
  "/mca-transactions",
  "/multi-currency",
  "/my-queries",
  "/pa-dashboard",
  "/pa-transactions",
  "/payment-links",
  "/payment-button",
  "/platforms",
  "/mca-receipts",
  "/refer-and-earn",
  "/settlement-report",
  "/sku-management",
  "/team-management",
  // The live settings sub-pages. /settings itself only redirects, and the rest
  // of src/app/(dashboard)/settings (developer, notifications, payments) exists
  // on disk but is commented out of SETTINGS_NAV_GROUPS, so neither reaches the
  // registry to begin with.
  "/settings/personal",
  "/settings/business",
  "/settings/banking",
  "/settings/integrations",
]);

/**
 * Synonyms the labels don't literally contain, keyed by href. Only worth adding
 * where the label is genuinely not what a merchant would type — the matcher
 * already handles abbreviations and dropped letters of the label itself.
 */
export const SEARCH_KEYWORDS: Readonly<Record<string, string[]>> = {
  "/settings/banking": ["bank account", "settlement account", "payout", "beneficiary", "IFSC"],
  "/settings/business": ["legal entity", "GSTIN", "PAN", "merchant id", "MID"],
  "/settings/personal": ["profile", "change password", "email", "phone"],
  "/multi-currency": ["virtual account", "VBAN", "collection account", "USD", "EUR"],
  "/platforms": ["Upwork", "Toptal", "Freelancer", "Amazon", "marketplace", "connect"],
  "/ebrc": ["bank realisation certificate", "FIRC", "DGFT"],
  // The two children of the eBRC nav item. Their labels say "eBRC Status" and
  // "IRM Repository", but a merchant arrives wanting to *generate* one, and
  // "IRM" is the acronym — the spelled-out term is nowhere in either label.
  "/ebrc-generation": ["generate eBRC", "request ID", "DGFT ack", "acknowledgement", "IEC"],
  "/irm-repository": [
    "inward remittance message",
    "IRM",
    "remitter",
    "purpose code",
    "inward remittance",
  ],
  "/edpms": ["shipping bill", "regularise", "export data processing"],
  // The MCA tree labels this page "GST Invoices", so without "receipts" here a
  // merchant who types the word the route is named after finds nothing.
  "/mca-receipts": ["receipts", "GST invoice", "tax invoice", "invoice ID"],
  // Plurals earn their place: the matcher works forwards, so a trailing "s"
  // the singular label does not have makes the whole query fail. "invoices"
  // finds nothing against "Invoice Management" without this, and neither does
  // "clients" against "Client management".
  "/mca-invoices": ["invoices", "raise invoice", "billing"],
  // Both transaction tables are labelled just "Transactions" in the nav, so
  // "txn" and "payments" have nothing to match without these.
  "/mca-transactions": ["txn", "transaction ID", "GID", "payments", "settled"],
  "/pa-transactions": ["txn", "transaction ID", "GID", "payments", "orders"],
  "/mca-settlement-report": ["settlement", "UTR", "payout", "reports"],
  "/settlement-report": ["settlement", "UTR", "payout", "reports"],
  "/mca-links": ["payment link", "share link"],
  "/sku-management": ["product", "HSN", "SAC", "catalogue"],
  "/team-management": ["teams", "users", "roles", "invite", "permissions"],
  "/client-management": ["clients", "customers", "buyers", "payers"],
  // Reached from the Header's "Partners" tab, which is the word merchants
  // type — the page itself is called Refer & Earn.
  "/refer-and-earn": [
    "referral",
    "partners",
    "refer a merchant",
    "commission",
    "rewards",
    "invite a business",
  ],
  // Reached from the Header's Help menu, which is where merchants look for it —
  // so the words on that menu ("help", "support", "contact") have to resolve
  // here, and none of them is in the page's own name.
  "/my-queries": [
    "support",
    "help",
    "raise a ticket",
    "support ticket",
    "contact support",
    "complaint",
    "queries",
    "Freshdesk",
  ],
  // The header pill says "Ask Echo" and the sidebar row says "Echo"; neither
  // says "assistant", "AI" or "chat", which is what a merchant who has not met
  // the feature would type.
  "/echo": ["assistant", "AI", "chat", "ask Echo", "copilot", "agent"],
};

/**
 * Shown, in this order, when the input is empty — the "Popular searches" list.
 * Its job is to teach the feature by example, so it stays short and points at
 * the pages merchants open most. Paths absent from the user's registry are
 * skipped silently, so this list needs no per-context variants beyond the
 * transactions/settlements pair below.
 */
export function popularPaths(context: NavContext): readonly string[] {
  return [
    context === "PACB" ? "/mca-transactions" : "/pa-transactions",
    settlementListPath(context),
    "/mca-invoices",
    "/settings/personal",
  ];
}

export interface StandalonePage {
  label: string;
  path: string;
  icon: IconName;
  /**
   * Hidden from partner accounts. The Header renders its whole tab row behind
   * `!isPartnerUser`, so a page reached only from a tab is not reachable for
   * them and must not be offered.
   */
  hiddenForPartner?: boolean;
  /**
   * Only offered while the Header's active tab matches. A nav entry gets this
   * for free from `product` + filterNavigation; a standalone page has no tree
   * to be filtered by, so it declares its own.
   */
  context?: NavContext;
  /**
   * Checked with the same `checkPermissions` the sidebar uses, so a page whose
   * only entry point is permission-gated chrome (rather than a NavItem) stays
   * gated here too. `some` semantics, matching NavItem.permission.
   */
  permission?: string[];
}

/**
 * Destinations that exist outside every sidebar tree.
 *
 * Deriving the index from the nav is right, but the nav is not the only way
 * into the app: the Header carries its own tab row, its Help menu and its Echo
 * pill, and /refer-and-earn is reached from the "Partners" tab and the
 * sidebar's promo banner — never from a NavGroup. So the flatten could not see
 * any of them, and a merchant searching "referral" or "raise a ticket" got
 * nothing.
 *
 * Re-audited against every non-dynamic page. The remaining absences are all
 * correct and must stay that way: /settings/developer (+ api-keys, webhooks),
 * /settings/notifications and /settings/payments are commented out of
 * SETTINGS_NAV_GROUPS as OUT OF SCOPE, so search must not resurface what the
 * product deliberately hid; "/" and "/settings" only redirect;
 * /ebrc-generation/generate and /create-invoice are actions, not pages (see
 * ACTION_ENTRIES); and /mca-links is an existing nav orphan, also below.
 */
export const STANDALONE_PAGES: readonly StandalonePage[] = [
  {
    // The wording the sidebar banner uses. The header tab says "Partners",
    // which the keywords cover.
    label: "Refer & Earn",
    path: "/refer-and-earn",
    icon: "share-2",
    hiddenForPartner: true,
  },
  {
    // Reached only from the Header's Help menu, which used to open it as a
    // dialog and now navigates here (see HeaderHelpMenu). The Help button sits
    // outside the header's `!isPartnerUser` tab-row guard, so every account
    // type can reach this — no gate.
    label: "My queries",
    path: "/my-queries",
    // The Help button's own icon, so the row reads as the thing behind it.
    icon: "help-circle",
  },
  {
    // The full-page Echo transcript. Both entry points (the sidebar's Assistant
    // row and the header pill) toggle a side panel on a wide viewport and only
    // navigate here below `md` — but the page stands on its own at any width,
    // and it suppresses the panel while it is the route, so landing here from
    // search shows the conversation once rather than twice.
    //
    // Gated on the same permission useHasEcho reads: a merchant without Echo
    // has no server session to talk to, and both controls are hidden for them.
    label: "Echo",
    path: "/echo",
    icon: "echo-mark",
    permission: ["getEchoSessionHistory"],
  },
  {
    // A nav orphan since the MCA tree dropped its "Settlements" item (a
    // settlement's details now surface on the transaction itself). The page is
    // untouched and still the MCA context's settlement list — it is what
    // settlementListPath("PACB") returns, so both popularPaths and
    // lookupTargets point at it — and without this entry neither could resolve
    // it and MCA merchants lost the Settlements row from both.
    //
    // PACB-only: in the Payments and Home contexts the settlement list is
    // /settlement-report, which the nav carries itself.
    label: "Settlement Reports",
    path: "/mca-settlement-report",
    icon: "file-text",
    context: "PACB",
  },
];

export interface ActionEntry {
  label: string;
  /**
   * The page this action belongs to. Supplies the `in:` badge — taken from that
   * page's own registry label, so it follows whatever the nav calls it in the
   * current context — and gates the action: if the page is not in the user's
   * tree, neither is the action. That gate is why these need no entry in
   * NAVIGABLE_ROUTES.
   */
  parentPath: string;
  /**
   * Where selecting it goes: either a route of its own, or the parent page with
   * an `?action=` handoff that the page reads on arrival to open the same modal
   * its button opens (see useUrlAction).
   */
  path: string;
  icon: IconName;
  keywords?: string[];
  /**
   * A `merchantEnabledProducts.paymentProducts` entry the action needs. The
   * parent page can stay searchable (it explains the product when it is off),
   * but offering to create one of something the merchant cannot have would
   * land them on that explanation from a "Create" label.
   */
  requiresPaymentProduct?: string;
}

/**
 * Things you can *do*, as opposed to pages you can go to.
 *
 * These exist because the sidebar is not the whole surface. /create-invoice is
 * a route in its own group that no nav tree links to, so deriving the index
 * from the nav alone could never find it — a merchant searching "create
 * invoice" got nothing. The rest are the primary actions on pages the merchant
 * can already reach, which were previously only findable by navigating to the
 * page and spotting the button.
 *
 * Deliberately excluded: "Sync from Zoho" on Client management. Every other
 * entry here opens something and waits, but a sync fires a network mutation the
 * moment it runs, and a URL that silently mutates on arrival is a
 * bookmark-and-refresh hazard. Searching "zoho" still finds Integrations and
 * Client management through their keywords.
 */
export const ACTION_ENTRIES: readonly ActionEntry[] = [
  {
    label: "Create payment button",
    parentPath: "/payment-button",
    // Its own full-screen route, like Create invoice, so it is linked straight
    // into rather than handed off through ?action=.
    path: "/payment-button/create",
    icon: "plus",
    requiresPaymentProduct: "PAYMENT_BUTTONS",
    keywords: ["new payment button", "embed button", "pay now button"],
  },
  {
    label: "Create invoice",
    parentPath: "/mca-invoices",
    // Its own route, not an ?action= handoff. Safe to link straight into: the
    // editor renders its own MID picker when none is selected, which its
    // comments say exists for exactly this case — a pasted link or a bookmark.
    path: "/create-invoice",
    icon: "plus",
    keywords: ["new invoice", "raise invoice", "invoice editor", "bill a client"],
  },
  {
    label: "Add client",
    parentPath: "/client-management",
    path: "/client-management?action=add-client",
    icon: "user-plus",
    keywords: ["new client", "add customer", "add buyer"],
  },
  {
    label: "Add item",
    parentPath: "/sku-management",
    path: "/sku-management?action=add-item",
    icon: "plus",
    keywords: ["new SKU", "add product", "new item"],
  },
  {
    label: "Import items",
    parentPath: "/sku-management",
    path: "/sku-management?action=import",
    icon: "upload",
    keywords: ["bulk upload", "import SKU", "CSV upload", "spreadsheet"],
  },
  {
    label: "Add team member",
    parentPath: "/team-management",
    path: "/team-management?action=add-member",
    icon: "user-plus",
    keywords: ["invite user", "new member", "add user", "grant access"],
  },
  {
    // Currently inert, and deliberately kept: /mca-links has a page and a route
    // but no reachable sidebar entry, so the parent gate below never passes.
    // The only "MCA Links" item in navigation.ts is a child of Payment Products
    // in regularNavigation tagged product:"PACB" — but regularNavigation is the
    // tree for the *Payments* context, where activeProduct is "PA", and the
    // PACB context renders mcaNavigation, which has no MCA Links entry at all.
    // So the tag can never match the tree it sits in. This row starts working
    // the moment that nav gap is closed, and needs no change here.
    label: "Create link",
    parentPath: "/mca-links",
    path: "/mca-links?action=create",
    icon: "link",
    keywords: ["new link", "payment link", "collect payment"],
  },
  {
    label: "Forex calculator",
    parentPath: "/multi-currency",
    path: "/multi-currency?action=fx-calculator",
    icon: "circle-dollar-sign",
    keywords: ["FX", "forex", "exchange rate", "convert currency", "conversion"],
  },
  {
    // "Generate eBRC" on eBRC Status is a dropdown with two items; this is its
    // "Select Individual" branch, the multi-step wizard. Its own route rather
    // than an ?action= handoff, like Create invoice — and safe to link straight
    // into for the same reason: the wizard renders SelectMidView when no MID is
    // scoped instead of running against one nobody chose.
    //
    // The other branch, "Upload a CSV", is deliberately not here: it is a
    // dialog on the page, so it would need an ?action= handoff the page does
    // not have, and "generate eBRC" already lands the merchant a click away
    // from it.
    label: "Generate eBRC",
    parentPath: "/ebrc-generation",
    path: "/ebrc-generation/generate",
    icon: "list-checks",
    keywords: ["new eBRC", "raise eBRC", "select IRMs", "map shipping bill", "DGFT"],
  },
  {
    // The "Raise a ticket" tab on My queries. The page lands on "My tickets"
    // by design (a merchant raises once and returns to check), so a merchant
    // who came to *raise* one needs this row — see useUrlAction in
    // support-tickets/index.tsx.
    label: "Raise a ticket",
    parentPath: "/my-queries",
    path: "/my-queries?action=raise-ticket",
    icon: "plus",
    keywords: ["contact support", "new ticket", "report an issue", "complaint", "help"],
  },
];

export interface LookupTarget {
  /** Row label — the destination page, rendered as the `in: …` badge. */
  label: string;
  path: string;
  icon: IconName;
}

/**
 * Pages whose own search box can resolve a free-text term, in the order they
 * are offered as fallbacks. Each earns its place because the page itself
 * already declares that its search matches an identifier, via its
 * rotating-hint constant:
 *
 *   /mca-transactions, /pa-transactions  SEARCH_WORDS   -> "Transaction ID"
 *   /mca-invoices                        SEARCH_WORDS   -> "Invoice number"
 *   settlement reports                   inline words   -> "UTR", "Settlement date"
 *   /mca-receipts                        RECEIPT_SEARCH_HINTS -> "invoice ID"
 *   /mca-links                           inline words   -> "invoice number", "link"
 *
 * Deliberately excluded: /client-management (business name, contact name,
 * email), /sku-management (product name, HSN/SAC, description),
 * /team-management (name, username, email) and /payment-links (customer name,
 * payment-for). None of those resolves an identifier, so offering them would
 * be noise on every unmatched query.
 *
 * Also excluded, for a harder reason: /ebrc-generation and /irm-repository
 * both *do* search identifiers ("Request ID", "DGFT Ack ID", "IRM Number"),
 * but neither reads `?q=` off the URL — their search boxes seed from
 * `useState("")`, not from searchParams. A lookup row pointing there would
 * land the merchant on the page with an empty box and their query dropped,
 * which is worse than not offering the row. Add them here in the same change
 * that seeds their search from `searchParams.get("q")`, the way
 * McaTransactionTable and the rest do.
 *
 * A target is only ever offered if its path is in the user's filtered registry,
 * so permissions and product context gate these exactly as they gate pages.
 */
export function lookupTargets(context: NavContext): readonly LookupTarget[] {
  return [
    {
      label: "Transactions",
      path: context === "PACB" ? "/mca-transactions" : "/pa-transactions",
      icon: "repeat",
    },
    { label: "Invoice Management", path: "/mca-invoices", icon: "receipt" },
    { label: "Settlements", path: settlementListPath(context), icon: "file-text" },
    { label: "Receipts", path: "/mca-receipts", icon: "receipt" },
    { label: "MCA Links", path: "/mca-links", icon: "link" },
  ];
}

/**
 * There is deliberately no "does this look like an ID" test.
 *
 * An earlier version gated the lookup rows behind a regex, which meant picking
 * a shape for an identifier nobody could yet show us — there is no gid column
 * in this app, the mock data generates none, and the value only ever surfaces
 * in the details view's "Transaction ID" field. Every candidate rule was
 * either too loose (an 8-character token let the misspelling "setlment"
 * produce a full set of bogus rows above the real "Settlements" hit) or too
 * tight (a real ID that failed the rule left the merchant with an empty
 * dropdown and no way forward).
 *
 * The reference sidesteps the whole problem, and it is worth being precise
 * about how: a lookup row asserts nothing about the query. "sjdjhsd in:
 * Transactions" is not a claim that sjdjhsd is a transaction ID — it is a menu
 * item meaning "search Transactions for this". Once the row makes no claim,
 * there is nothing to detect. Unmatched queries simply fall back to the list
 * of places you can look something up, so the dropdown is never empty and
 * there are no false positives to tune. See resolveQuery.
 */

/** The query must reach this length before we search at all. */
export const MIN_QUERY_LENGTH = 2;

/** Most rows the dropdown will render, matching the reference. */
export const MAX_RESULTS = 6;
