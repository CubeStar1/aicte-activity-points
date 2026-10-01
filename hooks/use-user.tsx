"use client";

import { createSupabaseBrowser } from "@/lib/supabase/client";
import { LOCAL_MODE, LOCAL_USER_ID } from "@/lib/local/mode";
import { User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
export default function useUser() {
  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      if (LOCAL_MODE) {
        return { id: LOCAL_USER_ID, email: "local@localhost" } as User;
      }
      const supabase = createSupabaseBrowser();
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        return data.user;
      }
      return {} as User;
    },
  });
}
