"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import useUser from "@/hooks/use-user";
import { LOCAL_MODE } from "@/lib/local/mode";

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[] };

declare global {
  interface Window {
    clarity?: ClarityFn;
  }
}


function clarity(...args: unknown[]) {
  if (!window.clarity) {
    const stub: ClarityFn = (...queued: unknown[]) => {
      (stub.q = stub.q || []).push(queued);
    };
    window.clarity = stub;
  }
  window.clarity(...args);
}

export default function ClarityIdentify() {
  const { data: user } = useUser();
  const pathname = usePathname();
  const userId = user?.id;

  useEffect(() => {
    if (LOCAL_MODE || !process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID) return;
    if (!userId) return;
    clarity("identify", userId);
    clarity("set", "user_id", userId);
  }, [userId, pathname]);

  return null;
}
