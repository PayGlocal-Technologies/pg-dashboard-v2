import { EchoFeature } from "@/features/dashboard/echo";

/**
 * A transcript needs to own its own scroll container, but the dashboard
 * layout hands each page a static, content-height div inside a scrolling
 * `<main>` — so `flex-1` here would resolve against nothing.
 *
 * `absolute inset-0` against that `<main>` (which is already `relative`) is
 * what gives this page exactly the content area's height without touching the
 * shared layout, and it stays right when the "Viewing as" ribbon appears and
 * shortens that area. Padding is re-added here because taking the page out of
 * flow leaves the layout's own p-4/md:p-6 wrapper collapsed behind it.
 */
export default function EchoPage() {
  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden p-4 md:p-6">
      <EchoFeature />
    </div>
  );
}
