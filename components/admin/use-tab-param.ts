"use client";

import { useState } from "react";

/**
 * Tab state mirrored into `?tab=`, so a tab survives a reload and can be
 * linked to. `initial` comes from the server's read of the same parameter.
 */
export function useTabParam<T extends string>(
  tabs: readonly T[],
  initial: string | undefined
) {
  const fallback = tabs[0];
  const [tab, setTab] = useState<T>(
    tabs.includes(initial as T) ? (initial as T) : fallback
  );

  function selectTab(value: string) {
    if (!tabs.includes(value as T)) return;
    setTab(value as T);

    const url = new URL(window.location.href);
    if (value === fallback) url.searchParams.delete("tab");
    else url.searchParams.set("tab", value);
    window.history.replaceState(null, "", url);
  }

  return [tab, selectTab] as const;
}
