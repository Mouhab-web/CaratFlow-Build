import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRing } from "@/lib/ring-store";
import { findByUSSize } from "@/lib/ringSize";
import { trackEvent } from "@/lib/analytics";

// Guided demo — auto-walks Metal → Band → Shape → Setting → Sizer → AR.
// The user can Skip at any time; on skip we jump straight to AR.

type DemoStep = {
  label: string;
  ms: number;
  apply: (s: ReturnType<typeof useRing.getState>) => void;
};

const STYLE_STEPS: DemoStep[] = [
  { label: "Metal · Yellow Gold 18K", ms: 1100, apply: (s) => s.setMetal("Yellow Gold 18K") },
  { label: "Band · Petite Cathedral", ms: 1100, apply: (s) => s.setBand("Petite Cathedral") },
  { label: "Shape · Oval", ms: 1100, apply: (s) => s.setShape("Oval") },
  { label: "Setting · 6 Prong", ms: 1100, apply: (s) => s.setSetting("6 Prong") },
];

export default function ClientDemoOverlay() {
  const [paused, setPaused] = useState(false);
  const {
    demoActive,
    demoStep,
    demoLabel,
    setDemoStep,
    stopDemo,
    setSizerOpen,
    setArOpen,
    setRingSize,
    sizerOpen,
    arOpen,
  } = useRing();

  // Advance timer refs so we can cancel on skip / unmount.
  const timerRef = useRef<number | null>(null);
  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // Orchestrator — runs when demo goes active or step changes.
  useEffect(() => {
    if (!demoActive || paused) {
      clearTimer();
      return;
    }

    // Steps 0..3 = style presets
    if (demoStep < STYLE_STEPS.length) {
      const step = STYLE_STEPS[demoStep];
      // Apply the preset immediately, then schedule the next step
      step.apply(useRing.getState());
      setDemoStep(demoStep, `Step ${demoStep + 1} of 6 — ${step.label}`);
      timerRef.current = window.setTimeout(() => {
        setDemoStep(demoStep + 1);
      }, step.ms);
      return clearTimer;
    }

    // Step 4 = open sizer with a sensible default already applied
    if (demoStep === STYLE_STEPS.length) {
      setDemoStep(demoStep, "Step 5 of 6 — Ring Sizer");
      const defaultSize = findByUSSize(7);
      if (defaultSize) setRingSize(defaultSize);
      setSizerOpen(true);
      // Give the user 3.5s to look at the sizer, then move on to AR
      timerRef.current = window.setTimeout(() => {
        setSizerOpen(false);
        setDemoStep(demoStep + 1);
      }, 3500);
      return clearTimer;
    }

    // Step 5 = launch AR
    if (demoStep === STYLE_STEPS.length + 1) {
      setDemoStep(demoStep, "Step 6 of 6 — AR Try-On");
      // Small delay so the sizer has time to close visually
      timerRef.current = window.setTimeout(() => {
        setArOpen(true);
        trackEvent("customizer_guided_demo_complete", {});
        stopDemo();
      }, 450);
      return clearTimer;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoActive, demoStep, paused]);

  // Cleanup on unmount
  useEffect(() => clearTimer, []);

  const skipToAr = () => {
    clearTimer();
    setSizerOpen(false);
    setArOpen(true);
    stopDemo();
  };

  const cancel = () => {
    clearTimer();
    setSizerOpen(false);
    stopDemo();
  };

  const pause = () => {
    clearTimer();
    setPaused(true);
  };

  const resume = () => setPaused(false);

  const restart = () => {
    clearTimer();
    setPaused(false);
    stopDemo();
    window.requestAnimationFrame(() => useRing.getState().startDemo());
  };

  const totalSteps = STYLE_STEPS.length + 2;
  const progress = Math.min(1, (demoStep + 1) / totalSteps);

  return (
    <AnimatePresence>
      {demoActive && !arOpen && (
        <motion.div
          key="demo-hud"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
          className={`fixed z-[110] left-1/2 -translate-x-1/2 top-4 sm:top-6 max-w-[92vw] w-[420px] pointer-events-auto ${
            sizerOpen ? "opacity-95" : ""
          }`}
        >
          <div className="bg-glass rounded-2xl border border-gold/40 shadow-elegant px-4 sm:px-5 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-gold animate-pulse shrink-0" />
                <span className="text-[10px] uppercase tracking-[0.3em] text-gold truncate">
                  Guided demo {paused ? "· Paused" : "· Playing"}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={paused ? resume : pause}
                  className="min-h-11 text-[10px] uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border border-gold/40 text-gold hover:bg-gold/10 transition"
                >
                  {paused ? "Resume" : "Pause"}
                </button>
                <button
                  type="button"
                  onClick={skipToAr}
                  className="min-h-11 text-[10px] uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border border-gold/40 text-gold hover:bg-gold/10 transition"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={restart}
                  className="min-h-11 text-[10px] uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border border-border/50 text-muted-foreground hover:text-foreground transition"
                >
                  Restart
                </button>
                <button
                  type="button"
                  onClick={cancel}
                  className="min-h-11 text-[10px] uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border border-border/50 text-muted-foreground hover:text-foreground transition"
                >
                  Exit
                </button>
              </div>
            </div>
            <div className="mt-2 text-sm text-foreground/90 truncate">
              {demoLabel || "Preparing…"}
            </div>
            <div className="mt-3 h-1 w-full rounded-full bg-border/60 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-gold-soft via-gold to-gold-soft"
                initial={false}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
