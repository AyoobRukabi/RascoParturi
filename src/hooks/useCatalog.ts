import { useQuery } from "@tanstack/react-query";
import { supabase, isConfigured } from "@/lib/supabase";
import type { Catalog } from "@/lib/types";

export function useCatalog() {
  return useQuery({
    queryKey: ["catalog"],
    enabled: isConfigured,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("public_catalog");
      if (error) throw error;
      return data as Catalog;
    },
  });
}
