import { createContext, createElement, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase, isConfigured } from "@/lib/supabase";
import type { Catalog } from "@/lib/types";

// In design-preview mode (/preview) a sample catalog is injected here; otherwise data comes from Supabase.
const CatalogOverride = createContext<Catalog | null>(null);
export const CatalogOverrideProvider = ({ value, children }: { value: Catalog; children: ReactNode }) => createElement(CatalogOverride.Provider, { value }, children);

export function useCatalog() {
  const override = useContext(CatalogOverride);
  const q = useQuery({
    queryKey: ["catalog"],
    enabled: isConfigured && !override,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("public_catalog");
      if (error) throw error;
      return data as Catalog;
    },
  });
  if (override) return { data: override, isLoading: false, isError: false } as const;
  return q;
}
