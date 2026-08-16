import { useState, type ComponentType } from "react";
import { tryOnFeatures } from "@/content/site-content";
import { trackEvent } from "@/lib/analytics";
import { ArrowIcon, FeatureGrid, SectionHeader } from "./shared";
import TryOnPreflightDialog from "./TryOnPreflightDialog";

type Category = "rings" | "earrings" | "necklaces";
type InlineMode = "idle" | "loading" | "active" | "error";

type RingDemo = ComponentType<{
  onClose: () => void;
  cameraStartAuthorized?: boolean;
  embedded?: boolean;
}>;
type JewelryDemo = ComponentType<{
  onClose: () => void;
  initialCategory?: "earrings" | "necklace";
  cameraStartAuthorized?: boolean;
  embedded?: boolean;
}>;

const CATEGORY_LABEL: Record<Category, string> = {
  rings: "Rings",
  earrings: "Earrings",
  necklaces: "Necklaces",
};

export default function TryOnSection() {
  const [category, setCategory] = useState<Category>("rings");
  const [mode, setMode] = useState<InlineMode>("idle");
  const [Ring, setRing] = useState<RingDemo | null>(null);
  const [Jewelry, setJewelry] = useState<JewelryDemo | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const resetInline = () => {
    setMode("idle");
    setRing(null);
    setJewelry(null);
  };

  const switchCategory = (next: Category) => {
    if (next === category) return;
    resetInline();
    setCategory(next);
  };

  // Primary path: open the live camera *inside* the black stage.
  const launchInline = async () => {
    setMode("loading");
    trackEvent("ar_camera_request", { category });
    try {
      if (category === "rings") {
        const module = await import("@/components/customizer/ARTryOn");
        setRing(() => module.default);
      } else {
        const module = await import("@/components/customizer/JewelryTryOn");
        setJewelry(() => module.default);
      }
      setMode("active");
    } catch (error) {
      console.error("Inline Try-On chunk failed to load", error);
      trackEvent("ar_error", { category, error_code: "model_load" });
      setMode("error");
    }
  };

  // Secondary path: keep the original full-screen experience available.
  const openFullScreen = () => {
    trackEvent("ar_preflight_open", { category });
    setDialogOpen(true);
  };

  return (
    <section className="tryon-section section" id="try-on" aria-labelledby="tryon-title">
      <div className="shell">
        <SectionHeader
          eyebrow="CARATFLOW TRY-ON · LIVE BROWSER DEMOS"
          title="Bring jewelry into the shopper’s own view."
        >
          <p>
            Preview supported rings, earrings, and necklaces through a camera-enabled browser
            experience. The current demos require camera permission and do not require a native app;
            compatibility varies by device and browser.
          </p>
        </SectionHeader>
        <div className="product-split product-split--tryon">
          <div className="product-media">
            <div className="media-category-switch" role="group" aria-label="Try-On categories">
              {(["rings", "earrings", "necklaces"] as const).map((item) => (
                <button
                  type="button"
                  key={item}
                  aria-pressed={category === item}
                  onClick={() => switchCategory(item)}
                >
                  {CATEGORY_LABEL[item]}
                </button>
              ))}
            </div>

            {/* Live try-on stage. Renders a plain black surface until the shopper
                launches the demo, then mounts the camera experience in place. */}
            <div className="tryon-stage" data-active={mode === "active" ? "true" : "false"}>
              <div className="tryon-stage__bar">
                <span>Visual preview</span>
                <span
                  className={`tryon-stage__cam tryon-stage__cam--${mode === "active" ? "on" : "off"}`}
                >
                  {mode === "active" ? "Camera on" : "Camera off"}
                </span>
              </div>

              {mode === "active" && category === "rings" && Ring ? (
                <Ring onClose={resetInline} cameraStartAuthorized embedded />
              ) : mode === "active" && category !== "rings" && Jewelry ? (
                <Jewelry
                  onClose={resetInline}
                  initialCategory={category === "earrings" ? "earrings" : "necklace"}
                  cameraStartAuthorized
                  embedded
                />
              ) : (
                <div className="tryon-stage__idle" aria-live="polite">
                  {mode === "loading" ? (
                    <p role="status">Preparing the camera experience…</p>
                  ) : mode === "error" ? (
                    <p role="alert">
                      The live demo could not start. Try again, or open the full-screen try-on.
                    </p>
                  ) : (
                    <p>
                      Press <strong>Launch the Try-On Demo</strong> to open your camera and preview{" "}
                      {CATEGORY_LABEL[category].toLowerCase()} right here.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Primary action lives right below the stage. */}
            <div className="tryon-stage-actions">
              <button
                className="button button--primary"
                type="button"
                disabled={mode === "loading"}
                onClick={() => void launchInline()}
              >
                {mode === "active" ? "Restart the Try-On Demo" : "Launch the Try-On Demo"}{" "}
                <ArrowIcon />
              </button>
              {mode === "active" ? (
                <button className="button button--secondary" type="button" onClick={resetInline}>
                  Stop camera
                </button>
              ) : (
                <button className="button button--secondary" type="button" onClick={openFullScreen}>
                  Open full-screen try-on
                </button>
              )}
              <small>Camera permission required. Compatibility varies by device and browser.</small>
            </div>
          </div>
          <FeatureGrid features={tryOnFeatures} />
        </div>
        <div className="section-outcome">
          <p>
            <span>Outcome</span> Give shoppers another way to visualize a design before moving
            forward.
          </p>
        </div>
      </div>
      {dialogOpen ? (
        <TryOnPreflightDialog initialCategory={category} onClose={() => setDialogOpen(false)} />
      ) : null}
    </section>
  );
}
