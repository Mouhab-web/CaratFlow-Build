export const SITE_NAME = "CaratFlow";
export const SITE_TITLE = "CaratFlow | Unified Jewelry Commerce Platform";
export const SITE_DESCRIPTION =
  "Configure jewelry, offer browser-based try-on, sell online, and connect catalog, pricing, inventory, orders, and customer operations with CaratFlow.";
export const OPEN_GRAPH_TITLE = "CaratFlow — Configure, Try On, Sell, Operate, Grow";
export const OPEN_GRAPH_DESCRIPTION =
  "One connected jewelry commerce platform for interactive configuration, browser-based try-on, storefronts, pricing, inventory, orders, and customer operations.";
export const SOCIAL_IMAGE_PATH = "/brand/caratflow-social.png";
export const SOCIAL_IMAGE_ALT =
  "CaratFlow ring customizer connected to jewelry commerce and operations interfaces";

const TRANSIENT_HOST_SUFFIXES = [
  ".lovable.app",
  ".vercel.app",
  ".pages.dev",
  ".workers.dev",
  ".r2.dev",
  ".example.com",
];

export type PublicEnvironment = Readonly<Record<string, string | boolean | undefined>>;

export interface PublicSiteConfig {
  origin?: string;
  contactEmail?: string;
  companyLegalName?: string;
  companyAddress?: string;
  companyCountryCode?: string;
  privacyPolicyUrl?: string;
  termsUrl?: string;
  demoBookingUrl?: string;
  approvedDemoUrl?: string;
  deploymentEnvironment: "production" | "preview";
  allowIndexing: boolean;
}

function currentPublicEnvironment(): PublicEnvironment {
  return ((import.meta as ImportMeta & { env?: PublicEnvironment }).env ?? {}) as PublicEnvironment;
}

export function isUnresolvedPublicValue(value: unknown): boolean {
  if (typeof value !== "string") return true;
  const candidate = value.trim();
  return candidate.length === 0 || /^\[[A-Z0-9_]+\]$/.test(candidate);
}

function cleanText(value: unknown, maxLength: number): string | undefined {
  if (isUnresolvedPublicValue(value)) return undefined;
  const candidate = (value as string).trim();
  return candidate.length <= maxLength ? candidate : undefined;
}

function cleanEmail(value: unknown): string | undefined {
  const candidate = cleanText(value, 254);
  if (!candidate || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) return undefined;
  return candidate.toLowerCase();
}

export function isTransientPublicHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return TRANSIENT_HOST_SUFFIXES.some(
    (suffix) => normalized === suffix.slice(1) || normalized.endsWith(suffix),
  );
}

function cleanPublicUrl(
  value: unknown,
  options: { originOnly?: boolean; rejectTransientHost?: boolean } = {},
): string | undefined {
  const candidate = cleanText(value, 2_048);
  if (!candidate) return undefined;

  try {
    const url = new URL(candidate);
    const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(isLocal && url.protocol === "http:")) return undefined;
    if (url.username || url.password) return undefined;
    if (options.rejectTransientHost && isTransientPublicHost(url.hostname)) return undefined;
    if (options.originOnly && (url.pathname !== "/" || url.search || url.hash)) return undefined;
    return options.originOnly ? url.origin : url.toString();
  } catch {
    return undefined;
  }
}

function enabled(value: unknown): boolean {
  return value === true || (typeof value === "string" && value.toLowerCase() === "true");
}

export function resolvePublicSiteConfig(
  environment: PublicEnvironment = currentPublicEnvironment(),
): PublicSiteConfig {
  const deploymentEnvironment =
    environment.VITE_DEPLOYMENT_ENV === "production" ? "production" : "preview";
  const origin = cleanPublicUrl(environment.VITE_SITE_ORIGIN, {
    originOnly: true,
    rejectTransientHost: true,
  });

  return Object.freeze({
    origin,
    contactEmail: cleanEmail(environment.VITE_CONTACT_EMAIL),
    companyLegalName: cleanText(environment.VITE_COMPANY_LEGAL_NAME, 180),
    companyAddress: cleanText(environment.VITE_COMPANY_ADDRESS, 300),
    companyCountryCode: cleanText(environment.VITE_COMPANY_COUNTRY_CODE, 2)?.toUpperCase(),
    privacyPolicyUrl: cleanPublicUrl(environment.VITE_PRIVACY_POLICY_URL, {
      rejectTransientHost: true,
    }),
    termsUrl: cleanPublicUrl(environment.VITE_TERMS_URL, {
      rejectTransientHost: true,
    }),
    demoBookingUrl: cleanPublicUrl(environment.VITE_DEMO_BOOKING_URL, {
      rejectTransientHost: true,
    }),
    approvedDemoUrl: cleanPublicUrl(environment.VITE_APPROVED_DEMO_URL, {
      rejectTransientHost: true,
    }),
    deploymentEnvironment,
    allowIndexing:
      deploymentEnvironment === "production" &&
      Boolean(origin) &&
      enabled(environment.VITE_ALLOW_INDEXING),
  });
}

export const siteConfig = resolvePublicSiteConfig();

export const requiredPublicConfigIsResolved = (config: PublicSiteConfig = siteConfig): boolean =>
  Boolean(
    config.origin &&
    config.contactEmail &&
    config.companyLegalName &&
    config.companyAddress &&
    config.privacyPolicyUrl &&
    config.termsUrl,
  );

export function absoluteSiteUrl(pathname: string, config: PublicSiteConfig = siteConfig) {
  if (!config.origin) return undefined;
  return new URL(pathname, `${config.origin}/`).toString();
}

export function createCaratFlowStructuredData(config: PublicSiteConfig = siteConfig) {
  if (!requiredPublicConfigIsResolved(config)) return undefined;

  const organizationId = `${config.origin}/#organization`;
  const websiteId = `${config.origin}/#website`;
  const applicationId = `${config.origin}/#software`;
  const pricingUrl = `${config.origin}/#pricing`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: SITE_NAME,
        legalName: config.companyLegalName,
        url: config.origin,
        logo: absoluteSiteUrl("/brand/caratflow-mark.svg", config),
        email: config.contactEmail,
        address: {
          "@type": "PostalAddress",
          streetAddress: config.companyAddress,
          ...(config.companyCountryCode ? { addressCountry: config.companyCountryCode } : {}),
        },
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: SITE_NAME,
        url: config.origin,
        publisher: { "@id": organizationId },
      },
      {
        "@type": "SoftwareApplication",
        "@id": applicationId,
        name: SITE_NAME,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: SITE_DESCRIPTION,
        url: config.origin,
        publisher: { "@id": organizationId },
        offers: [
          {
            "@type": "Offer",
            name: "CaratFlow Launch",
            price: "100",
            priceCurrency: "USD",
            url: pricingUrl,
          },
          {
            "@type": "Offer",
            name: "CaratFlow Growth",
            price: "799",
            priceCurrency: "USD",
            url: pricingUrl,
          },
        ],
      },
    ],
  } as const;
}

export function serializeStructuredData(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
