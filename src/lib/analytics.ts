export const ANALYTICS_CONSENT_STORAGE_KEY = "caratflow:analytics-consent";
export const ANALYTICS_EVENT_NAME = "caratflow:analytics";

export const ANALYTICS_EVENTS = [
  "cta_primary_click",
  "demo_secondary_click",
  "customizer_begin",
  "customizer_option_change",
  "customizer_guided_demo_start",
  "customizer_guided_demo_complete",
  "ar_preflight_open",
  "ar_camera_request",
  "ar_permission_result",
  "ar_session_ready",
  "ar_error",
  "product_section_view",
  "pricing_plan_view",
  "pricing_cta_click",
  "pricing_compare_open",
  "faq_open",
  "lead_form_start",
  "lead_form_error",
  "lead_form_submit",
  "lead_form_submit_success",
  "qualified_lead_submit",
  "outbound_demo_visit",
  "booking_complete",
  "scroll_depth",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];
type AnalyticsValue = string | number | boolean;

export interface AnalyticsEventParameters {
  cta_primary_click: { cta_location: string };
  demo_secondary_click: { module: string; cta_location: string };
  customizer_begin: { entry_point: string };
  customizer_option_change: { option_group: string };
  customizer_guided_demo_start: { entry_point: string };
  customizer_guided_demo_complete: Record<string, never>;
  ar_preflight_open: { category: string };
  ar_camera_request: { category: string };
  ar_permission_result: {
    category: string;
    result: "granted" | "denied" | "dismissed" | "unavailable";
  };
  ar_session_ready: { category: string };
  ar_error: { category: string; error_code: string };
  product_section_view: { section_id: string };
  pricing_plan_view: { plan: string };
  pricing_cta_click: { plan: string };
  pricing_compare_open: Record<string, never>;
  faq_open: { faq_id: string };
  lead_form_start: { plan_interest: string };
  lead_form_error: { error_type: string; field_id?: string };
  lead_form_submit: { plan_interest: string };
  lead_form_submit_success: { plan_interest: string };
  qualified_lead_submit: { module_count: number; business_scale_band: string };
  outbound_demo_visit: { module: string };
  booking_complete: { booking_type: string };
  scroll_depth: { scroll_percent: 25 | 50 | 75 | 90 };
}

type AnalyticsPayload<K extends AnalyticsEventName = AnalyticsEventName> = {
  event: K;
  event_id: string;
  event_timestamp: string;
} & Partial<AnalyticsEventParameters[K]>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }

  interface WindowEventMap {
    "caratflow:analytics": CustomEvent<AnalyticsPayload>;
  }
}

const ALLOWED_PARAMETER_KEYS: Record<AnalyticsEventName, readonly string[]> = {
  cta_primary_click: ["cta_location"],
  demo_secondary_click: ["module", "cta_location"],
  customizer_begin: ["entry_point"],
  customizer_option_change: ["option_group"],
  customizer_guided_demo_start: ["entry_point"],
  customizer_guided_demo_complete: [],
  ar_preflight_open: ["category"],
  ar_camera_request: ["category"],
  ar_permission_result: ["category", "result"],
  ar_session_ready: ["category"],
  ar_error: ["category", "error_code"],
  product_section_view: ["section_id"],
  pricing_plan_view: ["plan"],
  pricing_cta_click: ["plan"],
  pricing_compare_open: [],
  faq_open: ["faq_id"],
  lead_form_start: ["plan_interest"],
  lead_form_error: ["error_type", "field_id"],
  lead_form_submit: ["plan_interest"],
  lead_form_submit_success: ["plan_interest"],
  qualified_lead_submit: ["module_count", "business_scale_band"],
  outbound_demo_visit: ["module"],
  booking_complete: ["booking_type"],
  scroll_depth: ["scroll_percent"],
};

const EVENT_NAMES = new Set<string>(ANALYTICS_EVENTS);
const SAFE_STRING_VALUE = /^[a-z0-9][a-z0-9_.:-]{0,63}$/i;

function isSafeValue(value: unknown): value is AnalyticsValue {
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value) && Math.abs(value) <= 1_000_000;
  return typeof value === "string" && SAFE_STRING_VALUE.test(value);
}

function sanitizeParameters(
  eventName: AnalyticsEventName,
  parameters: Record<string, unknown> | undefined,
): Record<string, AnalyticsValue> {
  if (!parameters) return {};

  const allowedKeys = new Set(ALLOWED_PARAMETER_KEYS[eventName]);
  return Object.fromEntries(
    Object.entries(parameters).filter(
      (entry): entry is [string, AnalyticsValue] =>
        allowedKeys.has(entry[0]) && isSafeValue(entry[1]),
    ),
  );
}

function createEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function analyticsConsentIsGranted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY) === "granted";
  } catch {
    return false;
  }
}

export function setAnalyticsConsent(consent: "granted" | "denied" | boolean): void {
  if (typeof window === "undefined") return;
  const value = consent === true || consent === "granted" ? "granted" : "denied";
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, value);
  } catch {
    // Storage can be unavailable in hardened/private browser contexts. Events remain disabled.
  }
}

/**
 * Emits only events from the approved CaratFlow dictionary. Events are discarded
 * until the visitor has granted analytics consent; no pre-consent queue is kept.
 */
export function trackEvent<K extends AnalyticsEventName>(
  name: K,
  parameters?: AnalyticsEventParameters[K],
): boolean {
  if (typeof window === "undefined" || !EVENT_NAMES.has(name) || !analyticsConsentIsGranted()) {
    return false;
  }

  const payload: AnalyticsPayload<K> = {
    event: name,
    event_id: createEventId(),
    event_timestamp: new Date().toISOString(),
    ...sanitizeParameters(name, parameters as Record<string, unknown> | undefined),
  } as AnalyticsPayload<K>;

  window.dataLayer ??= [];
  window.dataLayer.push(payload);
  window.dispatchEvent(new CustomEvent(ANALYTICS_EVENT_NAME, { detail: payload }));
  return true;
}

export function trackCta(location: string): boolean {
  return trackEvent("cta_primary_click", { cta_location: location });
}
