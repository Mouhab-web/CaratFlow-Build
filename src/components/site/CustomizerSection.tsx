import { configurationClaim, customizerFeatures } from "@/content/site-content";
import { trackEvent } from "@/lib/analytics";
import { ArrowIcon, FeatureGrid, SectionHeader } from "./shared";
import RingCustomizerDemo, { CUSTOMIZER_LOAD_EVENT } from "./RingCustomizerDemo";

export default function CustomizerSection() {
  const begin = () => {
    trackEvent("customizer_begin", { entry_point: "section-cta" });
    window.dispatchEvent(new Event(CUSTOMIZER_LOAD_EVENT));
  };

  return (
    <section
      className="customizer-section section section--dark"
      id="customizer"
      aria-labelledby="customizer-title"
    >
      <div className="shell">
        <SectionHeader
          eyebrow="CARATFLOW CUSTOMIZER · FLAGSHIP MODULE · LIVE DEMO"
          title="Make complex ring choices easier to explore."
          inverse
        >
          <p>
            Guide shoppers through metal and purity, band, setting, center-stone shape, carat, halo,
            and side-stone choices in an interactive 3D experience built for considered jewelry
            purchases.
          </p>
        </SectionHeader>
        {configurationClaim.enabled ? (
          <p className="evidence-line">
            {configurationClaim.publicLabel} possible ring configurations
          </p>
        ) : null}
        <RingCustomizerDemo />
        <FeatureGrid features={customizerFeatures} inverse />
        <div className="section-outcome section-outcome--inverse">
          <p>
            <span>Outcome</span> A clearer path through complex options and a structured selection
            that can be mapped into configured commerce and order workflows.
          </p>
          <div className="section-actions">
            <a className="button button--light" href="#ring-customizer-demo" onClick={begin}>
              {configurationClaim.enabled
                ? `Explore ${configurationClaim.publicLabel} Configurations`
                : "Explore the Interactive Customizer"}{" "}
              <ArrowIcon />
            </a>
          </div>
          {configurationClaim.enabled ? (
            <small>
              Configuration count refers to possible option combinations, not products, inventory
              items, or manufacturable SKUs.
            </small>
          ) : null}
        </div>
      </div>
    </section>
  );
}
