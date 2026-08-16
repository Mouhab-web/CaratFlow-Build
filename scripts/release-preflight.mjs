import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const TRANSIENT_HOSTS = [".lovable.app", ".vercel.app", ".pages.dev", ".workers.dev", ".r2.dev"];
const EXAMPLE_HOSTS = new Set(["example.com", "www.example.com"]);
const REQUIRED_TEXT = [
  "VITE_CONTACT_EMAIL",
  "VITE_COMPANY_LEGAL_NAME",
  "VITE_COMPANY_ADDRESS",
  "VITE_COMPANY_COUNTRY_CODE",
];

function valueIsMissing(value) {
  return !value?.trim() || /^\[[A-Z0-9_]+\]$/.test(value.trim());
}

function validateHttpsUrl(name, value, errors, { originOnly = false } = {}) {
  if (valueIsMissing(value)) {
    errors.push(`${name} is required.`);
    return undefined;
  }
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:") errors.push(`${name} must use HTTPS.`);
    if (url.username || url.password) errors.push(`${name} cannot contain credentials.`);
    if (originOnly && (url.pathname !== "/" || url.search || url.hash)) {
      errors.push(`${name} must be an origin without a path, query, or fragment.`);
    }
    if (
      EXAMPLE_HOSTS.has(host) ||
      TRANSIENT_HOSTS.some((suffix) => host === suffix.slice(1) || host.endsWith(suffix))
    ) {
      errors.push(`${name} must use the final owned production host, not ${host}.`);
    }
    return url;
  } catch {
    errors.push(`${name} must be a valid absolute URL.`);
    return undefined;
  }
}

export function validateReleaseEnvironment(environment) {
  const errors = [];
  const publicOrigin = validateHttpsUrl(
    "PUBLIC_SITE_ORIGIN",
    environment.PUBLIC_SITE_ORIGIN,
    errors,
    { originOnly: true },
  );
  const clientOrigin = validateHttpsUrl("VITE_SITE_ORIGIN", environment.VITE_SITE_ORIGIN, errors, {
    originOnly: true,
  });
  validateHttpsUrl("VITE_PRIVACY_POLICY_URL", environment.VITE_PRIVACY_POLICY_URL, errors);
  validateHttpsUrl("VITE_TERMS_URL", environment.VITE_TERMS_URL, errors);

  if (publicOrigin && clientOrigin && publicOrigin.origin !== clientOrigin.origin) {
    errors.push("PUBLIC_SITE_ORIGIN and VITE_SITE_ORIGIN must be identical.");
  }
  for (const name of REQUIRED_TEXT) {
    if (valueIsMissing(environment[name])) errors.push(`${name} is required.`);
  }
  if (
    environment.VITE_CONTACT_EMAIL &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(environment.VITE_CONTACT_EMAIL)
  ) {
    errors.push("VITE_CONTACT_EMAIL must be a valid public contact address.");
  }
  if (
    environment.VITE_COMPANY_COUNTRY_CODE &&
    !/^[A-Za-z]{2}$/.test(environment.VITE_COMPANY_COUNTRY_CODE)
  ) {
    errors.push("VITE_COMPANY_COUNTRY_CODE must be a two-letter country code.");
  }
  if (environment.DEPLOYMENT_ENV !== "production") {
    errors.push('DEPLOYMENT_ENV must equal "production" for a release.');
  }
  if (environment.VITE_DEPLOYMENT_ENV !== "production") {
    errors.push('VITE_DEPLOYMENT_ENV must equal "production" for a release.');
  }
  if (environment.ALLOW_INDEXING !== "true" || environment.VITE_ALLOW_INDEXING !== "true") {
    errors.push("ALLOW_INDEXING and VITE_ALLOW_INDEXING must both equal true.");
  }
  if (environment.LEAD_WEBHOOK_URL) {
    errors.push(
      "LEAD_WEBHOOK_URL is not an approved lead destination. Use a reviewed first-party lead-system binding.",
    );
  }

  // The production endpoint currently fails closed. Remove this gate only in the
  // same reviewed change that implements and tests an approved first-party sink.
  errors.push(
    "Lead delivery is unresolved: no approved first-party lead-system binding is implemented.",
  );

  return errors;
}

export function renderRobots(origin) {
  return `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
}

export function renderSitemap(origin) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${origin}/</loc></url>\n</urlset>\n`;
}

async function main() {
  const errors = validateReleaseEnvironment(process.env);
  if (errors.length > 0) {
    console.error("CaratFlow production release blocked:\n");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  if (process.argv.includes("--write-crawl")) {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const origin = new URL(process.env.PUBLIC_SITE_ORIGIN).origin;
    await Promise.all([
      writeFile(path.join(root, "public", "robots.txt"), renderRobots(origin), "utf8"),
      writeFile(path.join(root, "public", "sitemap.xml"), renderSitemap(origin), "utf8"),
    ]);
  }

  console.info("CaratFlow production configuration passed preflight.");
}

if (
  typeof process !== "undefined" &&
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main();
}
