import { useEffect, useRef, useState, type FormEvent } from "react";
import type { PlanId } from "@/content/site-content";
import { leadModules } from "@/content/site-content";
import { trackEvent } from "@/lib/analytics";
import type { LeadFieldErrors, LeadModule } from "@/lib/lead-validation";
import { LEAD_INTENT_EVENT, type LeadIntent } from "@/lib/lead-intent";
import { siteConfig } from "@/lib/site-config";
import { ArrowIcon, SectionHeader } from "./shared";

type FormValues = {
  name: string;
  workEmail: string;
  company: string;
  country: string;
  modules: LeadModule[];
  website: string;
  businessScale: string;
  currentPlatform: string;
  message: string;
  marketingConsent: boolean;
  faxNumber: string;
};

const initialValues: FormValues = {
  name: "",
  workEmail: "",
  company: "",
  country: "",
  modules: [],
  website: "",
  businessScale: "",
  currentPlatform: "",
  message: "",
  marketingConsent: false,
  faxNumber: "",
};

function validate(values: FormValues): LeadFieldErrors {
  const errors: LeadFieldErrors = {};
  if (!values.name.trim()) errors.name = "Enter your name.";
  if (!values.workEmail.trim()) errors.workEmail = "Enter your work email.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.workEmail))
    errors.workEmail = "Enter a valid work email address.";
  if (!values.company.trim()) errors.company = "Enter your company.";
  if (!values.country.trim()) errors.country = "Enter your country.";
  if (!values.modules.length) errors.modules = "Choose at least one module.";
  if (values.website && !/^(https?:\/\/)?[^\s]+\.[^\s]+$/i.test(values.website))
    errors.website = "Enter a valid website address.";
  return errors;
}

function FieldError({ id, children }: { id: string; children?: string }) {
  return children ? (
    <span className="field-error" id={`${id}-error`}>
      <span aria-hidden="true">!</span>
      {children}
    </span>
  ) : null;
}

