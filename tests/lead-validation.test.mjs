import assert from "node:assert/strict";
import test from "node:test";

import { LEAD_MIN_FILL_MS, validateLeadSubmission } from "../src/lib/lead-validation.ts";

const NOW = 1_800_000_000_000;

function validLead(overrides = {}) {
  return {
    name: "Amina Noor",
    workEmail: "AMINA@JEWELER.TEST",
    company: "Noor Jewelry",
    country: "Saudi Arabia",
    modules: ["Customizer", "Commerce"],
    website: "jeweler.test",
    marketingConsent: false,
    formStartedAt: NOW - LEAD_MIN_FILL_MS - 1,
    faxNumber: "",
    ...overrides,
  };
}

test("normalizes a complete lead without retaining empty honeypot data", () => {
  const result = validateLeadSubmission(validLead(), NOW);
  assert.equal(result.success, true);
  assert.equal(result.suspicious, false);
  assert.equal(result.data.workEmail, "amina@jeweler.test");
  assert.equal(result.data.website, "https://jeweler.test/");
  assert.equal("faxNumber" in result.data, false);
});

test("rejects unknown modules and invalid required fields", () => {
  const result = validateLeadSubmission(
    validLead({ workEmail: "not-an-email", country: "", modules: ["Unapproved"] }),
    NOW,
  );
  assert.equal(result.success, false);
  assert.match(result.fieldErrors.workEmail, /valid work email/i);
  assert.match(result.fieldErrors.country, /required/i);
  assert.match(result.fieldErrors.modules, /listed CaratFlow modules/i);
});

test("marks both the time trap and honeypot as suspicious", () => {
  const fast = validateLeadSubmission(validLead({ formStartedAt: NOW - 50 }), NOW);
  const trapped = validateLeadSubmission(validLead({ faxNumber: "bot value" }), NOW);
  assert.equal(fast.success, true);
  assert.equal(fast.suspicious, true);
  assert.equal(trapped.success, true);
  assert.equal(trapped.suspicious, true);
});

test("expires stale forms to limit replay", () => {
  const result = validateLeadSubmission(validLead({ formStartedAt: NOW - 86_400_000 }), NOW);
  assert.equal(result.success, false);
  assert.match(result.fieldErrors.formStartedAt, /expired/i);
});
