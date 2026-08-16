import { useState } from "react";
import { operationsFeatures } from "@/content/site-content";
import { trackCta } from "@/lib/analytics";
import { setLeadIntent } from "@/lib/lead-intent";
import { ArrowIcon, FeatureGrid, SectionHeader, StatusBadge } from "./shared";

const erpScreens = [
  {
    src: "/assets/crm/erp-dashboard-CricaQTx.jpg",
    label: "Dashboard",
    caption: "Sales, profit, orders and top products at a glance.",
  },
  {
    src: "/assets/crm/erp-inventory-CEIDWhA3.jpg",
    label: "Inventory & SKUs",
    caption: "Loose diamonds and finished rings with live stock value.",
  },
  {
    src: "/assets/crm/erp-crm-CY3CvpN0.jpg",
    label: "Orders & CRM",
    caption: "Orders pipeline from quote to delivery, per customer.",
  },
  {
    src: "/assets/crm/erp-metal-rates-CCoOuEK0.jpg",
    label: "Metal Rates",
    caption: "Live gold, silver and platinum spot rates by purity.",
  },
];

function ErpScreenshot({ src, label, caption }: { src: string; label: string; caption: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="erp-shot">
      <div className="erp-shot__bar" aria-hidden="true">
        <i />
        <i />
        <i />
        <span>{label}</span>
      </div>
      <div className="erp-shot__frame">
        {failed ? (
          <div className="erp-shot__fallback">
            <span>{label}</span>
            <small>Screenshot preview</small>
          </div>
        ) : (
          <img
            src={src}
            alt={`${label} — CaratFlow ERP & CRM demo screenshot`}
            loading="lazy"
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

function OperationsPreview() {
  return (
    <div className="interface-frame interface-frame--operations">
      <div className="interface-frame__header">
        <span className="sample-label">Demo screenshots</span>
        <span className="mock-brand">CaratFlow Operations · ERP &amp; CRM</span>
      </div>
      <div className="erp-gallery" role="group" aria-label="ERP and CRM dashboard screenshots">
        {erpScreens.map((shot) => (
          <ErpScreenshot key={shot.src} {...shot} />
        ))}
      </div>
    </div>
  );
}

export default function OperationsSection() {
  return (
    <section
      className="operations-section section"
      id="operations"
      aria-labelledby="operations-title"
    >
      <div className="shell">
        <div className="product-title-row">
          <SectionHeader
            eyebrow="CARATFLOW OPERATIONS"
            title="Connect the storefront to the work behind every order."
          >
            <p>
              CaratFlow Operations is the deployment layer for jewelry catalog, pricing, inventory,
              orders, and customer workflows. The exact modules, data sources, user roles, and
              integrations are confirmed before implementation.
            </p>
          </SectionHeader>
          <div className="status-stack">
            <StatusBadge status="Configured deployment" />
            <StatusBadge status="Integration-dependent" />
          </div>
        </div>
        <div className="product-split product-split--media-first">
          <OperationsPreview />
          <FeatureGrid features={operationsFeatures} />
        </div>
        <p className="product-disclosure">
          Screenshots show a representative ERP &amp; CRM back-office for demonstration. Final
          module availability is confirmed during solution design. A capability is never presented
          as native when it depends on a third-party integration.
        </p>
        <div className="section-outcome">
          <p>
            <span>Outcome</span> Create a clearer operational path between what the customer selects
            and what the team must price, source, fulfill, and support.
          </p>
          <a
            className="button button--primary"
            href="#demo"
            onClick={() => {
              setLeadIntent({ modules: ["Operations"] });
              trackCta("operations");
            }}
          >
            Map Your Operations <ArrowIcon />
          </a>
        </div>
      </div>
    </section>
  );
}
