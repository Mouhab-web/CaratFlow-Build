import assert from "node:assert/strict";
import test from "node:test";

import {
  createCaratFlowStructuredData,
  requiredPublicConfigIsResolved,
  resolvePublicSiteConfig,
} from "../src/lib/site-config.ts";

const validEnvironment = {
  VITE_SITE_ORIGIN: "https://caratflow.test",
  VITE_CONTACT_EMAIL: "hello@caratflow.test",
  VITE_COMPANY_LEGAL_NAME: "CaratFlow Test LLC",
  VITE_COMPANY_ADDRESS: "100 Test Street",
  VITE_COMPANY_COUNTRY_CODE: "US",
  VITE_PRIVACY_POLICY_URL: "https://caratflow.test/privacy",
  VITE_TERMS_URL: "https://caratflow.test/terms",
  VITE_DEPLOYMENT_ENV: "production",
  VITE_ALLOW_INDEXING: "true",
};

test("suppresses unresolved optional public values", () => {
  const config = resolvePublicSiteConfig({
    ...validEnvironment,
    VITE_DEMO_BOOKING_URL: "[DEMO_BOOKING_URL]",
    VITE_APPROVED_DEMO_URL: "",
  });
  assert.equal(config.demoBookingUrl, undefined);
  assert.equal(config.approvedDemoUrl, undefined);
});

test("does not index transient production hosts", () => {
  const config = resolvePublicSiteConfig({
    ...validEnvironment,
    VITE_SITE_ORIGIN: "https://caratflow-preview.vercel.app",
  });
  assert.equal(config.origin, undefined);
  assert.equal(config.allowIndexing, false);
});

test("emits truthful Organization, WebSite, and SoftwareApplication data", () => {
  const config = resolvePublicSiteConfig(validEnvironment);
  assert.equal(requiredPublicConfigIsResolved(config), true);
  const data = createCaratFlowStructuredData(config);
  assert.deepEqual(
    data["@graph"].map((node) => node["@type"]),
    ["Organization", "WebSite", "SoftwareApplication"],
  );
  assert.equal(data["@graph"][2].offers[0].price, "100");
  assert.equal(data["@graph"][2].offers[1].price, "799");
});

test("omits structured data when required legal values are absent", () => {
  const config = resolvePublicSiteConfig({
    ...validEnvironment,
    VITE_COMPANY_LEGAL_NAME: "[COMPANY_LEGAL_NAME]",
  });
  assert.equal(createCaratFlowStructuredData(config), undefined);
});
