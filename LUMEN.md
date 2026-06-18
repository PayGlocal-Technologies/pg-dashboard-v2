# pg-dashboard-v2 design rules for the Lumen agent

These rules extend Lumen's global defaults. They are re-read on every message.

---

## COMPONENT LIBRARY — HARD RULE

Use ONLY components from `@/components/ui` (flux-ui) for every interactive or data-display element.
Bare HTML elements are forbidden for anything interactive.

| What you need          | Use this                              | Never use              |
|------------------------|---------------------------------------|------------------------|
| Button / link-button   | `<Button>`                            | `<button>`             |
| Text input             | `<Input>`                             | `<input>`              |
| Password field         | `<PasswordInput>`                     | `<input type=password>`|
| OTP field              | `<OtpInput>`                          | manual `<input>`       |
| Dropdown / select      | `<Select>` + `<SelectTrigger>` etc.   | `<select>`             |
| Modal / overlay        | `<Dialog>` + `<DialogContent>` etc.   | `<dialog>`             |
| Table / data grid      | `<DataTable>`                         | `<table>`              |
| Labelled field         | `<Field>`, `<FieldLabel>`, `<FieldError>` | bare `<label>`     |
| Card surface           | `<Card>` + friends                    | `<div>` + shadow       |
| Divider                | `<Separator>`                         | `<hr>`                 |
| Status chip            | `<StatusBadge>`                       | hand-rolled span       |
| Loading skeleton       | `<Shimmer>` / `<StatCardSkeleton>`    | `animate-pulse div`    |
| Page title bar         | `<PageHeader>`                        | hand-rolled            |
| Images                 | `<Image>` from `next/image`           | `<img>`                |

Structural/layout elements (`<div>`, `<section>`, `<main>`, `<nav>`, `<aside>`) are fine without a
flux-ui wrapper.

---

## PATH ALIAS — HARD RULE

Every internal import MUST use the `@/` alias. Relative paths (`./`, `../`) are banned, even for
files in the same folder.

```ts
// CORRECT
import { useLogin } from "@/stores/useLogin";
import { Button } from "@/components/ui";

// WRONG — will fail lint
import { useLogin } from "../../stores/useLogin";
import { Button } from "./ui";
```

---

## ICONS AND SVG ASSETS — HARD RULE

- Use ONLY `<Icon name="..." />` from `@/components/icon`. Never import from `lucide-react` directly
  in any file other than `src/components/icon/registry.ts`.
- For new brand assets / custom SVGs:
  1. Create `src/components/icon/<AssetName>.tsx` as a `forwardRef` SVG component.
  2. Register it in `src/components/icon/registry.ts` with a kebab-case key.
  3. Use it everywhere as `<Icon name="my-key" />`.

---

## FORMS — HARD RULE

Use `@tanstack/react-form` only. Never use `react-hook-form` or `@hookform/resolvers`.

---

## EDIT SCOPE — HARD RULE

You may READ `../pg-dashboard` and `../Flux` (Nova) as reference. You may ONLY EDIT files under
the pg-dashboard-v2 working directory. Never write to `../pg-dashboard`, `../Flux`, or any directory
outside `./`.

---

## PAYMENTS COMPLIANCE — HARD RULE

Mock data must use clearly fake, masked values specific to this app:
- Cards: `•••• •••• •••• 4242`
- Accounts: `XXXXXXXX1234`
- Names: `Demo Merchant`, `Test User`
- Merchant IDs: `MID_DEMO_001`
- Transaction IDs: `TXN_DEMO_XXXX`

---

## WORKFLOW FOR pg-dashboard-v2

### Before writing code
1. Read the target file first.
2. **Check pg-dashboard for reference.** If the feature already exists in
   `../pg-dashboard/src/features/<feature>/`, read it. Match visual behaviour and UX patterns —
   pg-dashboard-v2 is the successor, not a redesign from scratch.
3. **Check Nova/Flux for design language.** Look at `../Flux/` components for the correct spacing,
   colour tokens, and interaction patterns.

### After writing code
4. Tell the designer what changed in plain language.
5. Run `npm run lint` and fix any errors before finishing.

---

## FILE & FEATURE STRUCTURE

```
src/features/<feature>/
  index.tsx           top-level feature component (page entry)
  components/         sub-components for this feature only
  constants.ts        enums, config, display maps (no logic)
  types.ts            TypeScript types and interfaces
  services.ts         API URL strings/builders ONLY (no fetch logic)
  buildRequestBody.ts request payload builders (if complex)
```

- Components call `useGet` / `usePost` / `usePut` / `useDelete` from `@/lib/api/hooks` directly,
  passing the URL from `services.ts`.
- No per-feature `api.ts`. No global `endpoints.ts`.

---

## REFERENCING pg-dashboard

pg-dashboard is the live production app. It is the source of truth for:
- API endpoint paths (version prefix, exact URL shape)
- Request payload field names and types
- Response `status` strings and how they are branched on
- OTP length (`OTP_LENGTH = 4`, not 6)
- Which payloads are encrypted (JWE envelope) vs plain JSON

When porting a feature:
1. Open `../pg-dashboard/src/features/<feature>/services.ts` — copy the endpoint URL exactly.
2. Read the pg-dashboard component that calls it — copy every payload field.
3. Read the `onSuccess` handler — copy every `status` branch.
4. Leave `// TODO(integration):` comments pointing to the pg-dashboard file you read.

---

## DARK MODE & THEMING

- Always use Tailwind semantic colour tokens (`text-foreground`, `bg-card`, `border-border`,
  `text-muted-foreground`) rather than hard-coded colours.
- Add `dark:` variants where semantic tokens do not auto-adapt.

---

## COMMON MISTAKES — AVOID THESE

- Writing `import { X } from "lucide-react"` anywhere except `registry.ts`
- Using `<button>`, `<input>`, `<select>`, or `<table>` for interactive/data elements
- Relative imports (`"./components/Foo"`, `"../../lib/utils"`)
- Hard-coded pixel colours (`#1a1a2e`, `rgb(255,0,0)`) instead of Tailwind tokens
- Creating a new file for a tiny change that belongs in an existing file
- Forgetting `dark:` variants on custom colour classes
- Leaving a component without a loading and empty state
- Putting API call logic (fetch, axios) inside a component instead of leaving a TODO
- Using `Math.random()` or `Date.now()` in server components (SSR breaks)