export default function LeadForm() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [plan, setPlan] = useState<PlanId | "">("");
  const [errors, setErrors] = useState<LeadFieldErrors>({});
  const [status, setStatus] = useState<"idle" | "error" | "preview">("idle");
  const [message, setMessage] = useState("");
  const startedEventRef = useRef(false);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const onIntent = (event: Event) => {
      const intent = (event as CustomEvent<LeadIntent>).detail;
      if (intent.plan) setPlan(intent.plan);
      if (intent.modules?.length) {
        setValues((current) => ({
          ...current,
          modules: Array.from(new Set([...current.modules, ...intent.modules!])) as LeadModule[],
        }));
      }
    };
    window.addEventListener(LEAD_INTENT_EVENT, onIntent);
    return () => window.removeEventListener(LEAD_INTENT_EVENT, onIntent);
  }, []);

  useEffect(() => {
    if (status === "preview") successHeadingRef.current?.focus();
  }, [status]);

  const announceStart = () => {
    if (startedEventRef.current) return;
    startedEventRef.current = true;
    trackEvent("lead_form_start", { plan_interest: plan || "not_selected" });
  };

  const update = <K extends keyof FormValues>(field: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validateOnBlur = (field: keyof FormValues) => {
    const next = validate(values);
    setErrors((current) => ({ ...current, [field]: next[field] }));
  };

  const toggleModule = (module: LeadModule) => {
    update(
      "modules",
      values.modules.includes(module)
        ? values.modules.filter((item) => item !== module)
        : [...values.modules, module],
    );
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(values);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      setStatus("error");
      setMessage("Please review the highlighted fields and complete the required information.");
      trackEvent("lead_form_error", { error_type: "validation" });
      window.requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }
    trackEvent("lead_form_submit", { plan_interest: plan || "not_selected" });
    if (siteConfig.deploymentEnvironment === "production") {
      setStatus("error");
      setMessage(
        "We couldn’t send your request. Your entries have been preserved. The approved lead destination must be configured before launch.",
      );
      trackEvent("lead_form_error", { error_type: "destination_unconfigured" });
      window.requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }
    // Preview-safe by design: validate the complete UX without transmitting or storing PII.
    setStatus("preview");
  };

  if (status === "preview") {
    return (
      <div className="lead-success" role="status">
        <span className="success-mark" aria-hidden="true">
          ✓
        </span>
        <h3 tabIndex={-1} ref={successHeadingRef}>
          Thanks—your request has been received.
        </h3>
        <p>We’ll use the details you provided to prepare the right CaratFlow conversation.</p>
        <p className="preview-notice">
          <strong>Preview mode:</strong> This form was validated locally. Your details were not
          stored or transmitted.
        </p>
        <button
          className="button button--secondary"
          type="button"
          onClick={() => setStatus("idle")}
        >
          Return to form
        </button>
      </div>
    );
  }

  const errorFields = Object.entries(errors).filter(([, value]) => Boolean(value));

  return (
    <form className="lead-form" noValidate onSubmit={submit} onFocus={announceStart}>
      {status === "error" ? (
        <div className="error-summary" role="alert" tabIndex={-1} ref={errorSummaryRef}>
          <strong>{message}</strong>
          {errorFields.length ? (
            <ul>
              {errorFields.map(([field, value]) => (
                <li key={field}>
                  <a
                    href={`#lead-${field}`}
                    onClick={() => document.getElementById(`lead-${field}`)?.focus()}
                  >
                    {value}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <div className="form-grid">
        <label>
          <span>
            Name <b aria-hidden="true">*</b>
          </span>
          <input
            id="lead-name"
            name="name"
            autoComplete="name"
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
            onBlur={() => validateOnBlur("name")}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "name-error" : undefined}
          />
          <FieldError id="name">{errors.name}</FieldError>
        </label>
        <label>
          <span>
            Work email <b aria-hidden="true">*</b>
          </span>
          <input
            id="lead-workEmail"
            type="email"
            name="workEmail"
            autoComplete="email"
            value={values.workEmail}
            onChange={(e) => update("workEmail", e.target.value)}
            onBlur={() => validateOnBlur("workEmail")}
            aria-invalid={Boolean(errors.workEmail)}
            aria-describedby={errors.workEmail ? "workEmail-error" : undefined}
          />
          <FieldError id="workEmail">{errors.workEmail}</FieldError>
        </label>
        <label>
          <span>
            Company <b aria-hidden="true">*</b>
          </span>
          <input
            id="lead-company"
            name="company"
            autoComplete="organization"
            value={values.company}
            onChange={(e) => update("company", e.target.value)}
            onBlur={() => validateOnBlur("company")}
            aria-invalid={Boolean(errors.company)}
            aria-describedby={errors.company ? "company-error" : undefined}
          />
          <FieldError id="company">{errors.company}</FieldError>
        </label>
        <label>
          <span>
            Country <b aria-hidden="true">*</b>
          </span>
          <input
            id="lead-country"
            name="country"
            autoComplete="country-name"
            value={values.country}
            onChange={(e) => update("country", e.target.value)}
            onBlur={() => validateOnBlur("country")}
            aria-invalid={Boolean(errors.country)}
            aria-describedby={errors.country ? "country-error" : undefined}
          />
          <FieldError id="country">{errors.country}</FieldError>
        </label>
        <label>
          <span>
            Website <em>Optional</em>
          </span>
          <input
            id="lead-website"
            type="url"
            name="website"
            autoComplete="url"
            value={values.website}
            onChange={(e) => update("website", e.target.value)}
            onBlur={() => validateOnBlur("website")}
            aria-invalid={Boolean(errors.website)}
            aria-describedby={errors.website ? "website-error" : undefined}
          />
          <FieldError id="website">{errors.website}</FieldError>
        </label>
        <label>
          <span>
            Plan interest <em>Optional</em>
          </span>
          <select
            id="plan-interest"
            value={plan}
            onChange={(e) => setPlan(e.target.value as PlanId | "")}
          >
            <option value="">Not sure yet</option>
            <option value="launch">CaratFlow Launch</option>
            <option value="growth">CaratFlow Growth</option>
            <option value="partner">CaratFlow Partner</option>
          </select>
        </label>
        <label>
          <span>
            Number of products or locations <em>Optional</em>
          </span>
          <select
            id="lead-businessScale"
            value={values.businessScale}
            onChange={(e) => update("businessScale", e.target.value)}
          >
            <option value="">Choose a range</option>
            <option>1–25 products · one location</option>
            <option>26–250 products</option>
            <option>251–5,000 products</option>
            <option>5,000+ products or multiple locations</option>
          </select>
        </label>
        <label>
          <span>
            Current e-commerce, POS, or ERP platform <em>Optional</em>
          </span>
          <input
            id="lead-currentPlatform"
            value={values.currentPlatform}
            onChange={(e) => update("currentPlatform", e.target.value)}
          />
        </label>
      </div>
      <fieldset
        className="module-fieldset"
        id="lead-modules"
        aria-describedby={errors.modules ? "modules-error" : undefined}
      >
        <legend>
          Modules of interest <b aria-hidden="true">*</b>
        </legend>
        <div>
          {leadModules.map((module) => (
            <label key={module}>
              <input
                type="checkbox"
                checked={values.modules.includes(module)}
                onChange={() => toggleModule(module)}
              />
              <span>{module}</span>
            </label>
          ))}
        </div>
        <FieldError id="modules">{errors.modules}</FieldError>
      </fieldset>
      <label className="message-field">
        <span>
          Message <em>Optional</em>
        </span>
        <textarea
          id="lead-message"
          rows={4}
          maxLength={2000}
          value={values.message}
          onChange={(e) => update("message", e.target.value)}
        />
      </label>
      <label className="consent-field">
        <input
          type="checkbox"
          checked={values.marketingConsent}
          onChange={(e) => update("marketingConsent", e.target.checked)}
        />
        <span>Send me occasional CaratFlow product updates.</span>
      </label>
      <label className="honeypot" aria-hidden="true">
        Fax number
        <input
          tabIndex={-1}
          autoComplete="off"
          value={values.faxNumber}
          onChange={(e) => update("faxNumber", e.target.value)}
        />
      </label>
      <p className="privacy-helper">
        By submitting this form, you acknowledge the{" "}
        {siteConfig.privacyPolicyUrl ? (
          <a href={siteConfig.privacyPolicyUrl}>Privacy Policy</a>
        ) : (
          <span>Privacy Policy</span>
        )}{" "}
        and agree that CaratFlow may use the information provided to respond to this request.
      </p>
      <button className="button button--primary submit-button" type="submit">
        Request My Demo <ArrowIcon />
      </button>
    </form>
  );
}

export function DemoSection() {
  return (
    <section className="demo-section section section--dark" id="demo" aria-labelledby="demo-title">
      <div className="shell demo-grid">
        <div className="demo-copy">
          <SectionHeader
            eyebrow="BOOK A QUALIFIED DEMO"
            title="See where CaratFlow fits your jewelry business."
            inverse
          >
            <p>
              Tell us what you sell, which modules matter, and what systems you already use. We’ll
              use those details to prepare a relevant CaratFlow conversation.
            </p>
          </SectionHeader>
          <div className="demo-flow" aria-label="What happens next">
            <span>
              <b>01</b> Share your priorities
            </span>
            <i aria-hidden="true">→</i>
            <span>
              <b>02</b> We prepare the right product path
            </span>
            <i aria-hidden="true">→</i>
            <span>
              <b>03</b> Review scope together
            </span>
          </div>
        </div>
        <LeadForm />
      </div>
    </section>
  );
}
