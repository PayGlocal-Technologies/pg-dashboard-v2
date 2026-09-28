import { useApp } from "@/stores/useApp";
import { staticLinkHost, staticLinkUrl, toHandle } from "@/features/dashboard/static-link/helpers";

/**
 * The merchant's static link.
 *
 * TODO(api): no static link endpoint exists yet (pg-dashboard has none). The
 * handle is derived from the registered name, else the first MID's trade
 * name, until the backend issues the real one.
 */
export function useStaticLink(): { handle: string; host: string; url: string } {
  const registeredName = useApp((s) => s.profile?.registeredName);
  const tradeName = useApp((s) => s.tidsInfo[0]?.tradeName);
  const handle = toHandle(registeredName || tradeName);
  return { handle, host: staticLinkHost(), url: staticLinkUrl(handle) };
}
