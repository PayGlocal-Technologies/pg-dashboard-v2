# pg-dashboard-v2 – Claude Code conventions

## React hooks — purity rules

Two rules enforced by the React Compiler lint plugin. Violating either will produce a lint error in CI.

**No `Date.now()` / `Math.random()` during render.** These are impure — calling them in a component body or a function called during render produces different values across re-renders, breaking React's idempotency guarantee. Move them into `useEffect`, event handlers, or a `useState` lazy initializer (which runs once on mount, not on every render).

**No synchronous `setState` in an effect body.** Calling `setState(...)` directly inside a `useEffect` callback (not inside a nested callback like `setInterval` or `addEventListener`) triggers an extra render cycle immediately after the effect runs. This is always a sign that the state should either be derived from existing state/props without an effect, or updated from within an async callback.

```ts
// WRONG — both rules violated
useEffect(() => {
  setState(Date.now()); // synchronous setState AND impure Date.now in effect body
}, [dep]);

// CORRECT — setState only inside the interval callback; Date.now only in that callback
useEffect(() => {
  const id = setInterval(() => {
    setState(Date.now()); // fine: inside an async callback, not the effect body
  }, 1000);
  return () => clearInterval(id);
}, [dep]);

// CORRECT — lazy initializer runs once on mount, not on every render
const [value, setValue] = useState(() => Date.now());
```

---

## Imports

All internal module imports **MUST** use the `@/` path alias. Never use any relative import — this includes same-directory (`./`) as well as parent traversal (`../` or `../../`).

```ts
// CORRECT
import { useLogin } from "@/stores/useLogin";
import { OtpInput } from "@/components/ui";
import { identifierSchema } from "@/features/login/schemas";
import { Label } from "@/components/ui/label";
import "@/app/globals.css";

// WRONG – will fail lint
import { useLogin } from "../../stores/useLogin";
import { identifierSchema } from "../schemas";
import { Label } from "./label";
import "./globals.css";
```

The agent must check every import it adds or changes satisfies this rule.

## API layer conventions (mirrors pg-dashboard)

- **`src/api/index.ts`** — base URL constants (`BASE_URL_V1/V2/V3`, `heartbeatApi`). Nothing else.
- **`src/features/<feature>/services.ts`** — per-feature file that exports endpoint URL **strings/builders** only (no axios/fetch logic).
- **No `api.ts` per feature.** No global `endpoints.ts`.
- Components call `useGet` / `usePost` / `usePut` / `useDelete` (from `@/lib/api/hooks`) **directly**, passing the URL from `services.ts`.

```ts
// CORRECT — inside a component
import { verifyPasswordApi } from "@/features/login/services";
import { usePost } from "@/lib/api/hooks";

const { mutate } = usePost<AuthEnvelope<AuthedData>, EncryptedPayload>(verifyPasswordApi);

// WRONG
import { useVerifyPassword } from "./api"; // api.ts must not exist
```

## Form library

Use **`@tanstack/react-form`** for all forms. Do not use `react-hook-form` or `@hookform/resolvers`.

```ts
// CORRECT
import { useForm } from "@tanstack/react-form";

// WRONG
import { useForm } from "react-hook-form";
```

## Icons and SVG assets — COMPULSORY RULE

Import icons exclusively through `@/components/icon` (the `<Icon>` component). Never import from `lucide-react` directly, except in `src/components/icon/registry.ts`.

### All SVG/brand assets must go through the icon registry

Every SVG asset — logos, wordmarks, brand illustrations, payment-method icons, flag icons that ship as SVG components — **must** be implemented as a registry entry. Never place brand assets in `public/` and reference them via `<Image src="...">` or a static string path.

**The canonical pattern (follow `PayGlocalLogo` exactly):**

1. Create `src/components/icon/<AssetName>.tsx` — a `forwardRef` component that accepts `SVGProps<SVGSVGElement>` and spreads them onto the root `<svg>`:

   ```tsx
   import { forwardRef, type SVGProps } from "react";

   export const MyLogo = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>((props, ref) => (
     <svg ref={ref} viewBox="..." fill="none" xmlns="..." {...props}>
       {/* paths */}
     </svg>
   ));
   MyLogo.displayName = "MyLogo";
   ```

2. Register it in `src/components/icon/registry.ts` with a kebab-case key:

   ```ts
   import { MyLogo } from "@/components/icon/MyLogo";

   export const ICONS = {
     // ... existing icons ...
     "my-logo": MyLogo as unknown as LucideIcon,
   } as const satisfies Record<string, LucideIcon>;
   ```

