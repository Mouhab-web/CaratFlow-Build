export const LEAD_FORM_ENDPOINT = "/api/leads";
export const LEAD_REQUEST_HEADER = "X-CaratFlow-Request";
export const LEAD_REQUEST_HEADER_VALUE = "lead-form";
export const LEAD_MIN_FILL_MS = 1_500;
export const LEAD_MAX_FORM_AGE_MS = 6 * 60 * 60 * 1_000;
export const LEAD_MAX_BODY_BYTES = 32 * 1_024;

export const LEAD_MODULES = [
  "Customizer",
  "Try-On",
  "Commerce",
  "Operations",
  "CaratFlow Partner",
] as const;

export type LeadModule = (typeof LEAD_MODULES)[number];

export interface LeadSubmissionInput {
  name: string;
  workEmail: string;
  company: string;
  country: string;
  modules: LeadModule[];
  website?: string;
  businessScale?: string;
  currentPlatform?: string;
  message?: string;
  marketingConsent?: boolean;
  formStartedAt: number;
  /** Honeypot. This field must stay empty and visually hidden from people. */
  faxNumber?: string;
}

export type LeadField = keyof LeadSubmissionInput | "form";
export type LeadFieldErrors = Partial<Record<LeadField, string>>;

export type LeadValidationResult =
  | { success: true; data: LeadSubmissionInput; suspicious: boolean }
  | { success: false; fieldErrors: LeadFieldErrors };

const MODULE_SET = new Set<string>(LEAD_MODULES);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function stringField(
  source: Record<string, unknown>,
  field: LeadField,
  maxLength: number,
  errors: LeadFieldErrors,
  required = false,
): string | undefined {
  const raw = source[field];
  if (raw === undefined || raw === null || raw === "") {
    if (required) errors[field] = "This field is required.";
    return undefined;
  }
  if (typeof raw !== "string") {
    errors[field] = "Enter a valid value.";
    return undefined;
  }
  const value = raw.trim();
  if (!value && required) {
    errors[field] = "This field is required.";
    return undefined;
  }
  if (value.length > maxLength) {
    errors[field] = `Use ${maxLength} characters or fewer.`;
    return undefined;
  }
  return value || undefined;
}

function normalizeWebsite(value: string | undefined, errors: LeadFieldErrors) {
  if (!value) return undefined;
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    if (!(["http:", "https:"] as string[]).includes(url.protocol) || url.username || url.password) {
      throw new Error("Unsupported website URL");
    }
    return url.toString();
  } catch {
    errors.website = "Enter a valid website address.";
    return undefined;
  }
}

export function validateLeadSubmission(input: unknown, now = Date.now()): LeadValidationResult {
  const source = asRecord(input);
  if (!source) {
    return { success: false, fieldErrors: { form: "Submit the form as a JSON object." } };
  }

  const fieldErrors: LeadFieldErrors = {};
  const name = stringField(source, "name", 100, fieldErrors, true);
  const workEmail = stringField(source, "workEmail", 254, fieldErrors, true)?.toLowerCase();
  const company = stringField(source, "company", 160, fieldErrors, true);
  const country = stringField(source, "country", 80, fieldErrors, true);
  const website = normalizeWebsite(stringField(source, "website", 300, fieldErrors), fieldErrors);
  const businessScale = stringField(source, "businessScale", 100, fieldErrors);
  const currentPlatform = stringField(source, "currentPlatform", 160, fieldErrors);
  const message = stringField(source, "message", 2_000, fieldErrors);
  const faxNumber = stringField(source, "faxNumber", 200, fieldErrors);

  if (workEmail && !EMAIL_PATTERN.test(workEmail)) {
    fieldErrors.workEmail = "Enter a valid work email address.";
  }

  let modules: LeadModule[] = [];
  if (!Array.isArray(source.modules) || source.modules.length === 0) {
    fieldErrors.modules = "Choose at least one module.";
  } else if (
    source.modules.length > LEAD_MODULES.length ||
    source.modules.some((module) => typeof module !== "string" || !MODULE_SET.has(module))
  ) {
    fieldErrors.modules = "Choose only the listed CaratFlow modules.";
  } else {
    modules = [...new Set(source.modules)] as LeadModule[];
  }

  const marketingConsent = source.marketingConsent === true;
  if (source.marketingConsent !== undefined && typeof source.marketingConsent !== "boolean") {
    fieldErrors.marketingConsent = "Choose whether to receive product updates.";
  }

  const formStartedAt = source.formStartedAt;
  if (typeof formStartedAt !== "number" || !Number.isFinite(formStartedAt)) {
    fieldErrors.formStartedAt = "Refresh the page and try again.";
  } else if (formStartedAt > now + 30_000 || now - formStartedAt > LEAD_MAX_FORM_AGE_MS) {
    fieldErrors.formStartedAt = "This form has expired. Refresh the page and try again.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors };
  }

  return {
    success: true,
    suspicious: Boolean(faxNumber) || (formStartedAt as number) > now - LEAD_MIN_FILL_MS,
    data: {
      name: name!,
      workEmail: workEmail!,
      company: company!,
      country: country!,
      modules,
      ...(website ? { website } : {}),
      ...(businessScale ? { businessScale } : {}),
      ...(currentPlatform ? { currentPlatform } : {}),
      ...(message ? { message } : {}),
      marketingConsent,
      formStartedAt: formStartedAt as number,
      ...(faxNumber ? { faxNumber } : {}),
    },
  };
}
