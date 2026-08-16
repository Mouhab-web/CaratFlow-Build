import { partnerFeatures } from "@/content/site-content";
import { trackCta } from "@/lib/analytics";
import { setLeadIntent } from "@/lib/lead-intent";
import { ArrowIcon, FeatureGrid, SectionHeader, StatusBadge } from "./shared";

export default function PartnerSection() {
  return (
    <section
      className="partner-section section section--emerald"
      id="partner"
      aria-labelledby="partner-title"
    >
      <div className="partner-orbit" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="shell">
        <div className="product-title-row">
          <SectionHeader
            eyebrow="CARATFLOW PARTNER"
            title="Add dedicated capacity around the platform."
            inverse
          >
            <p>
              CaratFlow Partner combines the platform with a contractually defined Virtual Back
              Office for jewelry businesses that need ongoing technical, operational, and
              optimization support.
            </p>
          </SectionHeader>
          <StatusBadge status="Scoped service" />
        </div>
        <FeatureGrid features={partnerFeatures} inverse />
        <div className="partner-bottom">
          <div>
            <p className="scope-note">
              <strong>Scope note</strong> Services, hours, response commitments, exclusions, and
              deliverables are defined in a statement of work. Development, marketing, and support
              are never unlimited, and business results are not guaranteed.
            </p>
            <p className="outcome-copy">
              <span>Outcome</span> Give larger jewelry organizations one accountable partner for an
              agreed body of platform and operational work.
            </p>
          </div>
          <a
            className="button button--light"
            href="#demo"
            onClick={() => {
              setLeadIntent({ plan: "partner", modules: ["CaratFlow Partner"] });
              trackCta("partner");
            }}
          >
            Talk to CaratFlow <ArrowIcon />
          </a>
        </div>
      </div>
    </section>
  );
}
