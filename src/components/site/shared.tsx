import type { ReactNode } from "react";
import type { AvailabilityStatus, Feature } from "@/content/site-content";

export function BrandMark({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className={`brand-lockup${inverted ? " brand-lockup--inverted" : ""}`}>
      <svg className="brand-mark" viewBox="0 0 40 40" aria-hidden="true">
        <path d="M5 9h9c7 0 9 6 14 6h7" />
        <path d="M5 31h9c7 0 9-6 14-6h7" />
        <path d="M5 20h30" />
      </svg>
      <span>CaratFlow</span>
    </span>
  );
}

export function StatusBadge({ status }: { status: AvailabilityStatus }) {
  return <span className="status-badge">{status}</span>;
}

export function SectionHeader({
  eyebrow,
  title,
  children,
  align = "left",
  inverse = false,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  align?: "left" | "center";
  inverse?: boolean;
}) {
  return (
    <div
      className={`section-heading section-heading--${align}${inverse ? " section-heading--inverse" : ""}`}
    >
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {children ? <div className="section-intro">{children}</div> : null}
    </div>
  );
}

export function FeatureGrid({
  features,
  inverse = false,
}: {
  features: Feature[];
  inverse?: boolean;
}) {
  return (
    <div className={`feature-grid${inverse ? " feature-grid--inverse" : ""}`}>
      {features.map((feature, index) => (
        <article className="feature-card" key={feature.title}>
          <span className="feature-number" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          <h3>{feature.title}</h3>
          <p>{feature.body}</p>
        </article>
      ))}
    </div>
  );
}

export function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h11M11 6l4 4-4 4" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m4 10 4 4 8-9" />
    </svg>
  );
}
