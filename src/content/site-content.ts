import { CONFIGURATION_VALIDATION } from "@/lib/ring-config";

export type AvailabilityStatus =
  "Live demo" | "Configured deployment" | "Integration-dependent" | "Scoped service";

export type Feature = {
  title: string;
  body: string;
};

// Enabled only after scripts/validate-ring-config.mjs verifies every selectable state.
export const configurationClaim = {
  enabled: CONFIGURATION_VALIDATION.claimEnabled,
  total: CONFIGURATION_VALIDATION.total,
  publicLabel: "240,000+",
} as const;

export const navigation = [
  { href: "#platform", label: "Platform" },
  { href: "#customizer", label: "Customizer" },
  { href: "#try-on", label: "Try-On" },
  { href: "#operations", label: "Operations" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
] as const;

export const workflow = [
  {
    title: "Configure",
    body: "Guide complex jewelry choices through valid, understandable options.",
    status: "Live demo" as AvailabilityStatus,
  },
  {
    title: "Try On",
    body: "Preview supported jewelry through a camera-enabled browser.",
    status: "Live demo" as AvailabilityStatus,
  },
  {
    title: "Sell",
    body: "Connect product discovery to an approved storefront and purchase path.",
    status: "Configured deployment" as AvailabilityStatus,
  },
  {
    title: "Operate",
    body: "Organize catalog, pricing, inventory, orders, and customer workflows.",
    status: "Integration-dependent" as AvailabilityStatus,
  },
  {
    title: "Grow",
    body: "Add scoped technical and operational capacity as the business expands.",
    status: "Scoped service" as AvailabilityStatus,
  },
] as const;

export const customizerFeatures: Feature[] = [
  {
    title: "Metal and purity",
    body: "Compare platinum, white gold, yellow gold, and rose gold options in supported purities.",
  },
  {
    title: "Band and setting",
    body: "Move between supported band structures, settings, and prong treatments.",
  },
  {
    title: "Stone selection",
    body: "Explore supported center-stone shapes and carat presentations.",
  },
  {
    title: "Finishing details",
    body: "Add compatible halo and side-stone treatments where available.",
  },
  {
    title: "Interactive 3D",
    body: "Drag, zoom, rotate, reset, and use a guided product demonstration.",
  },
];

export const tryOnFeatures: Feature[] = [
  {
    title: "Rings",
    body: "Place the selected ring design over a detected hand in the current 3D browser demonstration.",
  },
  {
    title: "Earrings and necklaces",
    body: "Preview the supported earring and necklace styles using the current camera-based 2D overlays.",
  },
  {
    title: "Finish comparison",
    body: "Compare supported gold, silver, and rose-tone treatments in the current earring and necklace demonstration.",
  },
  {
    title: "Clear user control",
    body: "Start the camera deliberately, switch supported controls, capture only when requested, and exit at any time.",
  },
];

export const commerceFeatures: Feature[] = [
  {
    title: "Jewelry-ready catalog",
    body: "Structure supported products around metals, purity, stones, carat, settings, certificates, and other approved attributes.",
  },
  {
    title: "Connected discovery",
    body: "Carry a supported product selection from the customizer or try-on experience toward the product page, inquiry, quote, appointment, cart, or checkout configured for the deployment.",
  },
  {
    title: "Commerce configuration",
    body: "Configure approved payment, shipping, tax, currency, account, and checkout providers for the selected market and commerce stack.",
  },
  {
    title: "Existing-site flexibility",
    body: "Evaluate embedded modules, data connections, or a complete CaratFlow storefront without assuming that every customer must replatform.",
  },
];

export const operationsFeatures: Feature[] = [
  {
    title: "Catalog and inventory",
    body: "Configure product records, SKUs, stones, metals, weights, purity, availability, locations, and other approved jewelry attributes.",
  },
  {
    title: "Orders and customer records",
    body: "Organize supported quotes, order stages, fulfillment details, and customer history. Repair or service workflows are included only when specifically configured.",
  },
  {
    title: "Metal and margin rules",
    body: "Use an approved market feed or authorized manual rate and apply configured purity, making-charge, wastage, margin, currency, and rounding rules.",
  },
  {
    title: "Reporting and connections",
    body: "Present approved operational summaries and connect external systems through supported data feeds or scoped integrations.",
  },
];

export const partnerFeatures: Feature[] = [
  {
    title: "Dedicated ownership",
    body: "Add an assigned account lead and agreed technical or operational resources.",
  },
  {
    title: "Custom platform work",
    body: "Scope data migration, bespoke integrations, custom workflows, and product development.",
  },
  {
    title: "Technical operations",
    body: "Define maintenance, infrastructure, monitoring, release, and support responsibilities.",
  },
  {
    title: "Growth support",
    body: "Scope analytics, reporting, localization, conversion optimization, SEO, or campaign support where required.",
  },
];

export const implementationSteps = [
  {
    title: "Assess",
    body: "Define business priorities, product categories, markets, systems, data quality, and required CaratFlow modules.",
  },
  {
    title: "Configure",
    body: "Set plan allowances, valid product rules, user roles, supported categories, and commercial workflows.",
  },
  {
    title: "Connect",
    body: "Import approved catalog data and connect supported feeds, providers, or external systems.",
  },
  {
    title: "Brand and validate",
    body: "Apply the brand, optimize assets, test integrations, review claims, and complete accessibility, privacy, and device QA.",
  },
  {
    title: "Launch and improve",
    body: "Deploy the approved experience, monitor meaningful product and lead actions, and deliver improvements covered by the subscription or statement of work.",
  },
] as const;

export type PlanId = "launch" | "growth" | "partner";

export type Plan = {
  id: PlanId;
  name: string;
  price: string;
  cadence?: string;
  description: string;
  featured?: boolean;
  includes: string[];
  cta: string;
};

export const plans: Plan[] = [
  {
    id: "launch",
    name: "CaratFlow Launch",
    price: "$100",
    cadence: "/month",
    description:
      "A standardized starting point for independent jewelers testing interactive commerce.",
    includes: [
      "One standard ring-customizer template.",
      "Up to 25 catalog products.",
      "Ring try-on for the included supported template.",
      "One embeddable experience or starter catalog page.",
      "1,000 pooled interactive sessions per month.",
      "One site, one market, one currency, one location, and two team users.",
      "5 GB of hosted product assets.",
      "Standard email support.",
      "Managed hosting for the included experience.",
    ],
    cta: "Start with CaratFlow Launch",
  },
  {
    id: "growth",
    name: "CaratFlow Growth",
    price: "$799",
    cadence: "/month",
    description:
      "For growing jewelry businesses ready to connect interactive selling with a configured storefront and core operations.",
    featured: true,
    includes: [
      "Everything in Launch.",
      "Up to 250 customizer-ready styles.",
      "Up to 5,000 catalog products.",
      "Ring, earring, and necklace try-on for compatible approved assets.",
      "One configured CaratFlow Commerce storefront.",
      "CaratFlow Operations core.",
      "25,000 pooled interactive sessions per month.",
      "Up to three locations, three configured markets or currencies, and ten team users.",
      "50 GB of hosted product assets.",
      "One approved catalog or data-feed connection.",
      "Product and lead analytics.",
      "Priority email support.",
    ],
    cta: "Book a Growth Demo",
  },
  {
    id: "partner",
    name: "CaratFlow Partner",
    price: "Custom",
    description:
      "For larger, multi-brand, multi-location, or integration-heavy jewelry organizations.",
    includes: [
      "Everything in Growth.",
      "Negotiated products, styles, interactions, brands, locations, users, and markets.",
      "Custom migration and bespoke integration scope.",
      "Dedicated account ownership.",
      "Allocated custom development.",
      "Virtual Back Office.",
      "Contracted technical and operational services.",
      "Support commitments and SLA options defined in the agreement.",
    ],
    cta: "Talk to CaratFlow",
  },
];

export const pricingComparison = [
  ["Monthly platform price", "$100", "$799", "Custom"],
  [
    "Ideal customer",
    "Controlled first deployment",
    "Growing jewelry business",
    "Complex or enterprise organization",
  ],
  ["Standard customizer templates", "1", "Included", "Negotiated"],
  ["Customizer-ready styles", "1 standard template", "Up to 250", "Negotiated"],
  ["Catalog products", "Up to 25", "Up to 5,000", "Negotiated"],
  ["Monthly interactive sessions", "1,000 pooled", "25,000 pooled", "Negotiated"],
  [
    "Try-on categories",
    "Ring for included template",
    "Rings, earrings, necklaces for approved assets",
    "Negotiated categories",
  ],
  [
    "Commerce",
    "Embed or starter catalog page",
    "One configured storefront",
    "Multi-brand or custom architecture",
  ],
  [
    "Operations",
    "Starter catalog administration",
    "Operations core",
    "Custom modules and workflows",
  ],
  ["Markets/currencies", "1", "Up to 3 configured", "Negotiated"],
  ["Locations", "1", "Up to 3", "Negotiated"],
  ["Team users", "2", "10", "Negotiated"],
  ["Hosted asset storage", "5 GB", "50 GB", "Negotiated"],
  [
    "Catalog/data connection",
    "Controlled setup import",
    "One approved connection or feed",
    "Custom integrations",
  ],
  [
    "Analytics",
    "Essential usage and lead events",
    "Product and lead analytics",
    "Custom reporting",
  ],
  ["Support", "Standard email", "Priority email", "Dedicated and contractual"],
  ["Virtual Back Office", "No", "No", "Yes, by statement of work"],
  ["Custom development", "Quoted separately", "Quoted separately", "Allocated by scope"],
  ["Setup and migration", "Quoted separately", "Quoted separately", "Quoted in engagement"],
  [
    "Usage above allowance",
    "Quoted overage or plan change",
    "Quoted overage or plan change",
    "Contracted capacity",
  ],
] as const;

export const faqs = [
  {
    id: "existing-website",
    question: "Can CaratFlow work with an existing website?",
    answer:
      "Yes. The Customizer and Try-On modules can be evaluated for an existing site, while CaratFlow Commerce can support a new storefront. The final approach depends on the current platform, APIs, security settings, product data, and approved integration scope.",
  },
  {
    id: "beyond-rings",
    question: "Is CaratFlow only for ring sellers?",
    answer:
      "No. The ring customizer is the flagship module. The current try-on demonstrations support rings, earrings, and necklaces. Additional jewelry categories are offered only after product-asset and device testing.",
  },
  {
    id: "try-on-app",
    question: "Does CaratFlow Try-On require an app?",
    answer:
      "The current demonstrations run in a compatible web browser and do not require a native app. Camera permission is required. When a browser or device is unsupported, the experience must provide a static or recorded fallback.",
  },
  {
    id: "current-systems",
    question: "Can CaratFlow use our current catalog or operational system?",
    answer:
      "Potentially. CaratFlow first reviews the catalog structure, available exports, feeds, and API documentation. Launch uses a controlled import; Growth includes one approved catalog or data-feed connection; custom transformations and bespoke integrations are separately scoped.",
  },
  {
    id: "metal-pricing",
    question: "How do metal-price updates work?",
    answer:
      "A deployment can use an approved market feed or an authorized manual desk rate, then apply configured purity, making-charge, wastage, margin, currency, and rounding rules. Automatic repricing is enabled only after the feed, cadence, overrides, and audit behavior are approved.",
  },
  {
    id: "launch-plan",
    question: "What is included in the $100/month Launch plan?",
    answer:
      "Launch includes one standard ring-customizer template, up to 25 catalog products, ring try-on for the included template, one embeddable experience or starter catalog page, 1,000 monthly interactive sessions, two users, one location, and standard email support. Custom design, migration, asset production, and integrations are separate.",
  },
  {
    id: "setup-fees",
    question: "Are setup or implementation fees required?",
    answer:
      "They may be. Any required setup, product-data mapping, migration, 3D or CAD preparation, custom design, third-party license, or integration work is scoped and quoted before the contract is signed.",
  },
  {
    id: "markets",
    question: "Can CaratFlow support multiple currencies, languages, locations, or markets?",
    answer:
      "Growth and Partner deployments can be configured for approved currencies, languages, locations, and markets. Availability depends on the selected commerce providers, tax and shipping requirements, translation scope, and external systems.",
  },
  {
    id: "data-ownership",
    question: "Who owns the customer and product data?",
    answer:
      "Ownership, access, export, retention, and deletion terms must be stated in the service agreement and privacy documentation. CaratFlow will not publish a broader data-ownership promise until those terms have legal approval.",
  },
  {
    id: "support",
    question: "What support and Virtual Back Office services are available?",
    answer:
      "Launch includes standard email support. Growth includes priority email support. Partner can include dedicated account ownership, technical operations, development, integrations, reporting, localization, SEO, conversion optimization, or campaign support. Hours, deliverables, exclusions, response commitments, and SLAs are defined in the statement of work.",
  },
] as const;

export const analyticsIds = {
  heroPrimary: "hero",
  navPrimary: "navigation",
  customizer: "customizer",
  tryOn: "try-on",
  commerce: "commerce",
  operations: "operations",
  partner: "partner",
  pricing: "pricing",
  final: "final-cta",
} as const;

export const leadModules = [
  "Customizer",
  "Try-On",
  "Commerce",
  "Operations",
  "CaratFlow Partner",
] as const;
