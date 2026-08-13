import { useState } from "react";
import { tryOnFeatures } from "@/content/site-content";
import { trackEvent } from "@/lib/analytics";
import { ArrowIcon, FeatureGrid, SectionHeader } from "./shared";
import TryOnPreflightDialog from "./TryOnPreflightDialog";

type Category = "rings" | "earrings" | "necklaces";

function TryOnPoster({ category }: { category: Category }) {
  return (
    <div
      className="tryon-poster"
      role="img"
      aria-label={`CaratFlow browser try-on visual preview for ${category}`}
    >
      <div className="tryon-poster__bar">
        <span>Visual preview</span>
        <span>Camera off</span>
      </div>
      <div className={`tryon-preview tryon-preview--${category}`}>
        <div className="portrait-form" aria-hidden="true">
          <span className="portrait-head" />
          <span className="portrait-body" />
        </div>
        <div className="jewelry-overlay" aria-hidden="true">
          <i />
          <i />
          <b />
        </div>
        <div className="tracking-corners" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>
      <div className="tryon-poster__footer">
        <strong>
          {category === "rings"
            ? "Ring placement"
            : category === "earrings"
              ? "Earring overlay"
              : "Necklace overlay"}
        </strong>
        <span>
          {category === "rings" ? "3D browser demonstration" : "2D demonstration overlay"}
        </span>
      </div>
    </div>
  );
}

export default function TryOnSection() {
  const [category, setCategory] = useState<Category>("rings");
  const [dialogOpen, setDialogOpen] = useState(false);

  const open = () => {
    trackEvent("ar_preflight_open", { category });
    setDialogOpen(true);
  };

  return (
    <section className="tryon-section section" id="try-on" aria-labelledby="tryon-title">
      <div className="shell">
        <SectionHeader
          eyebrow="CARATFLOW TRY-ON · LIVE BROWSER DEMOS"
          title="Bring jewelry into the shopper’s own view."
        >
          <p>
            Preview supported rings, earrings, and necklaces through a camera-enabled browser
            experience. The current demos require camera permission and do not require a native app;
            compatibility varies by device and browser.
          </p>
        </SectionHeader>
        <div className="product-split product-split--tryon">
          <div className="product-media">
            <div className="media-category-switch" role="group" aria-label="Try-On categories">
              {(["rings", "earrings", "necklaces"] as const).map((item) => (
                <button
                  type="button"
                  key={item}
                  aria-pressed={category === item}
                  onClick={() => setCategory(item)}
                >
                  {item === "rings" ? "Rings" : item === "earrings" ? "Earrings" : "Necklaces"}
                </button>
              ))}
            </div>
            <TryOnPoster category={category} />
          </div>
          <FeatureGrid features={tryOnFeatures} />
        </div>
        <div className="section-outcome">
          <p>
            <span>Outcome</span> Give shoppers another way to visualize a design before moving
            forward.
          </p>
          <div className="section-actions">
            <button className="button button--primary" type="button" onClick={open}>
              Launch the Try-On Demo <ArrowIcon />
            </button>
            <small>Camera permission required. Compatibility varies by device and browser.</small>
          </div>
        </div>
      </div>
      {dialogOpen ? (
        <TryOnPreflightDialog initialCategory={category} onClose={() => setDialogOpen(false)} />
      ) : null}
    </section>
  );
}
