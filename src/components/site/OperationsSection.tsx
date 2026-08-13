import { operationsFeatures } from "@/content/site-content";
import { trackCta } from "@/lib/analytics";
import { setLeadIntent } from "@/lib/lead-intent";
import ProductTabs from "./ProductTabs";
import { ArrowIcon, FeatureGrid, SectionHeader, StatusBadge } from "./shared";

const sampleRows = [
  ["ARC-01", "Arc solitaire", "Configured", "12"],
  ["HALO-07", "North halo", "Review", "4"],
  ["BAND-12", "Contour band", "Configured", "18"],
];

function OperationsPreview() {
  return (
    <div className="interface-frame interface-frame--operations">
      <div className="interface-frame__header">
        <span className="sample-label">Sample data</span>
        <span className="mock-brand">CaratFlow Operations</span>
      </div>
      <ProductTabs
        label="Operations dashboard views"
        tabs={[
          {
            label: "Catalog",
            content: (
              <div className="ops-panel">
                <div className="metric-row">
                  <span>
                    <b>5,000</b> Product capacity
                  </span>
                  <span>
                    <b>34</b> Sample styles
                  </span>
                  <span>
                    <b>3</b> Locations
                  </span>
                </div>
                <div
                  className="table-scroll"
                  role="region"
                  aria-label="Sample catalog table"
                  tabIndex={0}
                >
                  <table>
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Product</th>
                        <th>Status</th>
                        <th>Available</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sampleRows.map((row) => (
                        <tr key={row[0]}>
                          {row.map((cell) => (
                            <td key={cell}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ),
          },
          {
            label: "Orders",
            content: (
              <div className="ops-panel">
                <div className="metric-row">
                  <span>
                    <b>18</b> New inquiries
                  </span>
                  <span>
                    <b>7</b> Quotes open
                  </span>
                  <span>
                    <b>5</b> In fulfillment
                  </span>
                </div>
                <ol className="order-list">
                  <li>
                    <span>CF-1048</span>
                    <b>Configuration review</b>
                    <em>Assigned</em>
                  </li>
                  <li>
                    <span>CF-1047</span>
                    <b>Quote prepared</b>
                    <em>Awaiting approval</em>
                  </li>
                  <li>
                    <span>CF-1046</span>
                    <b>Fulfillment handoff</b>
                    <em>In progress</em>
                  </li>
                </ol>
              </div>
            ),
          },
          {
            label: "Pricing",
            content: (
              <div className="ops-panel">
                <div className="pricing-rule">
                  <span>Authorized metal rate</span>
                  <b>Manual desk rate</b>
                  <small>Last reviewed · Sample only</small>
                </div>
                <div className="rule-flow">
                  <span>Rate</span>
                  <i>＋</i>
                  <span>Purity</span>
                  <i>＋</i>
                  <span>Making charge</span>
                  <i>＋</i>
                  <span>Margin</span>
                  <i>→</i>
                  <strong>Quoted price</strong>
                </div>
              </div>
            ),
          },
          {
            label: "Reporting",
            content: (
              <div className="ops-panel">
                <div className="chart-summary">
                  <div className="bar-chart" aria-hidden="true">
                    {[38, 62, 49, 78, 72, 92].map((height, index) => (
                      <i key={index} style={{ height: `${height}%` }} />
                    ))}
                  </div>
                  <div>
                    <p className="mock-kicker">Text summary</p>
                    <h3>Qualified product interest increased across the six sample periods.</h3>
                    <p>
                      This conceptual chart uses synthetic values and does not represent a customer
                      result.
                    </p>
                  </div>
                </div>
              </div>
            ),
          },
        ]}
      />
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
          Final module availability is confirmed during solution design. A capability is never
          presented as native when it depends on a third-party integration.
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
