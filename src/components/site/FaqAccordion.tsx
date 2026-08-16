import { useState } from "react";
import { faqs } from "@/content/site-content";
import { trackEvent } from "@/lib/analytics";
import { SectionHeader } from "./shared";

export default function FaqAccordion() {
  const [open, setOpen] = useState<Set<string>>(() => new Set());

  const toggle = (id: string) => {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        trackEvent("faq_open", { faq_id: id });
      }
      return next;
    });
  };

  return (
    <section className="faq-section section section--stone" id="faq" aria-labelledby="faq-title">
      <div className="shell faq-shell">
        <SectionHeader
          eyebrow="FREQUENTLY ASKED QUESTIONS"
          title="What jewelry businesses need to know."
          align="center"
        />
        <div className="faq-list">
          {faqs.map((faq, index) => {
            const expanded = open.has(faq.id);
            return (
              <article className="faq-item" key={faq.id} id={`faq-${faq.id}`}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`faq-panel-${faq.id}`}
                    onClick={() => toggle(faq.id)}
                  >
                    <span className="faq-number">{String(index + 1).padStart(2, "0")}</span>
                    <span>{faq.question}</span>
                    <i aria-hidden="true" />
                  </button>
                </h3>
                <div className="faq-panel" id={`faq-panel-${faq.id}`} hidden={!expanded}>
                  <p>{faq.answer}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
