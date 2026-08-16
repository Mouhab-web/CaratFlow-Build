import { plans } from "@/content/site-content";
import { trackEvent } from "@/lib/analytics";
import { setLeadIntent } from "@/lib/lead-intent";
import { ArrowIcon, CheckIcon } from "./shared";

export default function PricingCards() {
  return (
    <div className="pricing-cards">
      {plans.map((plan) => (
        <article
          className={`pricing-card${plan.featured ? " pricing-card--featured" : ""}`}
          key={plan.id}
        >
          {plan.featured ? <span className="recommended-badge">RECOMMENDED</span> : null}
          <div className="pricing-card__head">
            <h3>{plan.name}</h3>
            <p className="plan-price">
              <strong>{plan.price}</strong>
              {plan.cadence ? <span>{plan.cadence}</span> : null}
            </p>
            <p>{plan.description}</p>
          </div>
          <div className="plan-includes">
            <strong>Includes:</strong>
            <ul>
              {plan.includes.map((item) => (
                <li key={item}>
                  <CheckIcon />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <a
            className={`button ${plan.featured ? "button--primary" : "button--secondary"}`}
            href="#demo"
            onClick={() => {
              setLeadIntent({
                plan: plan.id,
                modules: plan.id === "partner" ? ["CaratFlow Partner"] : undefined,
              });
              trackEvent("pricing_cta_click", { plan: plan.id });
            }}
          >
            {plan.cta} <ArrowIcon />
          </a>
        </article>
      ))}
    </div>
  );
}
