import { type Metadata } from "next";
import { EchoFullPage } from "@/features/dashboard/echo/EchoFullPage";

export const metadata: Metadata = { title: "Ask Echo" };

export default function EchoPage() {
  // Cancels the dashboard layout's own p-4/md:p-6 content padding. Height is
  // an explicit viewport calc, not `flex-1`/`min-h-0`: the layout's <main>
  // isn't itself a flex column (only the sidebar+main row above it is), so
  // `flex-1` here would have no flex context to fill and the composer would
  // end up at the bottom of the *content* rather than pinned to the bottom
  // of the viewport. 57px matches the header's own fixed height everywhere
  // else in this app (Header.tsx, Sidebar.tsx).
  return (
    <div className="-m-4 flex h-[calc(100vh-57px)] flex-col overflow-hidden md:-m-6">
      <EchoFullPage />
    </div>
  );
}
