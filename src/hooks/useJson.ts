import { useEffect, useState } from "react";

/** Loads an owner-supplied JSON file from /public (gallery manifest, reviews). Missing or invalid file -> empty list. */
export function useJsonList<T>(url: string): T[] {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    let live = true;
    fetch(url).then((r) => (r.ok && r.headers.get("content-type")?.includes("json") ? r.json() : [])).then((j) => live && Array.isArray(j) && setItems(j)).catch(() => undefined);
    return () => { live = false; };
  }, [url]);
  return items;
}
export interface GalleryItem { src: string; alt?: string }
export interface Review { author: string; text: string; rating?: number; source?: string; url?: string }
