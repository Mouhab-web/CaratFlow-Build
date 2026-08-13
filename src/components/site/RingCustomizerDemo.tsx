import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { CustomizerPoster } from "./HeroSection";

type DemoState = "poster" | "loading" | "ready" | "error" | "timeout";

export const CUSTOMIZER_LOAD_EVENT = "caratflow:customizer-load";

class CustomizerRenderBoundary extends Component<
  { children: ReactNode; onError: (error: Error) => void },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    this.props.onError(error);
  }

  render() {
    return this.state.error ? null : this.props.children;
  }
}

export default function RingCustomizerDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<DemoState>("poster");
  const [Demo, setDemo] = useState<ComponentType | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    if (state === "loading" || state === "ready") return;
    const request = ++requestRef.current;
    setState("loading");
    timerRef.current = setTimeout(() => {
      if (requestRef.current === request) setState("timeout");
    }, 15_000);
    try {
      const module = await import("@/components/customizer/RingCustomizer");
      if (requestRef.current !== request) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      setDemo(() => module.default);
      setState("ready");
    } catch (error) {
      console.error("Customizer chunk failed to load", error);
      if (requestRef.current !== request) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      setState("error");
    }
  }, [state]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || state !== "poster") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          void load();
        }
      },
      { rootMargin: "500px 0px", threshold: 0.01 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [load, state]);

  useEffect(() => {
    const onExplicitLoad = () => void load();
    window.addEventListener(CUSTOMIZER_LOAD_EVENT, onExplicitLoad);
    return () => window.removeEventListener(CUSTOMIZER_LOAD_EVENT, onExplicitLoad);
  }, [load]);

  useEffect(
    () => () => {
      requestRef.current += 1;
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const retry = () => {
    requestRef.current += 1;
    setState("poster");
    window.requestAnimationFrame(() => void load());
  };

  const handleRenderError = useCallback((error: Error) => {
    console.error("Customizer failed while rendering", error);
    setDemo(null);
    setState("error");
  }, []);

  return (
    <div
      className="demo-shell"
      id="ring-customizer-demo"
      ref={rootRef}
      aria-label="Interactive ring customizer"
    >
      {state === "ready" && Demo ? (
        <CustomizerRenderBoundary key={requestRef.current} onError={handleRenderError}>
          <Demo />
        </CustomizerRenderBoundary>
      ) : (
        <CustomizerPoster compact />
      )}
      {state !== "ready" ? (
        <div className="demo-load-panel" aria-live="polite">
          {state === "poster" ? (
            <button className="button button--primary" type="button" onClick={() => void load()}>
              Load interactive customizer
            </button>
          ) : null}
          {state === "loading" ? (
            <div className="demo-loading" role="status">
              <span className="loading-bar" aria-hidden="true">
                <i />
              </span>
              <strong>Loading the interactive customizer…</strong>
              <span>The static product view stays available while the 3D controls load.</span>
            </div>
          ) : null}
          {state === "timeout" || state === "error" ? (
            <div className="demo-error" role="alert">
              <strong>
                {state === "timeout"
                  ? "The interactive demo is taking longer than expected."
                  : "The interactive demo could not load."}
              </strong>
              <span>You can keep using the static product summary or try again.</span>
              <button className="button button--secondary" type="button" onClick={retry}>
                Retry demo
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="demo-text-alternative">
        <strong>Current sample configuration:</strong> 18K yellow gold, standard band, 4-prong
        setting, 1.5 carat emerald center stone, no halo or side stones.
      </div>
    </div>
  );
}
