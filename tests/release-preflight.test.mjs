import assert from "node:assert/strict";
import test from "node:test";

import {
  renderRobots,
  renderSitemap,
  validateReleaseEnvironment,
} from "../scripts/release-preflight.mjs";

const productionEnvironment = {
  PUBLIC_SITE_ORIGIN: "https://caratflow.test",
  VITE_SITE_ORIGIN: "https://caratflow.test",
  VITE_CONTACT_EMAIL: "hello@caratflow.test",
  VITE_COMPANY_LEGAL_NAME: "CaratFlow Test LLC",
  VITE_COMPANY_ADDRESS: "100 Test Street",
  VITE_COMPANY_COUNTRY_CODE: "US",
  VITE_PRIVACY_POLICY_URL: "https://caratflow.test/privacy",
  VITE_TERMS_URL: "https://caratflow.test/terms",
  DEPLOYMENT_ENV: "production",
  VITE_DEPLOYMENT_ENV: "production",
  ALLOW_INDEXING: "true",
  VITE_ALLOW_INDEXING: "true",
};

test("release check explicitly blocks the unresolved lead destination", () => {
  const errors = validateReleaseEnvironment(productionEnvironment);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Lead delivery is unresolved/i);
});

test("release check rejects preview hosts and mismatched origins", () => {
  const errors = validateReleaseEnvironment({
    ...productionEnvironment,
    PUBLIC_SITE_ORIGIN: "https://preview.lovable.app",
  });
  assert.ok(errors.some((error) => /final owned production host/i.test(error)));
  assert.ok(errors.some((error) => /must be identical/i.test(error)));
});

test("crawl renderers use only the validated absolute homepage", () => {
  const origin = "https://caratflow.test";
  assert.match(renderRobots(origin), /Sitemap: https:\/\/caratflow\.test\/sitemap\.xml/);
  assert.match(renderSitemap(origin), /<loc>https:\/\/caratflow\.test\/<\/loc>/);
  assert.doesNotMatch(renderSitemap(origin), /admin|demo/i);
});
