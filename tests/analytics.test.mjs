import assert from "node:assert/strict";
import test from "node:test";

import { setAnalyticsConsent, trackCta, trackEvent } from "../src/lib/analytics.ts";

test("analytics is consent gated and excludes unapproved parameters", () => {
  let consent = null;
  const dispatched = [];
  const PreviousCustomEvent = globalThis.CustomEvent;
  const PreviousWindow = globalThis.window;

  globalThis.CustomEvent ??= class CustomEvent {
    constructor(type, init) {
      this.type = type;
      this.detail = init.detail;
    }
  };
  globalThis.window = {
    localStorage: {
      getItem: () => consent,
      setItem: (_key, value) => {
        consent = value;
      },
    },
    dataLayer: [],
    dispatchEvent: (event) => {
      dispatched.push(event);
      return true;
    },
  };

  try {
    assert.equal(trackCta("hero"), false);
    assert.equal(window.dataLayer.length, 0);

    setAnalyticsConsent(true);
    assert.equal(trackCta("hero"), true);
    trackEvent("lead_form_error", {
      error_type: "validation",
      field_id: "workEmail",
      email: "must-not-leak@example.test",
    });

    assert.equal(window.dataLayer[0].event, "cta_primary_click");
    assert.equal(window.dataLayer[0].cta_location, "hero");
    assert.equal("email" in window.dataLayer[1], false);
    assert.equal(dispatched.length, 2);
  } finally {
    globalThis.window = PreviousWindow;
    globalThis.CustomEvent = PreviousCustomEvent;
  }
});
