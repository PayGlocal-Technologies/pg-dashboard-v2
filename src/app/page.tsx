import { redirect } from "next/navigation";

/**
 * The app has no content of its own at "/" — every real page lives under the
 * (auth) or (dashboard) route groups, so without this the root URL fell
 * through to not-found.tsx and rendered a 404.
 *
 * Only authenticated users reach this component: proxy.ts treats "/" as a
 * protected route and already redirects unauthenticated visitors to /login.
 * So this just forwards them to the same landing page the rest of the auth
 * flow uses (proxy.ts's AUTHED_HOME and helpers.ts's DEFAULT_AUTHED_PATH).
 * Declared locally rather than imported, matching proxy.ts — helpers.ts pulls
 * in Firebase and the app store, which don't belong in a root server component.
 */
const AUTHED_HOME = "/transactions";

export default function RootPage() {
  redirect(AUTHED_HOME);
}