3. Use it everywhere as `<Icon name="my-logo" />` — identical to any Lucide icon.

**Rules:**

- The `forwardRef` component file must only import from React (`forwardRef`, `SVGProps`) — never from `registry.ts` (circular dependency).
- Use `as unknown as LucideIcon` when the `forwardRef` signature doesn't exactly satisfy `LucideIcon`. This is expected and correct.
- Width/height should use `em` units so `font-size` / `className="text-[28px]"` on the parent controls rendered size.
- `aria-label` and `role="img"` are required on decorative wordmarks.

**Never:**

- `<Image src="/some-logo.png" />` or `<img src="/some-logo.svg" />` for brand assets
- `src/app/favicon.ico` re-exports or symlinks as a component workaround
- Importing an SVG file path directly into a component

**How to audit:**

```bash
# Find any remaining static brand asset references
grep -rn '\.png\|\.svg\|\.jpg\|\.webp\|<Image' pg-dashboard-v2/src --include="*.tsx" --include="*.ts"
```

Every hit must be either an `<AppImage>` used for dynamic/remote images (e.g. flag CDN URLs) or have a documented reason why the registry pattern doesn't apply.

## UI components — COMPULSORY RULE

**Always use flux-ui components from `@/components/ui` instead of bare HTML elements.** This rule has no exceptions for new code. Violations must be fixed before a PR is merged.

| Need                   | Use                                       | Never use                                           |
| ---------------------- | ----------------------------------------- | --------------------------------------------------- |
| Clickable action       | `<Button>`                                | `<button>`                                          |
| Text input             | `<Input>`                                 | `<input type="text/email/…">`                       |
| Password field         | `<PasswordInput>`                         | `<input type="password">`                           |
| OTP field              | `<OtpInput>`                              | `<input>` sequences                                 |
| Dropdown / select      | `<Select>` and friends                    | `<select>` / `<option>`                             |
| Modal / overlay        | `<Dialog>` and friends                    | `<dialog>` / hand-rolled overlays                   |
| Data grid              | `<DataTable>`                             | `<table>` / `<thead>` / `<tbody>` / `<tr>` / `<td>` |
| Labelled field wrapper | `<Field>`, `<FieldLabel>`, `<FieldError>` | bare `<label>` + `<p>` error text                   |
| Card surface           | `<Card>` and friends                      | bare `<div>` with manual shadow/border              |
| Divider                | `<Separator>`                             | `<hr>`                                              |
| Status chip            | `<StatusBadge>`                           | hand-rolled `<span>` with colour classes            |
| Loading skeleton       | `<Shimmer>`, `<StatCardSkeleton>`, etc.   | `<div>` with `animate-pulse`                        |
| Page title bar         | `<PageHeader>`                            | hand-rolled heading + breadcrumb                    |
| Images                 | `<AppImage>` from `@/components/common/AppImage` | `<img>`, `next/image` directly                |

**`<img>` is never allowed, and neither is importing `next/image` directly.** Always use `<AppImage>`. For blob URLs (e.g. `URL.createObjectURL`) or other sources that cannot be optimised, pass `unoptimized` and provide explicit `width`/`height` props:

```tsx
// CORRECT — blob URL from file upload
import { AppImage } from "@/components/common/AppImage";
<AppImage src={previewUrl} alt="Preview" width={64} height={64} unoptimized className="..." />

// WRONG — renders broken under the app's base path
import Image from "next/image";
<Image src="/assets/logo.png" alt="Logo" width={64} height={64} />

// WRONG
<img src={previewUrl} alt="Preview" className="..." />
```

### Why AppImage and not `next/image` — COMPULSORY RULE

The app is served from a base path (`/app-v2`, see `src/constants/basePath.ts`).
Next applies that prefix to the image **optimizer route** but *not* to the `src`
it points at, and for `unoptimized` images it does not touch the src at all. A
`public/` file therefore fails **both** ways round:

```
optimized:   src="/app-v2/_next/image?url=%2Fassets%2Flogo.png"   → 400 "not a valid image"
unoptimized: src="/assets/logo.png"                                → 404
```

`<AppImage>` is a thin `next/image` wrapper that runs `src` through
`withBasePath()`, fixing both. It only touches root-relative paths — `blob:`,
`data:` and absolute CDN URLs pass through untouched — so it is a safe drop-in
everywhere.

