import { useId, useRef, useState, type ReactNode } from "react";

export type ProductTab = {
  label: string;
  content: ReactNode;
};

export default function ProductTabs({ label, tabs }: { label: string; tabs: ProductTab[] }) {
  const [selected, setSelected] = useState(0);
  const id = useId().replace(/:/g, "");
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const activate = (index: number) => {
    setSelected(index);
    refs.current[index]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number | null = null;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tabs.length - 1;
    if (next === null) return;
    event.preventDefault();
    activate(next);
  };

  return (
    <div className="product-tabs">
      <div className="tab-list" role="tablist" aria-label={label}>
        {tabs.map((tab, index) => (
          <button
            key={tab.label}
            id={`${id}-tab-${index}`}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            aria-selected={selected === index}
            aria-controls={`${id}-panel-${index}`}
            tabIndex={selected === index ? 0 : -1}
            onClick={() => setSelected(index)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, index) => (
        <div
          key={tab.label}
          id={`${id}-panel-${index}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${index}`}
          tabIndex={0}
          hidden={selected !== index}
          className="tab-panel"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
