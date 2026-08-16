import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRing } from "@/lib/ring-store";
import {
  RING_SIZE_TABLE,
  circumferenceToSize,
  diameterToSize,
  findByUSSize,
  findByUKSize,
  findByEUSize,
  validateCircumference,
  validateDiameter,
  type RingSize,
} from "@/lib/ringSize";

type Tab = "chart" | "known" | "diameter" | "circumference" | "print";

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: "chart", label: "Size Chart", hint: "Reference every US / UK / EU size" },
  { id: "known", label: "I know my size", hint: "Enter US, UK or EU size" },
  { id: "diameter", label: "Ring diameter", hint: "Measure inside diameter of an existing ring" },
  { id: "circumference", label: "Finger wrap", hint: "Wrap a string around your finger" },
  { id: "print", label: "Printable ruler", hint: "Print & measure with our PDF ruler" },
];

function SizeResult({ size, onApply }: { size: RingSize | null; onApply: (s: RingSize) => void }) {
  if (!size) {
    return (
      <div className="mt-4 rounded-xl border border-border/50 p-4 text-xs text-muted-foreground">
        Enter a value above — we'll match it to the nearest standard size.
      </div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 rounded-xl border border-gold/40 bg-gold/5 p-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-gold/80">
            Recommended size
          </div>
          <div className="mt-1 text-3xl text-gradient-gold font-display">US {size.us}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            UK {size.uk} · EU {size.eu} · Ø {size.diameter_mm}mm · {size.circumference_mm}mm circ.
          </div>
        </div>
        <button
          onClick={() => onApply(size)}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-gold-soft via-gold to-gold-soft text-obsidian text-[10px] uppercase tracking-[0.2em] font-medium shadow-glow hover:scale-[1.03] transition-transform"
        >
          Apply & Try in AR →
        </button>
      </div>
    </motion.div>
  );
}

export default function RingSizer() {
  const { sizerOpen, setSizerOpen, setRingSize, setArOpen } = useRing();
  const [tab, setTab] = useState<Tab>("known");
  const [us, setUs] = useState("");
  const [uk, setUk] = useState("");
  const [eu, setEu] = useState("");
  const [dia, setDia] = useState("");
  const [circ, setCirc] = useState("");

  const knownSize =
    (us && findByUSSize(parseFloat(us))) ||
    (uk && findByUKSize(uk)) ||
    (eu && findByEUSize(parseFloat(eu))) ||
    null;

  const diaNum = parseFloat(dia);
  const diaSize = validateDiameter(diaNum) ? diameterToSize(diaNum) : null;

  const circNum = parseFloat(circ);
  const circSize = validateCircumference(circNum) ? circumferenceToSize(circNum) : null;

  const apply = (s: RingSize) => {
    setRingSize(s);
    setSizerOpen(false);
    setTimeout(() => setArOpen(true), 250);
  };

  return (
    <AnimatePresence>
      {sizerOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-obsidian/85 backdrop-blur-md p-4 md:p-8 flex items-center justify-center"
          onClick={() => setSizerOpen(false)}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl bg-card border border-primary/15 shadow-elegant flex flex-col"
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 md:p-8 border-b border-border/40">
              <div>
                <p className="text-[10px] uppercase tracking-[0.4em] text-gold/80">Ring Sizer</p>
                <h3 className="mt-2 text-3xl md:text-4xl">
                  Find your <em className="text-gradient-gold">perfect fit</em>
                </h3>
                <p className="mt-2 text-xs text-muted-foreground max-w-md">
                  Pick a method — we'll apply the size to your preview & AR try-on.
                </p>
              </div>
              <button
                onClick={() => setSizerOpen(false)}
                className="p-2 rounded-full border border-border hover:border-gold hover:text-gold transition text-xs"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto px-6 md:px-8 pt-4 pb-3 border-b border-border/30">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`whitespace-nowrap px-3.5 py-2 rounded-full text-[10px] uppercase tracking-[0.2em] border transition ${
                    tab === t.id
                      ? "border-gold text-gold bg-gold/10"
                      : "border-border/50 text-muted-foreground hover:border-gold/40 hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="p-6 md:p-8 overflow-y-auto">
              <p className="text-xs text-muted-foreground mb-5 italic">
                {TABS.find((t) => t.id === tab)?.hint}
              </p>

              {tab === "known" && (
                <div className="grid md:grid-cols-3 gap-4">
                  <label className="block">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
                      US Size
                    </div>
                    <input
                      value={us}
                      onChange={(e) => {
                        setUs(e.target.value);
                        setUk("");
                        setEu("");
                      }}
                      inputMode="decimal"
                      placeholder="e.g. 7"
                      className="w-full bg-background border border-primary/25 text-foreground placeholder:text-muted-foreground/60 rounded-xl px-4 py-3 text-sm focus:border-gold focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
                      UK Size
                    </div>
                    <input
                      value={uk}
                      onChange={(e) => {
                        setUk(e.target.value);
                        setUs("");
                        setEu("");
                      }}
                      placeholder="e.g. N"
                      className="w-full bg-background border border-primary/25 text-foreground placeholder:text-muted-foreground/60 rounded-xl px-4 py-3 text-sm uppercase focus:border-gold focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
                      EU Size
                    </div>
                    <input
                      value={eu}
                      onChange={(e) => {
                        setEu(e.target.value);
                        setUs("");
                        setUk("");
                      }}
                      inputMode="numeric"
                      placeholder="e.g. 54"
                      className="w-full bg-background border border-primary/25 text-foreground placeholder:text-muted-foreground/60 rounded-xl px-4 py-3 text-sm focus:border-gold focus:outline-none"
                    />
                  </label>
                  <div className="md:col-span-3">
                    <SizeResult size={knownSize} onApply={apply} />
                  </div>
                </div>
              )}

              {tab === "diameter" && (
                <div>
                  <p className="text-sm text-foreground/70 mb-4">
                    Take a ring that fits well. Measure the <em>inside</em> diameter across the
                    middle in millimeters.
                  </p>
                  <label className="block max-w-xs">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
                      Inside diameter (mm)
                    </div>
                    <input
                      value={dia}
                      onChange={(e) => setDia(e.target.value)}
                      inputMode="decimal"
                      placeholder="14 – 23"
                      className="w-full bg-background border border-primary/25 text-foreground placeholder:text-muted-foreground/60 rounded-xl px-4 py-3 text-sm focus:border-gold focus:outline-none"
                    />
                  </label>
                  <SizeResult size={diaSize} onApply={apply} />
                </div>
              )}

              {tab === "circumference" && (
                <div>
                  <p className="text-sm text-foreground/70 mb-4">
                    Wrap a piece of string or paper around the base of your finger. Mark where it
                    overlaps, lay it flat and measure the length in millimeters.
                  </p>
                  <label className="block max-w-xs">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
                      Circumference (mm)
                    </div>
                    <input
                      value={circ}
                      onChange={(e) => setCirc(e.target.value)}
                      inputMode="decimal"
                      placeholder="44 – 72"
                      className="w-full bg-background border border-primary/25 text-foreground placeholder:text-muted-foreground/60 rounded-xl px-4 py-3 text-sm focus:border-gold focus:outline-none"
                    />
                  </label>
                  <SizeResult size={circSize} onApply={apply} />
                </div>
              )}

              {tab === "chart" && (
                <div className="overflow-x-auto rounded-xl border border-border/40">
                  <table className="min-w-full text-sm">
                    <thead className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground bg-primary/5">
                      <tr>
                        <th className="px-4 py-3 text-left">US</th>
                        <th className="px-4 py-3 text-left">UK</th>
                        <th className="px-4 py-3 text-left">EU</th>
                        <th className="px-4 py-3 text-left">Ø mm</th>
                        <th className="px-4 py-3 text-left">Circ. mm</th>
                        <th className="px-4 py-3 text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {RING_SIZE_TABLE.map((s) => (
                        <tr
                          key={s.us}
                          className="border-t border-border/20 hover:bg-gold/5 transition"
                        >
                          <td className="px-4 py-2.5 font-display text-gold">{s.us}</td>
                          <td className="px-4 py-2.5">{s.uk}</td>
                          <td className="px-4 py-2.5">{s.eu}</td>
                          <td className="px-4 py-2.5">{s.diameter_mm}</td>
                          <td className="px-4 py-2.5">{s.circumference_mm}</td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              onClick={() => apply(s)}
                              className="text-[10px] uppercase tracking-[0.2em] text-gold hover:underline"
                            >
                              Use →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === "print" && (
                <div className="space-y-4 text-sm text-foreground/80">
                  <p>
                    Use this only as a general reference. Confirm the final size with a qualified
                    jeweler before purchase.
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-foreground/70 text-sm">
                    <li>Print the sizing guide at 100% scale (no "fit to page").</li>
                    <li>Check that the page was not enlarged or reduced during printing.</li>
                    <li>Place an existing ring over the circles until the inside edges align.</li>
                    <li>
                      Enter the printed size number in the <em>I know my size</em> tab.
                    </li>
                  </ol>
                  <p className="rounded-xl border border-gold/30 p-3 text-xs text-muted-foreground">
                    An approved CaratFlow printable guide is not included in this preview. No
                    external sizing material is loaded.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
