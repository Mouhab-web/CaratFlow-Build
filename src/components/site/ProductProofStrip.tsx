import { configurationClaim } from "@/content/site-content";

export default function ProductProofStrip() {
  const proofItems = [
    ...(configurationClaim.enabled
      ? [
          {
            value: configurationClaim.publicLabel,
            label: "Possible ring configurations",
            href: "#customizer",
          },
        ]
      : [
          {
            value: "Validated options",
            label: "Configuration claim pending asset validation",
            href: "#customizer",
          },
        ]),
    {
      value: "Interactive 3D",
      label: "Drag, zoom, rotate, and change supported ring components",
      href: "#customizer",
    },
    {
      value: "Rings, earrings, and necklaces",
      label: "Camera-based browser demonstrations for the currently supported categories",
      href: "#try-on",
    },
  ];

  return (
    <section className="proof section section--stone" id="proof" aria-labelledby="proof-title">
      <div className="shell">
        <div className="proof-heading">
          <div>
            <p className="eyebrow">PRODUCT PROOF</p>
            <h2 id="proof-title">Working jewelry technology, shown clearly.</h2>
          </div>
          <p>
            CaratFlow’s current product environment demonstrates interactive ring configuration and
            browser-based jewelry try-on. Product proof replaces unsupported customer statistics,
            testimonials, and performance promises.
          </p>
        </div>
        <div className="proof-grid">
          {proofItems.map((item, index) => (
            <a href={item.href} className="proof-item" key={item.value}>
              <span className="proof-index" aria-hidden="true">
                0{index + 1}
              </span>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
              <span className="proof-arrow" aria-hidden="true">
                ↗
              </span>
            </a>
          ))}
        </div>
        <p className="disclosure">
          <span aria-hidden="true">●</span> Current try-on demos require camera permission. Device
          and browser compatibility varies.
        </p>
      </div>
    </section>
  );
}
