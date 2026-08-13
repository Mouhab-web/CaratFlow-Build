import type { PlanId } from "@/content/site-content";

export type LeadIntent = {
  plan?: PlanId;
  modules?: string[];
};

export const LEAD_INTENT_EVENT = "caratflow:lead-intent";

export function setLeadIntent(intent: LeadIntent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<LeadIntent>(LEAD_INTENT_EVENT, { detail: intent }));
}
