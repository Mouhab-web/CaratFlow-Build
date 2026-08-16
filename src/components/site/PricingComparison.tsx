import { pricingComparison } from "@/content/site-content";

export default function PricingComparison() {
  return (
    <div className="comparison-wrap">
      <div className="comparison-heading">
        <div>
          <p className="eyebrow">COMPLETE COMPARISON</p>
          <h3>Plan allowances, side by side.</h3>
        </div>
        <p>
          Swipe or scroll the table horizontally on smaller screens. Every entitlement remains
          available.
        </p>
      </div>
      <div
        className="comparison-scroll"
        role="region"
        aria-label="CaratFlow plan comparison"
        tabIndex={0}
      >
        <table>
          <caption className="sr-only">
            Complete comparison of CaratFlow Launch, Growth, and Partner plans
          </caption>
          <thead>
            <tr>
              <th scope="col">Entitlement</th>
              <th scope="col">Launch</th>
              <th scope="col">Growth</th>
              <th scope="col">Partner</th>
            </tr>
          </thead>
          <tbody>
            {pricingComparison.map(([feature, launch, growth, partner]) => (
              <tr key={feature}>
                <th scope="row">{feature}</th>
                <td>{launch}</td>
                <td>{growth}</td>
                <td>{partner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="pricing-definitions">
        <div>
          <dt>Customizer-ready style</dt>
          <dd>A style with approved, optimized assets and valid configuration rules.</dd>
        </div>
        <div>
          <dt>Interactive session</dt>
          <dd>
            Starts when a visitor launches the customizer or try-on and resets after 30 minutes of
            inactivity.
          </dd>
        </div>
        <div>
          <dt>Approved connection</dt>
          <dd>
            An existing documented feed or connector that passes technical review—not a promise of
            bespoke API integration.
          </dd>
        </div>
        <div>
          <dt>Support</dt>
          <dd>
            Standard and priority support do not imply an SLA. Response commitments exist only when
            stated in the contract.
          </dd>
        </div>
      </dl>
    </div>
  );
}
