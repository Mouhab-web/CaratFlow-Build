import { useEffect, useRef, useState, type ComponentType } from "react";
import { trackEvent } from "@/lib/analytics";

type Category = "rings" | "earrings" | "necklaces";
type RingDemo = ComponentType<{ onClose: () => void; cameraStartAuthorized?: boolean }>;
type JewelryDemo = ComponentType<{
  onClose: () => void;
  initialCategory?: "earrings" | "necklace";
  cameraStartAuthorized?: boolean;
}>;

export default function TryOnPreflightDialog({
  initialCategory = "rings",
  onClose,
}: {
  initialCategory?: Category;
  onClose: () => void;
}) {
  const [category, setCategory] = useState<Category>(initialCategory);
  const [phase, setPhase] = useState<"preflight" | "loading" | "active" | "error">("preflight");
  const [Ring, setRing] = useState<RingDemo | null>(null);
  const [Jewelry, setJewelry] = useState<JewelryDemo | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || phase === "active") return;
      const items = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      mountedRef.current = false;
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, phase]);

  const startCamera = async () => {
    setPhase("loading");
    trackEvent("ar_camera_request", { category });
    try {
      if (category === "rings") {
        const module = await import("@/components/customizer/ARTryOn");
        if (!mountedRef.current) return;
        setRing(() => module.default);
      } else {
        const module = await import("@/components/customizer/JewelryTryOn");
        if (!mountedRef.current) return;
        setJewelry(() => module.default);
      }
      setPhase("active");
    } catch (error) {
      console.error("Try-On chunk failed to load", error);
      if (mountedRef.current) {
        trackEvent("ar_error", { category, error_code: "model_load" });
        setPhase("error");
      }
    }
  };

  const clearCalibration = () => {
    const keys = Array.from({ length: localStorage.length }, (_, index) =>
      localStorage.key(index),
    ).filter((key): key is string => Boolean(key?.startsWith("ar-calibration-v1:")));
    keys.forEach((key) => localStorage.removeItem(key));
  };

  if (phase === "active" && category === "rings" && Ring) {
    return <Ring onClose={onClose} cameraStartAuthorized />;
  }
  if (phase === "active" && category !== "rings" && Jewelry) {
    return (
      <Jewelry
        onClose={onClose}
        initialCategory={category === "earrings" ? "earrings" : "necklace"}
        cameraStartAuthorized
      />
    );
  }

  return (
    <div className="dialog-layer" role="presentation">
      <div className="dialog-backdrop" aria-hidden="true" />
      <div
        className="preflight-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preflight-title"
        ref={dialogRef}
      >
        <button
          className="dialog-close"
          type="button"
          onClick={onClose}
          ref={closeButtonRef}
          aria-label="Close Try-On dialog"
        >
          Close
        </button>
        <div className="preflight-visual" aria-hidden="true">
          <span className="camera-frame">
            <i />
            <i />
            <i />
            <i />
          </span>
          <div className={`tryon-silhouette tryon-silhouette--${category}`}>
            <span />
            <i />
            <b />
          </div>
          <span className="preflight-privacy">Frames stay in this browser</span>
        </div>
        <div className="preflight-copy">
          <p className="eyebrow">CARATFLOW TRY-ON</p>
          <h2 id="preflight-title">Before you begin</h2>
          <p>
            CaratFlow needs camera permission for this demo. Camera frames are processed in your
            browser by the current CaratFlow application and are not uploaded by it. Saved
            calibration remains in this browser. A screenshot is created only when you choose
            Capture.
          </p>
          <fieldset className="category-selector">
            <legend>Choose a category</legend>
            <div>
              {(["rings", "earrings", "necklaces"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={category === item}
                  onClick={() => setCategory(item)}
                >
                  {item === "rings" ? "Rings" : item === "earrings" ? "Earrings" : "Necklaces"}
                </button>
              ))}
            </div>
          </fieldset>
          {phase === "error" ? (
            <div className="inline-alert" role="alert">
              The live demo could not start. Try again or use the visual preview.
            </div>
          ) : null}
          {phase === "loading" ? (
            <p className="camera-status" role="status">
              Preparing the camera experience…
            </p>
          ) : null}
          <div className="preflight-actions">
            <button
              className="button button--primary"
              type="button"
              disabled={phase === "loading"}
              onClick={() => void startCamera()}
            >
              Start Camera
            </button>
            <button className="button button--secondary" type="button" onClick={onClose}>
              Not Now
            </button>
          </div>
          <button className="text-button" type="button" onClick={clearCalibration}>
            Clear saved calibration
          </button>
        </div>
      </div>
    </div>
  );
}
