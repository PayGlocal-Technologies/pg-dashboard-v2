"use client";

import { useCallback, useMemo } from "react";
import { useApp, type PermissionsByLevel } from "@/stores/useApp";
import { usePathname } from "next/navigation";

type AccessLevel = keyof PermissionsByLevel;
export type UseNewPermissionsFn = (actionList: string[], useAll?: boolean) => boolean;

const useNewPermissions = (contextLevelOverride?: AccessLevel): UseNewPermissionsFn => {
  const newPermissions = useApp((state) => state.permissions);
  const pathname = usePathname();
  const policyAccessLevel = useMemo<AccessLevel>(
    () => (pathname.includes("tid/") ? "c" : "s"),
    [pathname]
  );

  const actions = useMemo(() => {
    if (!newPermissions) return [];
    const level = contextLevelOverride || policyAccessLevel;
    return [
      ...(newPermissions.b ?? []),
      ...(newPermissions[level?.toLowerCase() as AccessLevel] ?? []),
    ];
  }, [contextLevelOverride, newPermissions, policyAccessLevel]);

  return useCallback<UseNewPermissionsFn>(
    (actionList, useAll = false) => {
      if (!newPermissions || !actionList) return false;
      return actionList[useAll ? "every" : "some"]((action) => actions.includes(action));
    },
    [newPermissions, actions]
  );
};

export default useNewPermissions;
