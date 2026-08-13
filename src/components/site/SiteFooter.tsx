import { navigation } from "@/content/site-content";
import { trackCta } from "@/lib/analytics";
import { siteConfig } from "@/lib/site-config";
import { BrandMark } from "./shared";

const footerLinks = [
  { href: "#platform", label: "Platform" },
  { href: "#customizer", label: "Customizer" },
  { href: "#try-on", label: "Try-On" },
  { href: "#commerce", label: "Commerce" },
  { href: "#operations", label: "Operations" },
  ...navigation.filter((item) => item.href === "#pricing" || item.href === "#faq"),
] as const;

export default function SiteFooter() {
  const year = new Date().getUTCFullYear();
  const legalReady = Boolean(
    siteConfig.companyLegalName && siteConfig.companyAddress && siteConfig.contactEmail,
  );
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div className="footer-brand">
          <a href="#top" aria-label="CaratFlow home">
            <BrandMark inverted />
          </a>
          <p>
            One connected jewelry commerce platform for configuration, try-on, selling, and
            operations.
          </p>
        </div>
        <nav className="footer-nav" aria-label="Product links">
          <h2>Explore</h2>
          <div>
            {footerLinks.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
            <a href="#demo" onClick={() => trackCta("footer")}>
              Book a Demo
            </a>
          </div>
        </nav>
        <div className="footer-legal">
          <h2>Company</h2>
          <div className="legal-links">
            {siteConfig.privacyPolicyUrl ? <a href={siteConfig.privacyPolicyUrl}>Privacy</a> : null}
            {siteConfig.termsUrl ? <a href={siteConfig.termsUrl}>Terms</a> : null}
            {siteConfig.contactEmail ? (
              <a href={`mailto:${siteConfig.contactEmail}`}>Contact</a>
            ) : null}
          </div>
          {siteConfig.contactEmail ? (
            <a className="footer-email" href={`mailto:${siteConfig.contactEmail}`}>
              {siteConfig.contactEmail}
            </a>
          ) : null}
          {legalReady ? (
            <address>{siteConfig.companyAddress}</address>
          ) : (
            <p className="config-notice">
              Legal and contact details are suppressed in preview until approved.
            </p>
          )}
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>
          © {year} {siteConfig.companyLegalName ?? "CaratFlow"}. All rights reserved.
        </span>
        <span>Configure · Try on · Sell · Operate · Grow</span>
      </div>
    </footer>
  );
}
