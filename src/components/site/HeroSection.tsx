import { configurationClaim } from "@/content/site-content";
import { trackCta, trackEvent } from "@/lib/analytics";
import { ArrowIcon } from "./shared";

function RingIllustration() {
  return (
    <svg
      className="ring-illustration"
      viewBox="0 0 520 420"
      role="img"
      aria-label="Configured emerald-cut ring in yellow gold"
    >
      <defs>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1d49a" />
          <stop offset="0.5" stopColor="#b38b4d" />
          <stop offset="1" stopColor="#725125" />
        </linearGradient>
        <linearGradient id="stone" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f8fff9" />
          <stop offset="0.45" stopColor="#c9e0d7" />
          <stop offset="1" stopColor="#719486" />
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="0" dy="18" stdDeviation="18" floodOpacity=".22" />
        </filter>
      </defs>
      <ellipse
        cx="260"
        cy="304"
        rx="126"
        ry="88"
        fill="none"
        stroke="url(#gold)"
        strokeWidth="24"
        filter="url(#shadow)"
      />
      <path
        d="M196 242 214 174h92l18 68"
        fill="none"
        stroke="url(#gold)"
        strokeWidth="12"
        strokeLinejoin="round"
      />
      <path
        d="m208 178 22-39h60l22 39-22 55h-60Z"
        fill="url(#stone)"
        stroke="#eaf2ee"
        strokeWidth="6"
      />
      <path
        d="m230 139 10 31 20-31 20 31 10-31M208 178h104M230 233l30-55 30 55"
        fill="none"
        stroke="#fff"
        strokeOpacity=".58"
        strokeWidth="3"
      />
      <circle cx="181" cy="257" r="9" fill="url(#stone)" />
      <circle cx="339" cy="257" r="9" fill="url(#stone)" />
    </svg>
  );
}

export function CustomizerPoster({ compact = false }: { compact?: boolean }) {
  return (
    <figure className={`customizer-poster${compact ? " customizer-poster--compact" : ""}`}>
      <div className="poster-toolbar">
        <span className="poster-brand">CaratFlow Customizer</span>
        <span className="poster-live">
          <i /> Live demo
        </span>
      </div>
      <div className="poster-layout">
        <div className="poster-stage">
          <div className="poster-stage__label">Sample configuration</div>
          <RingIllustration />
          <div className="poster-tools" aria-hidden="true">
            <span>↻</span>
            <span>＋</span>
            <span>−</span>
          </div>
        </div>
        <div className="poster-controls">
          <p className="poster-kicker">Your selection</p>
          <h3>Emerald solitaire</h3>
          <dl>
            <div>
              <dt>Metal</dt>
              <dd>18K yellow gold</dd>
            </div>
            <div>
              <dt>Band</dt>
              <dd>Standard</dd>
            </div>
            <div>
              <dt>Setting</dt>
              <dd>4 prong</dd>
            </div>
            <div>
              <dt>Center stone</dt>
              <dd>Emerald · 1.5 ct</dd>
            </div>
          </dl>
          <div className="poster-path" aria-label="Selection flow">
            <span>Configuration ID</span>
            <i aria-hidden="true">→</i>
            <span>Purchase path</span>
            <i aria-hidden="true">→</i>
            <span>Order workflow</span>
          </div>
        </div>
      </div>
      <figcaption>
        CaratFlow ring customizer showing a configured ring and its selected product options.
        Interactive demo below.
      </figcaption>
    </figure>
  );
}

export default function HeroSection() {
  return (
    <section className="hero section" id="top" aria-labelledby="hero-title">
      <div className="hero-wash" aria-hidden="true" />
      <div className="shell hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">THE UNIFIED JEWELRY COMMERCE PLATFORM</p>
          <h1 id="hero-title">Configure. Try on. Sell. Operate. Grow.</h1>
          <p className="hero-lede">
            CaratFlow helps jewelers, jewelry brands, and retailers turn complex products into
            interactive buying experiences—and connect those experiences to the storefront, catalog,
            pricing, inventory, orders, and customer workflows behind them.
          </p>
          <div className="hero-actions">
            <a className="button button--primary" href="#demo" onClick={() => trackCta("hero")}>
              Book a Demo <ArrowIcon />
            </a>
            <a
              className="button button--secondary"
              href="#customizer"
              onClick={() =>
                trackEvent("demo_secondary_click", { module: "customizer", cta_location: "hero" })
              }
            >
              Explore the Customizer
            </a>
          </div>
          <p className="pricing-line">
            Plans start at <strong>$100/month.</strong> Setup and implementation are scoped
            separately.
          </p>
          <div className="hero-proof-badge">
            <span>Flagship module</span>
            <i aria-hidden="true" />
            <strong>
              {configurationClaim.enabled
                ? `${configurationClaim.publicLabel} possible ring configurations`
                : "Interactive ring configuration"}
            </strong>
          </div>
        </div>
        <div className="hero-media">
          <CustomizerPoster />
        </div>
      </div>
    </section>
  );
}
