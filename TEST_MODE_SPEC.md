# Test Mode for pg-dashboard-v2

Status: proposal. Owner: dashboard frontend. Reviewers needed from: GCC backend, platform/infra, security.

A sidebar toggle that puts the signed-in merchant into a sandbox: the same v2 UI,
the same navigation, but every API call served by the UAT backend instead of
production. Modelled on Razorpay's Test Mode switch.

---

## 1. How v2 talks to the backend today

Everything below is current behaviour, verified in the repo.

| Concern | Where | Behaviour |
| --- | --- | --- |
| API base paths | [src/api/index.ts](src/api/index.ts) | `/gcc/v1`, `/gcc/v2`, `/gcc/v3`. Relative, never absolute. |
| Transport | [src/lib/api/axios.ts](src/lib/api/axios.ts) | One axios instance. Imported by exactly two files: [hooks.ts](src/lib/api/hooks.ts) and [handleApiError.ts](src/lib/api/handleApiError.ts). |
| Origin resolution | [next.config.ts:42](next.config.ts#L42) | Server-side rewrite `/gcc/:path*` to `${dashboardOrigin()}/gcc/:path*`, `basePath: false`. |
| Environment | [src/constants/environment.ts](src/constants/environment.ts) | `NEXT_PUBLIC_ENV` (dev / uat / prod), baked at build time by [buildspec.yml](buildspec.yml). Maps to `DASHBOARD_ORIGIN_BY_ENV` and `CDN_ORIGIN_BY_ENV`. |
| Session | backend cookie | Set through the rewrite proxy, so the browser is always same origin. No CORS anywhere. |
| Session gate | [src/proxy.ts:50](src/proxy.ts#L50) | Middleware calls `heartbeatApi` server side using `NEXT_PUBLIC_API_BASE_URL`. |
| Payload encryption | [src/features/auth/helpers.ts:25](src/features/auth/helpers.ts#L25) | Public key fetched from `cdnOrigin()`, per environment. |
| Existing test hint | [src/lib/api/axios.ts:12](src/lib/api/axios.ts#L12) | `x-gl-test-env: true` is already sent when `NODE_ENV === "development"`. Same header exists in pg-dashboard and gcc-ui-temp. **Backend needs to tell us what this header currently does.** It may already be most of the answer. |

Two consequences that shape the whole design:

1. The browser never knows the backend origin. Swapping environments is a
   routing decision made by the Next server, not by client code. That is good
   news: test mode is a second rewrite plus a URL prefix, not a CORS project.
2. There is exactly one axios instance and two call sites. The client side of
   this feature is genuinely small.

---

## 2. The hard part is not the UI

Razorpay's test mode is one account with two ledgers inside one system. What is
being asked for here is one account in production talking to a **different
deployment with a different user database**. Three problems fall out, and all
three need a backend decision before the UI ships:

1. **Identity.** The merchant's production credentials do not exist in UAT.
   Something has to mint a UAT session for a user authenticated in prod.
2. **MID mapping.** The prod MID is not the UAT MID. Without a mapping, test
   mode shows either nothing or somebody else's sandbox data.
3. **Session isolation.** A UAT session cookie and a prod session cookie land on
   the same browser origin (`dashboard.payglocal.in`) with the same cookie
   names. Unhandled, the second one silently clobbers the first and logs the
   merchant out of production.

Section 5 has the asks. Section 3 is the UI, which is largely independent of
which backend option wins.

---

## 3. UI specification

### 3.1 The toggle

Placement: sidebar, pinned at the bottom of the scroll region, directly above
the profile block in [src/components/layout/Sidebar.tsx](src/components/layout/Sidebar.tsx#L264).
Same slot Razorpay uses, and the slot already has a `border-t` separator to sit
against. It must be in the pinned footer, not inside the scrolling `nav`, so it
is reachable no matter how long the merchant's nav tree is.

Expanded sidebar:

```
  ┌──────────────────────────────────┐
  │  ⌗  Test Mode            (  ●)   │   Switch from @payglocal_ui/flux-ui
  └──────────────────────────────────┘
```

Collapsed sidebar (60px): the flask icon alone, with a small dot when active,
`title` set to "Test mode: on / off" to match how the other collapsed controls
in that file already behave.

Component: `Switch` from `@payglocal_ui/flux-ui` (exported, confirmed in the
package types). Do not hand roll one.

New file: `src/components/layout/TestModeToggle.tsx`. Rendered from
`SidebarBody` for both the desktop and the mobile drawer, which share that
component already.

### 3.2 Visibility

Hide the control entirely when the account has no sandbox mapped, rather than
showing a switch that can only fail. Gate on a new `testModeEnabled` flag on the
profile payload (section 5.1). Also hide it for:

- global tenant users (`isGlobalTenant`), whose allowed path list is already narrow;
- guest and onboarding users (`role === "ONBOARDING_USER"`), who have no data of either kind.

### 3.3 The "you are in test mode" treatment

Being unsure which mode you are in is the only real failure mode of this
feature, so the signal has to be impossible to miss and impossible to lose by
scrolling.

1. **Banner.** A full width strip at the top of the content area, above the
   page padding in [src/app/(dashboard)/layout.tsx](src/app/(dashboard)/layout.tsx),
   not inside the scrolling `main`. Amber background, one line:
   "Test mode. You are viewing sandbox data from UAT. Nothing here is real."
   with a right aligned "Exit test mode" text button.
2. **Header pill.** A `Lozenge` reading `TEST` next to the product tabs in
   [src/components/layout/Header.tsx](src/components/layout/Header.tsx).
3. **Tab title.** Prefix `document.title` with `[TEST]` so a merchant with both
   modes open in two tabs can tell them apart from the tab strip.

Do not tint the whole page or invert the theme. The banner plus pill is enough,
and a global colour change fights every chart palette in the app.

### 3.4 Toggle behaviour

On switching in either direction:

1. Write the new mode (section 3.5).
2. `queryClient.clear()`. Every cached response belongs to the other
   environment. Clearing is belt and braces on top of the key isolation in 3.6,
   and it also drops the in flight ones.
3. Reset `useApp` and `useAccountSetup` merchant scoped state (`selectedMidDetails`,
   `tidsInfo`, `paMids`, `paCbMids`) and re-run `useFetchCommonData`.
4. `router.replace` to the current path so the page re-mounts against the new
   plane rather than reconciling half stale props.

Do not ask for confirmation on entering. Do ask if a test login is required
(option B in section 4), because that is a second credential prompt and needs
explaining.

### 3.5 Persistence

A non httpOnly cookie, `pg_test_mode=1`, `Path=/`, `SameSite=Lax`, `Secure`.

Cookie rather than `localStorage` because [proxy.ts](src/proxy.ts) runs on the
server and has to point its heartbeat at the right plane, and it can only read
cookies. Cleared unconditionally in [useLogout](src/lib/hooks/useLogout.ts).

Zustand store `src/stores/useTestMode.ts` holds it for render, seeded from the
cookie. Follow the `skipHydration` pattern already used in
[useProductContext.ts](src/stores/useProductContext.ts): the sidebar branches on
this value during render, so hydrating it automatically produces exactly the
server / client markup mismatch that store's comment describes.

### 3.6 Routing the calls

One pure, idempotent helper:

```ts
// src/lib/api/resolveApiUrl.ts
export const TEST_PREFIX = "/gcc-test";

/** Maps an app-relative /gcc/* path onto the test plane. Safe to call twice. */
export function resolveApiUrl(url: string, testMode: boolean): string {
  if (!testMode) return url;
  if (!url.startsWith("/gcc/")) return url;        // absolute URLs, CDN, campaign tracking
  if (url.startsWith(`${TEST_PREFIX}/`)) return url;
  return `${TEST_PREFIX}${url.slice("/gcc".length)}`;
}
```

Applied in [hooks.ts](src/lib/api/hooks.ts) at the point where `finalUrl` is
computed, in `useGet`, `useMultipleGet`, `usePostQuery` and `useApiMutation`.

Applying it there rather than in an axios interceptor is deliberate: `useGet`
builds its query key as `[...queryKey, finalUrl, headers]`, so rewriting the URL
before the key is built gives cache isolation between the two planes for free.
An interceptor would rewrite the request after the key was already computed, and
React Query would happily serve production rows for a test mode query.

Keep an interceptor in [axios.ts](src/lib/api/axios.ts) as well, calling the
same helper, so any future direct `api.get` call cannot leak. The helper is
idempotent, so the double application is harmless.

**Calls that must stay on the live plane regardless of mode:**

| Call | Where | Why |
| --- | --- | --- |
| `logoutApi` | [useLogout.ts](src/lib/hooks/useLogout.ts) | Must kill the production session. Should kill both. |
| `/gcc/v3/error/gcc-ui` | [handleApiError.ts:36](src/lib/api/handleApiError.ts#L36) | One error stream. Add `testMode: boolean` to the body instead. |
| `heartbeatApi` | [proxy.ts](src/proxy.ts) | The route guard protects the real session. |
| `campaignTrackingApi` | [services.ts](src/features/auth/login/services.ts) | Absolute URL, already excluded by the helper. |
| Public key fetch | [auth/helpers.ts](src/features/auth/helpers.ts) | Absolute CDN URL. See 4.3 if the test plane needs encrypted payloads. |

### 3.7 Permissions and navigation

**Decision: navigation and entitlements stay bound to the live session.** Test
mode changes which data you see, not what you are allowed to do. Re-deriving the
sidebar from a UAT entitlements response would make the nav tree grow or shrink
on toggle, which reads as a bug.

Practically: `useFetchCommonData` keeps fetching `entitlementsApi` and
`profileApi` from the live plane, and fetches `merchantProductsApi` plus all
feature data from the active plane. Flagging this as an assumption worth a
product decision: it is the right call if the UAT account is a mirror of the
prod one, and the wrong call if sandbox accounts are deliberately given a
reduced feature set.

### 3.8 Empty states

UAT sandboxes are usually near empty. Every list screen will render its zero
state on the first visit, and the default copy ("No transactions yet") reads as
a bug to someone who has thousands in production. Add a test mode variant to the
shared empty state: "No test data yet. Transactions you create in test mode will
appear here."

---

## 4. Routing options, in order of preference

### Option A: backend serves test data from production (recommended long term)

Production backend honours `x-gl-test-env: true` (the header the codebase
already sends in dev) and answers from the merchant's sandbox ledger.

- Frontend cost: one header, one banner. No second session, no cookie problem,
  no MID mapping, no second login. Roughly a day.
- Backend cost: real, and the entire cost of the feature.
- This is what Razorpay actually does and it is the only version that survives a
  UAT outage or a UAT data wipe without the merchant noticing.

**First question for backend: what does `x-gl-test-env` do today?** If it
already selects a test data plane, this option is far closer than it looks.

### Option B: proxy to UAT with an isolated test session (shippable now)

What the request literally asks for. Production frontend, UAT backend.

Add a route handler at `src/app/gcc-test/[...path]/route.ts` rather than a second
`next.config.ts` rewrite, because a plain rewrite cannot touch `Set-Cookie`, and
cookie collision is the thing that will log merchants out of production.

The handler:

1. Forwards `/gcc-test/*` to `${DASHBOARD_ORIGIN_BY_ENV.uat}/gcc/*`.
2. On the way out, forwards only cookies named `tm_*`, renamed back to their
   original names. The production session cookies are never sent to UAT.
3. On the way back, rewrites every `Set-Cookie`: prefix the name with `tm_`,
   strip the `Domain` attribute (a `Domain=.pygcl.com` cookie is rejected
   outright by a browser on `dashboard.payglocal.in`), and keep `Path=/`.
4. Streams the body through untouched and preserves status, content type and
   content disposition, since several screens download blobs.

Note `config.matcher` in [proxy.ts](src/proxy.ts) already excludes `/gcc`; it
needs `gcc-test` added so the middleware does not try to session gate the proxy.

Also needed: `/gcc-test/*` must be excluded from any WAF or CDN rule that
currently matches `/gcc/*`, and the UAT ALB has to accept traffic from the prod
task's egress.

### Option C: redirect to the UAT dashboard

Toggle navigates to `https://uat.dashboard.pygcl.com/app-v2` and the merchant
signs in again. An afternoon of work, and it is honest about what it is doing,
but it is not test mode: the prod session is left behind, deep links break, and
there is no way back other than a bookmark. Worth mentioning only as the
fallback if A and B both stall.

### 4.3 Encryption, applies to B

The login and a handful of other endpoints encrypt their payload with a key
fetched from `cdnOrigin()`, keyed to `NEXT_PUBLIC_ENV`. A production build fetches
the production key, which UAT cannot decrypt. If test mode needs any encrypted
endpoint (it does, if there is a test login), `cdnOrigin()` has to take the
active plane into account, and `useApp`'s `publicKey` / `kid` / `isEnc` must be
held per plane rather than as single values.

---

## 5. Backend support required

Ordered by whether the feature can ship without it.

### 5.1 Blocking

**a. Answer on `x-gl-test-env`.** What does production do with this header
today? It is already sent by three of our apps in development. If it selects a
test plane, option A is on the table and everything below in this section
shrinks to nothing.

**b. Sandbox identity.** Something must turn an authenticated production user
into a UAT session without a second password. Preferred shape:

```
POST /gcc/v3/auth/test-mode/session        (production, live session cookie)
  -> { assertion: "<short lived signed JWT>", expiresIn: 300 }

POST /gcc/v3/auth/test-mode/exchange       (UAT, no session)
  { assertion }
  -> sets the UAT session cookie, returns the test profile
```

The assertion should be audience scoped to UAT, sub two minute TTL, single use,
and carry the prod MID plus the resolved test MID. If cross environment trust is
not acceptable to security, the fallback is a plain test mode login form in the
UI, and we need to know that now because it changes section 3.4.

**c. MID mapping.** `testMid` per production MID, so the app knows whose sandbox
to open. Cleanest as a field on the existing `tidInfos` entries returned by
`merchantProductsApi`, since the merchant selector is already driven off that
array.

**d. `testModeEnabled` on the profile.** Boolean on `profileApi`'s response,
true only when the account actually has a mapped sandbox. Drives 3.2. Without
it, the toggle has to be shown to everyone and fail for most of them.

### 5.2 Required before general release

**e. Network path.** Production ECS tasks need egress to the UAT ALB, and the
UAT ALB needs to accept it. Currently the two environments do not talk.

**f. Cookie attributes from UAT.** UAT must not set `Domain` on its session
cookies, or must tolerate it being stripped by the proxy. Worth confirming that
nothing in the auth flow reads the cookie domain back.

**g. Rate limits and quotas.** Production traffic volumes arriving at UAT will
trip whatever limits UAT has, and will also skew UAT's own QA metrics. Someone
should decide whether test mode traffic is tagged and excluded from UAT
dashboards.

**h. Data seeding.** A sandbox with nothing in it teaches a merchant nothing.
Either seed each mapped test MID with a representative set of transactions,
settlements and links, or accept that 3.8's empty states are what most merchants
will see.

### 5.3 Worth deciding early

**i. Writes in test mode.** Payment links created in test mode resolve to UAT
checkout URLs. Those links are shareable and will not work for a real payer.
Either mark them visibly in the UI, or have UAT return links on an obviously
non production host.

**j. Audit.** Entering and leaving test mode should be an auditable event on the
production side, given it changes what the merchant is looking at while they are
signed into a production account.

---

## 6. Suggested sequencing

| Step | Depends on | Rough size |
| --- | --- | --- |
| 1. `useTestMode` store, cookie, `resolveApiUrl`, hooks wiring | nothing | small |
| 2. Sidebar toggle, banner, header pill, tab title | 1 | small |
| 3. `/gcc-test` route handler with cookie renaming | 5.2e network path | medium |
| 4. Session exchange wiring | 5.1b, 5.1c | medium |
| 5. Empty states, test link marking, audit events | 4 | small |

Steps 1 and 2 are worth building first regardless of which routing option wins,
because they are identical for A and B. If the answer to 5.1a is "the header
already works", steps 3 and 4 disappear.
