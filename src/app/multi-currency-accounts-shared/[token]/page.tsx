import { SharedAccountsFeature } from "@/features/dashboard/multi-currency/SharedAccountsFeature";

/**
 * Public page a merchant's shared account link opens. Path mirrors
 * pg-dashboard's own route exactly, because the share-link endpoint issues the
 * URL — this app doesn't get to choose the shape of it.
 *
 * Deliberately outside the (dashboard) route group: no sidebar, no session, no
 * merchant context. The token in the path is the only credential, and
 * middleware lets this prefix through unauthenticated (see publicRoutes).
 */
export default async function SharedAccountsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SharedAccountsFeature token={token} />;
}
