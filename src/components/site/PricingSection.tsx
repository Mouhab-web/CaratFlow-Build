import { SectionHeader } from "./shared";
import PricingCards from "./PricingCards";
import PricingComparison from "./PricingComparison";

export default function PricingSection() {
  return (
    <section className="pricing-section section" id="pricing" aria-labelledby="pricing-title">
      <div className="shell">
        <SectionHeader
          eyebrow="CARATFLOW PLANS"
          title="Start with the right level of platform and support."
          align="center"
        >
          <p>
            Choose a controlled entry product, a connected growth platform, or a scoped partnership.
            Implementation and custom work are quoted before contract.
          </p>
        </SectionHeader>
        <PricingCards />
        <div className="pricing-disclosure">
          <p>
            Prices are in USD and exclude applicable taxes. One-time setup, implementation, catalog
            mapping, data migration, 3D or CAD asset preparation, custom design, bespoke
            integrations, third-party licenses, advertising spend, and usage above plan allowances
            are scoped and quoted before work begins.
          </p>
          <p>
            An interactive session begins when a visitor starts the customizer or try-on and resets
            after 30 minutes of inactivity.
          </p>
          <p>No annual discount is advertised until commercially approved.</p>
        </div>
        <PricingComparison />
      </div>
    </section>
  );
}
