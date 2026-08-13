import { useRing } from "@/lib/ring-store";

import {
  METALS,
  BANDS,
  SETTINGS,
  SHAPES,
  CARAT_OPTIONS,
  CONFIGURATION_VALIDATION,
  getAvailableHaloTypes,
  getAllowedSideStones,
} from "@/lib/ring-config";
import RingViewer from "./RingViewer";
import ARTryOn from "./ARTryOn";
import RingSizer from "./RingSizer";
import ClientDemoOverlay from "./ClientDemoOverlay";
import { motion } from "framer-motion";
import { trackEvent } from "@/lib/analytics";

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-11 px-3.5 py-2 rounded-full text-xs uppercase tracking-wider border transition-all duration-300 ${
        active
          ? "bg-gold text-obsidian border-gold shadow-glow"
          : "bg-glass text-foreground/70 hover:text-foreground hover:border-gold/40"
      }`}
    >
      {children}
    </button>
  );
}

function Section({
  title,
  children,
  hint,
  highlight,
}: {
  title: string;
  children: React.ReactNode;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={title}
      className={`space-y-3 rounded-2xl transition-all duration-500 ${
        highlight ? "ring-2 ring-gold/70 shadow-glow bg-gold/[0.03] p-3 -m-3" : ""
      }`}
    >
      <div className="flex items-baseline justify-between">
        <h4 className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{title}</h4>
        {hint && <span className="text-[10px] text-muted-foreground/70 italic">{hint}</span>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export default function RingCustomizer() {
  const r = useRing();
  const allowedSides = getAllowedSideStones(r.band);
  const haloTypes = getAvailableHaloTypes(r.shape);
  const demo = r.demoActive ? r.demoStep : -1;
  const configurationSummary = `${r.metal}; ${r.band ?? "no band"}; ${r.setting ?? "no setting"}; ${r.shape ?? "no center-stone shape"}; ${r.carat} carat; ${r.halo ? `${r.halo} halo` : "no halo"}; ${r.sideStone ? `${r.sideStone} side stones` : "no side stones"}.`;
  const choose = (optionGroup: string, action: () => void) => {
    action();
    trackEvent("customizer_option_change", { option_group: optionGroup });
  };

  return (
    <div
      id="ring-customizer"
      className="relative grid lg:grid-cols-[1.1fr_1fr] gap-6 lg:gap-8 bg-glass rounded-3xl p-4 lg:p-6 shadow-elegant overflow-hidden"
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-50"
        style={{ background: "var(--gradient-radial)" }}
      />
      {/* Viewer */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="relative aspect-square lg:aspect-auto lg:min-h-[640px] rounded-2xl overflow-hidden bg-obsidian"
      >
        <RingViewer />
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-foreground/50">
          <span>● Live · 3D Preview</span>
          <span>Drag · Zoom · Rotate</span>
        </div>
      </motion.div>

      {/* Controls */}
      <div className="relative space-y-6 lg:max-h-[640px] lg:overflow-y-auto pr-1">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.3em] text-gold/80 mb-2">Configurator</p>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl">Design your ring</h3>
            <p className="text-sm text-muted-foreground mt-2">
              {CONFIGURATION_VALIDATION.claimEnabled
                ? "Every supported selection renders in real time. More than 240,000 possible option combinations."
                : "Every validated selection renders in real time."}
            </p>
          </div>
          <button
            type="button"
            aria-pressed={r.demoActive}
            onClick={() => {
              if (r.demoActive) r.stopDemo();
              else {
                trackEvent("customizer_guided_demo_start", { entry_point: "customizer_controls" });
                r.startDemo();
              }
            }}
            className={`shrink-0 self-start px-3.5 py-2 rounded-full text-[10px] uppercase tracking-[0.25em] font-medium border transition-all ${
              r.demoActive
                ? "border-gold text-gold bg-gold/10"
                : "border-gold/50 text-gold hover:bg-gold/10 hover:shadow-glow"
            }`}
            title="Auto-walk a customer through Metal → Band → Shape → Setting → Sizer → AR"
          >
            {r.demoActive ? "◼ Stop demo" : "▶ Client Demo"}
          </button>
        </div>

        <Section title="Metal" highlight={demo === 0}>
          {METALS.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={r.metal === m.id}
              onClick={() => choose("metal", () => r.setMetal(m.id))}
              className={`group min-h-11 flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-full text-xs uppercase tracking-wider border transition-all ${
                r.metal === m.id
                  ? "border-gold shadow-glow"
                  : "border-border/50 hover:border-gold/40"
              }`}
            >
              <span
                className="w-5 h-5 rounded-full ring-1 ring-white/20"
                style={{ background: m.color }}
              />
              {m.label}
            </button>
          ))}
        </Section>

        <Section title="Band" highlight={demo === 1}>
          {BANDS.map((b) => (
            <Pill
              key={b.id}
              active={r.band === b.id}
              onClick={() => choose("band", () => r.setBand(b.id))}
            >
              {b.label}
            </Pill>
          ))}
        </Section>

        <Section title="Setting" highlight={demo === 3}>
          {SETTINGS.map((s) => (
            <Pill
              key={s.id}
              active={r.setting === s.id}
              onClick={() => choose("setting", () => r.setSetting(s.id))}
            >
              {s.label}
            </Pill>
          ))}
        </Section>

        <Section title="Center Stone Shape" highlight={demo === 2}>
          {SHAPES.map((s) => (
            <Pill
              key={s.id}
              active={r.shape === s.id}
              onClick={() => choose("center_stone_shape", () => r.setShape(s.id))}
            >
              {s.label}
            </Pill>
          ))}
        </Section>

        <Section title={`Carat · ${r.carat}ct`}>
          {CARAT_OPTIONS.map((c) => (
            <Pill
              key={c}
              active={r.carat === c}
              onClick={() => choose("carat", () => r.setCarat(c))}
            >
              {c}ct
            </Pill>
          ))}
        </Section>

        <Section title="Halo" hint={r.shape ? "optional" : "select a shape first"}>
          {r.shape &&
            haloTypes.map((h) => (
              <Pill
                key={h.id}
                active={r.halo === h.id}
                onClick={() => choose("halo", () => r.setHalo(r.halo === h.id ? null : h.id))}
              >
                {h.label}
              </Pill>
            ))}
        </Section>

        <Section
          title="Side Stones"
          hint={allowedSides.length === 0 ? "incompatible with eternity bands" : "optional"}
        >
          {allowedSides.map((s) => (
            <Pill
              key={s.id}
              active={r.sideStone === s.id}
              onClick={() =>
                choose("side_stones", () => r.setSideStone(r.sideStone === s.id ? null : s.id))
              }
            >
              {s.label}
            </Pill>
          ))}
        </Section>

        <div className="pt-4 border-t border-border/40 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={r.reset}
            className="min-h-11 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition"
          >
            Reset
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => r.setSizerOpen(true)}
              className="min-h-11 px-4 py-2.5 rounded-full border border-gold/50 text-gold text-xs uppercase tracking-[0.2em] hover:bg-gold/10 transition"
            >
              Find my size
            </button>
            <button
              type="button"
              onClick={() => r.setArOpen(true)}
              className="min-h-11 px-4 py-2.5 rounded-full bg-obsidian border border-gold/60 text-gold text-xs uppercase tracking-[0.2em] hover:border-gold hover:shadow-glow transition"
            >
              Try on with AR
            </button>
            <a
              href="#pricing"
              className="px-5 py-2.5 rounded-full bg-gradient-to-r from-gold-soft via-gold to-gold-soft text-obsidian text-xs uppercase tracking-[0.2em] font-medium shadow-glow hover:scale-[1.02] transition-transform"
            >
              Get this for your store →
            </a>
          </div>
        </div>
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Current configuration: {configurationSummary}
      </p>

      {/* Modals + guided demo HUD */}
      {r.arOpen && <ARTryOn onClose={() => r.setArOpen(false)} />}
      <RingSizer />
      <ClientDemoOverlay />
    </div>
  );
}
