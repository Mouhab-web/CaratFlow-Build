import type { CSSProperties } from "react";
import { commerceFeatures } from "@/content/site-content";
import { trackCta } from "@/lib/analytics";
import { setLeadIntent } from "@/lib/lead-intent";
import ProductTabs from "./ProductTabs";
import { ArrowIcon, FeatureGrid, SectionHeader, StatusBadge } from "./shared";

// Live screenshots of the Azure Fine Jewellery storefront (azure.kmhub.online),
// captured full-page. Shown as the commerce reference until the storefront is
// integrated in a later phase.
const AZURE_SHOTS = [
  {
    label: "Storefront",
    file: "/assets/azure-preview/home.jpg",
    alt: "Azure Fine Jewellery storefront home page with category grid and featured necklace sets",
  },
  {
    label: "Categories",
    file: "/assets/azure-preview/categories.jpg",
    alt: "Azure Fine Jewellery category browsing page",
  },
  {
    label: "Product",
    file: "/assets/azure-preview/product.jpg",
    alt: "Azure Fine Jewellery product detail page with pricing, stock and add to cart",
  },
];

const shotFrameStyle: CSSProperties = {
  maxHeight: 460,
  overflowY: "auto",
  borderRadius: 14,
  border: "1px solid rgba(201, 161, 74, 0.25)",
  background: "#0a0a0a",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.03)",
};

function CommercePreview() {
  return (
    <div className="interface-frame interface-frame--commerce">
      <div className="interface-frame__header">
        <span className="sample-label">Live storefront reference</span>
        <span className="mock-brand">
          Azure Fine Jewellery <small>azure.kmhub.online</small>
        </span>
      </div>
      <ProductTabs
        label="Azure storefront screenshots"
        tabs={AZURE_SHOTS.map((shot) => ({
          label: shot.label,
          content: (
            <figure style={{ margin: 0 }}>
              <div style={shotFrameStyle}>
                <img
                  src={shot.file}
                  alt={shot.alt}
                  loading="lazy"
                  style={{ width: "100%", display: "block" }}
                />
              </div>
              <figcaption style={{ marginTop: "0.65rem", fontSize: "0.72rem", opacity: 0.6 }}>
                Captured from the live Azure Fine Jewellery storefront. Full ecommerce integration
                is planned for a later phase.
              </figcaption>
            </figure>
          ),
        }))}
      />
    </div>
  );
}

export default function CommerceSection() {
  return (
    <section
      className="commerce-section section section--stone"
      id="commerce"
      aria-labelledby="commerce-title"
    >
      <div className="shell">
        <div className="product-title-row">
          <SectionHeader
            eyebrow="CARATFLOW COMMERCE"
            title="Turn interactive discovery into a connected storefront."
          >
            <p>
              CaratFlow Commerce is the storefront layer for deployments that connect customization
              and try-on with approved product data and a purchase path. It can complement an
              existing site or support a new jewelry storefront after technical review.
            </p>
          </SectionHeader>
          <StatusBadge status="Configured deployment" />
        </div>
        <div className="product-split product-split--media-first">
          <CommercePreview />
          <FeatureGrid features={commerceFeatures} />
        </div>
        <div className="section-outcome">
          <p>
            <span>Outcome</span> Reduce unnecessary handoffs between product exploration and the
            next commercial action.
          </p>
          <a
            className="button button--primary"
            href="#demo"
            onClick={() => {
              setLeadIntent({ modules: ["Commerce"] });
              trackCta("commerce");
            }}
          >
            Discuss CaratFlow Commerce <ArrowIcon />
          </a>
        </div>
      </div>
    </section>
  );
}
