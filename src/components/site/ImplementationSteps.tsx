import { implementationSteps } from "@/content/site-content";
import { trackCta } from "@/lib/analytics";
import { ArrowIcon, SectionHeader } from "./shared";

export default function ImplementationSteps() {
  return (
    <section
      className="implementation-section section section--stone"
      id="how-it-works"
      aria-labelledby="implementation-title"
    >
      <div className="shell">
        <SectionHeader
          eyebrow="A STRUCTURED IMPLEMENTATION"
          title="A clear path from requirements to launch."
          align="center"
        >
          <p>
            Every deployment begins with the jewelry business, its product data, and the systems
            already in use. Scope is confirmed before implementation begins.
          </p>
        </SectionHeader>
        <ol className="implementation-list">
          {implementationSteps.map((step, index) => (
            <li key={step.title}>
              <span className="step-number">{String(index + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
        <div className="center-action">
          <a
            className="button button--primary"
            href="#demo"
            onClick={() => trackCta("implementation")}
          >
            Book a Solution Review <ArrowIcon />
          </a>
        </div>
      </div>
    </section>
  );
}
