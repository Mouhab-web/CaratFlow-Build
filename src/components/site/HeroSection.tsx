import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { configurationClaim } from "@/content/site-content";
import { trackCta, trackEvent } from "@/lib/analytics";
import { ArrowIcon } from "./shared";

const HeroRing = lazy(() => import("./HeroRing"));

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

type HeroSlide = {
  id: string;
  eyebrow: string;
  title: string;
  lede: string;
  proof: string;
};

const HERO_SLIDES: HeroSlide[] = [
  {
    id: "unified",
    eyebrow: "THE UNIFIED JEWELRY COMMERCE PLATFORM",
    title: "Configure. Try on. Sell. Operate. Grow.",
    lede: "CaratFlow turns complex jewelry into interactive buying experiences — wired to the storefront, catalog, pricing, inventory, orders, and customer workflows behind them.",
    proof: configurationClaim.enabled
      ? `${configurationClaim.publicLabel} possible ring configurations`
      : "Interactive ring configuration",
  },
];

const AUTOPLAY_MS = 7000;

export default function HeroSection() {
  const slides = HERO_SLIDES;
  const multiple = slides.length > 1;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback(
    (next: number) => setIndex((current) => (next + slides.length) % slides.length),
    [slides.length],
  );

  // Autoplay only makes sense with more than one slide; pauses on hover/focus
  // and respects reduced-motion.
  const reducedRef = useRef(false);
  useEffect(() => {
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);
  useEffect(() => {
    if (!multiple || paused || reducedRef.current) return;
    const timer = setInterval(() => go(index + 1), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [multiple, paused, index, go]);

  const active = slides[index];

  return (
    <section
      className="hero-slider section--dark"
      id="top"
      aria-labelledby="hero-title"
      aria-roledescription="carousel"
      aria-label="CaratFlow highlights"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="hero-slider__backdrop" aria-hidden="true" />
      <div className="hero-slider__glow" aria-hidden="true" />
      <div className="hero-slider__grain" aria-hidden="true" />

      <div className="hero-slider__viewport">
        {slides.map((slide, i) => (
          <article
            key={slide.id}
            className={`hero-slide${i === index ? " is-active" : ""}`}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${slides.length}`}
            aria-hidden={i === index ? undefined : true}
            hidden={i === index ? undefined : true}
          >
            <div className="shell hero-slide__grid">
              <div className="hero-slide__copy">
                <p className="hero-slide__eyebrow">{slide.eyebrow}</p>
                <h1 id="hero-title" className="hero-slide__title">
                  {slide.title}
                </h1>
                <p className="hero-slide__lede">{slide.lede}</p>
                <div className="hero-slide__actions">
                  <a className="button button--light" href="#demo" onClick={() => trackCta("hero")}>
                    Book a Demo <ArrowIcon />
                  </a>
                  <a
                    className="button hero-slide__ghost"
                    href="#customizer"
                    onClick={() =>
                      trackEvent("demo_secondary_click", {
                        module: "customizer",
                        cta_location: "hero",
                      })
                    }
                  >
                    Explore the Customizer
                  </a>
                </div>
                <div className="hero-slide__meta">
                  <span className="hero-slide__price">
                    Plans start at <strong>$100/month</strong>
                  </span>
                  <span className="hero-slide__dot" aria-hidden="true" />
                  <span className="hero-slide__proof">{slide.proof}</span>
                </div>
              </div>

              <div className="hero-slide__visual" aria-hidden="true">
                <div className="hero-ring">
                  <span className="hero-ring__halo" />
                  <Suspense fallback={<RingIllustration />}>
                    <HeroRing />
                  </Suspense>
                  <span className="hero-ring__pedestal" />
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {multiple ? (
        <div className="hero-slider__controls">
          <button
            type="button"
            className="hero-slider__arrow"
            aria-label="Previous slide"
            onClick={() => go(index - 1)}
          >
            ‹
          </button>
          <div className="hero-slider__dots" role="tablist" aria-label="Choose slide">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Slide ${i + 1}`}
                className={`hero-slider__dot${i === index ? " is-active" : ""}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
          <button
            type="button"
            className="hero-slider__arrow"
            aria-label="Next slide"
            onClick={() => go(index + 1)}
          >
            ›
          </button>
        </div>
      ) : null}

      <span className="sr-only" aria-live="polite">
        {active.title}
      </span>
    </section>
  );
}
