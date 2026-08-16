import { workflow } from "@/content/site-content";
import { SectionHeader, StatusBadge } from "./shared";

export default function PlatformWorkflow() {
  return (
    <section className="platform section" id="platform" aria-labelledby="platform-title">
      <div className="shell">
        <SectionHeader
          eyebrow="ONE CONNECTED WORKFLOW"
          title="From product choice to daily operations."
          align="center"
        >
          <p>
            CaratFlow is designed around one jewelry data path: help a shopper configure a product,
            preview it, move toward a purchase, and carry the resulting selection into the systems
            used to price, fulfill, and support the order.
          </p>
        </SectionHeader>
        <ol className="workflow-list" aria-label="CaratFlow workflow">
          {workflow.map((step, index) => (
            <li key={step.title}>
              <div className="workflow-node" aria-hidden="true">
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className="workflow-card">
                <StatusBadge status={step.status} />
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="workflow-notes">
          <p>
            <strong>Availability is shown plainly</strong> as live demo, configured deployment,
            integration-dependent, or scoped service.
          </p>
          <p>
            The goal is less manual re-entry between product discovery, commerce, and operations.
          </p>
        </div>
      </div>
    </section>
  );
}