`src/components/common/AppImage.tsx` is the only file allowed to import
`next/image`; an ESLint `no-restricted-imports` rule enforces this. **Never
hardcode the base path into a src** (`src="/app-v2/assets/…"`) — that is what
pg-dashboard does in 41 places, and it means every base-path change is a
find-and-replace.

**The one case the lint rule cannot catch** is a CSS background, because the
path is a string inside a style object rather than an import. Wrap those by
hand:

```tsx
// CORRECT
style={{ backgroundImage: `url(${withBasePath("/assets/banner.png")})` }}

// WRONG — 404s under the base path
style={{ backgroundImage: "url(/assets/banner.png)" }}
```

**How to audit:**

```bash
grep -rn 'from "next/image"' src --include="*.tsx"   # must only match AppImage.tsx
grep -rn 'url(/' src                                 # CSS backgrounds needing withBasePath
```

### When a bare element is acceptable

A bare HTML element is only acceptable when **all** of the following are true:

1. No flux-ui component covers the use-case (e.g. a `<nav>`, `<aside>`, `<main>` structural element, or an `<svg>` path inside an icon component).
2. The element is a **layout/structural** element (not an interactive widget or data-display component).
3. The element carries **no custom interaction** that a flux-ui component would otherwise provide (click handler, focus management, validation, etc.).

If you are unsure, default to the flux-ui component. If the design genuinely cannot be achieved with the component's variants and `className` override, raise it as a gap in the design system rather than bypassing the component.

### How to check before submitting

```bash
# Flag any remaining bare interactive/data elements in pg-dashboard-v2/src
grep -rn "<button\|<input\|<select\|<table\|<dialog\|<textarea" pg-dashboard-v2/src --include="*.tsx"
```

Every hit must either be a structural element (exempt per rule above) or have a documented reason in a code comment explaining why no flux-ui component fits.

## Environment / backend

- `npm run dev` → connects to `gcc.dev.payglocal.in` backend
- `npm run uat` → connects to `gcc.uat.pygcl.com` backend
- UAT has migrated off `payglocal.in`: the base domain is `pygcl.com` for uat and `payglocal.in` for dev/test/prod. Any URL built from the base domain picks it with a `env === "uat" ? "pygcl.com" : "payglocal.in"` conditional, matching pg-dashboard.
- Next.js rewrites proxy `/gcc/:path*` to the correct origin. The browser always stays same-origin.
- Public key is fetched from `https://cdn.uat.pygcl.com/public-key/key.txt` in uat, `https://cdn.dev.payglocal.in/...` in dev, and `https://cdn.payglocal.in/...` in prod.

## No secrets in code

Never log, echo, or store: identifiers, OTPs, passwords, tokens, `kid` values, or any auth payload fields. All sensitive payloads are already JWE-encrypted by `useEncryptPayload` before they leave the browser.

## Migrating features from pg-dashboard

**pg-dashboard is a live production application.** It is the source of truth for every API contract. When porting any feature to pg-dashboard-v2, treat it like a surgical migration — not a rewrite.

### Mandatory checklist before shipping any migrated feature

1. **Endpoint URL** — open `pg-dashboard/src/features/<feature>/services.ts` and confirm the exact path, including version prefix (`v1`/`v2`/`v3`) and whether a global-tenant variant exists. Do not guess or infer.

2. **Request payload** — read the pg-dashboard component that calls the endpoint and copy every field name, type, and optionality exactly. Pay special attention to:
   - Fields that must be present even when empty (e.g. `phoneOtp` alongside `emailOtp`)
   - Fields that must be absent (e.g. `identifier` is NOT sent to `forgotpassword/verifyotp`)
   - Whether the body is encrypted via `useEncryptPayload` or sent as plain JSON

3. **Response status handling** — copy every `status` string the pg-dashboard `onSuccess` handler branches on. Missing a status means a flow silently does nothing.

4. **OTP length** — always verify against `OTP_LENGTH` in `pg-dashboard/src/features/login/constants.ts`. The value is **4**, not 6.

5. **Encryption boundary** — some endpoints (e.g. `forgotpassword/update`) expect plain JSON. Others require the `{ isEnc, kid, payload }` JWE envelope. Check pg-dashboard before wrapping in `useEncryptPayload`.

### How to verify

Before opening a PR for any migrated feature, run a side-by-side diff:

```
# in the Comparison workspace root
diff pg-dashboard/src/features/<feature>/services.ts \
     pg-dashboard-v2/src/features/<feature>/services.ts
```

And manually compare the payload construction in each component. If anything differs, it needs a documented reason — not an assumption that the new code is equivalent.
