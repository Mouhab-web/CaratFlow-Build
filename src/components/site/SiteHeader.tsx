import { useEffect, useRef, useState } from "react";
import { navigation } from "@/content/site-content";
import { trackCta } from "@/lib/analytics";
import { BrandMark } from "./shared";

const SECTION_IDS = navigation.map((item) => item.href.slice(1));

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("platform");
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (section): section is HTMLElement => Boolean(section),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-18% 0px -68% 0px", threshold: [0.05, 0.25, 0.5] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const menuButton = menuButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    const pageRegions = Array.from(document.querySelectorAll<HTMLElement>("main, footer"));
    pageRegions.forEach((region) => {
      region.inert = true;
    });
    document.body.style.overflow = "hidden";

    const focusable = () =>
      Array.from(
        sheetRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    window.requestAnimationFrame(() => focusable()[0]?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
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
      document.removeEventListener("keydown", onKeyDown);
      pageRegions.forEach((region) => {
        region.inert = false;
      });
      document.body.style.overflow = previousOverflow;
      menuButton?.focus();
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className={`site-header${scrolled ? " site-header--scrolled" : ""}`}>
        <div className="site-header__inner shell">
          <a className="site-brand" href="#top" aria-label="CaratFlow home">
            <BrandMark />
          </a>
          <nav className="desktop-nav" aria-label="Primary navigation">
            {navigation.map((item) => (
              <a
                href={item.href}
                key={item.href}
                aria-current={active === item.href.slice(1) ? "location" : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <a
            className="button button--primary header-cta"
            href="#demo"
            onClick={() => trackCta("navigation")}
          >
            Book a Demo
          </a>
          <button
            className="menu-button"
            type="button"
            ref={menuButtonRef}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((value) => !value)}
          >
            <span>{open ? "Close menu" : "Menu"}</span>
            <span className="menu-icon" aria-hidden="true">
              <i />
              <i />
            </span>
          </button>
        </div>
      </header>
      {open ? (
        <div className="mobile-menu-layer" role="presentation">
          <button
            className="mobile-menu-overlay"
            type="button"
            onClick={close}
            aria-label="Close menu"
          />
          <div
            className="mobile-menu"
            id="mobile-menu"
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div className="mobile-menu__top">
              <BrandMark inverted />
              <button type="button" className="mobile-menu__close" onClick={close}>
                Close menu
              </button>
            </div>
            <nav aria-label="Mobile navigation">
              {navigation.map((item, index) => (
                <a href={item.href} key={item.href} onClick={close}>
                  <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  {item.label}
                </a>
              ))}
            </nav>
            <a
              className="button button--light"
              href="#demo"
              onClick={() => {
                trackCta("mobile-navigation");
                close();
              }}
            >
              Book a Demo
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}
