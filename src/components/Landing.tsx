import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import SiteHeader from "./site/SiteHeader";
import HeroSection from "./site/HeroSection";
import ProductProofStrip from "./site/ProductProofStrip";
import PlatformWorkflow from "./site/PlatformWorkflow";
import CustomizerSection from "./site/CustomizerSection";
import TryOnSection from "./site/TryOnSection";
import CommerceSection from "./site/CommerceSection";
import OperationsSection from "./site/OperationsSection";
import PartnerSection from "./site/PartnerSection";
import ImplementationSteps from "./site/ImplementationSteps";
import PricingSection from "./site/PricingSection";
import FaqAccordion from "./site/FaqAccordion";
import { DemoSection } from "./site/LeadForm";
import SiteFooter from "./site/SiteFooter";

const TRACKED_SECTIONS = [
  "proof",
  "platform",
  "customizer",
  "try-on",
  "commerce",
  "operations",
  "partner",
  "how-it-works",
  "pricing",
  "faq",
  "demo",
];

function usePageAnalytics() {
  useEffect(() => {
    const seen = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (
            entry.isIntersecting &&
            entry.intersectionRatio >= 0.5 &&
            !seen.has(entry.target.id)
          ) {
            seen.add(entry.target.id);
            trackEvent("product_section_view", { section_id: entry.target.id });
          }
        });
      },
      { threshold: [0.5] },
    );
    TRACKED_SECTIONS.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    const depths = [25, 50, 75, 90] as const;
    const sentDepths = new Set<number>();
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const percent = (window.scrollY / max) * 100;
      depths.forEach((depth) => {
        if (percent >= depth && !sentDepths.has(depth)) {
          sentDepths.add(depth);
          trackEvent("scroll_depth", { scroll_percent: depth });
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
}

export default function Landing() {
  usePageAnalytics();
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <HeroSection />
        <ProductProofStrip />
        <PlatformWorkflow />
        <CustomizerSection />
        <TryOnSection />
        <CommerceSection />
        <OperationsSection />
        <PartnerSection />
        <ImplementationSteps />
        <PricingSection />
        <FaqAccordion />
        <DemoSection />
      </main>
      <SiteFooter />
    </>
  );
}
