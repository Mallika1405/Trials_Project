import type { EntityType } from "./types";

/** Carry "how did I get here" through navigation without server state. */
export function withVia(href: string, via: string[]): string {
  if (!via.length) return href;
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}via=${encodeURIComponent(via.join("|"))}`;
}
export function parseVia(v: string | string[] | undefined): string[] {
  const s = Array.isArray(v) ? v[0] : v;
  return s ? s.split("|").filter(Boolean) : [];
}

export const TYPE_LABEL: Record<EntityType, string> = {
  gene: "Gene", protein: "Protein", compound: "Compound", drug: "Drug", mutation: "Mutation", trial: "Trial",
};

/** WHO terms are shown verbatim; this only adds a plain-language expansion. */
export function expandClassification(c: string): string {
  return c
    .replace(/^Assoc w R/, "Associated with resistance")
    .replace(/^Not assoc w R/, "Not associated with resistance");
}
