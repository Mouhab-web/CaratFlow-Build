# CaratFlow website rebuild

Implementation-ready one-page CaratFlow marketing site built with TanStack Start, React, TypeScript, and Vite. The page includes the requested product narrative, gated interactive ring customizer, explicit camera preflight for browser try-on, commerce and operations interfaces, pricing, FAQ, and qualified-demo form.

## Local development

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run typecheck
npm test
npm run validate:config
npm run release:check
```

The source-build command is `npm run build`. `npm run build:production` intentionally runs the release preflight first.

## Production configuration

Copy `.env.example` into the deployment environment and replace every example value. Production requires a final owned HTTPS origin, approved public contact and legal identity, physical address, privacy policy, terms, and matching runtime/client indexing settings.

Optional public destinations stay hidden until their validated HTTPS values are supplied. Preview and transient deployment hosts are never treated as canonical production hosts.

## Lead delivery

The preview form validates its complete interface locally but does not store or transmit personal information. Production submission fails closed, and the release preflight remains blocked, until an approved first-party lead-system binding is implemented and reviewed. Do not connect a generic webhook or add a lead destination without authorization, retention, access-control, and privacy review.

## Media and performance

- Marketing content renders without loading the 3D customizer, MediaPipe models, or camera code.
- The 3D customizer loads near its section or after an explicit user action and has local timeout, retry, and render-failure containment.
- Camera code loads only after the user opens the try-on preflight, and camera acquisition begins only after `Start Camera`.
- Camera streams and late-resolving resources are stopped when the experience closes, the page hides, or navigation occurs.
- MediaPipe WASM and landmark models use the exact third-party origins listed in the content security policy.

## Verification snapshot

Verified on 2026-08-06:

- TypeScript: pass
- Automated tests: 20/20 pass
- Ring configuration enumeration: 241,920 unique states
- Unique GLB asset combinations: 4,320
- Structurally valid GLB files: 47
- Development-mode client, SSR, and Cloudflare worker build: pass
- Responsive render checks: 1440 px, 390 px, and 320 px with no page-level horizontal overflow
- Initial render: no canvas, video, customizer, try-on, or MediaPipe chunk loaded
- Hydrated mobile menu and deferred customizer activation: pass

## Required launch decisions

The site is buildable and preview-ready, but it is not cleared for public production launch until all of the following are completed:

1. Supply and approve the final origin, legal entity, public address/contact, privacy policy, and terms.
2. Implement and authorize the first-party lead destination; then update the fail-closed endpoint and release gate in the same reviewed change.
3. Supply licensed webfont files for Source Serif 4 and Inter if exact typography is required; current CSS uses safe system fallbacks.
4. Confirm ownership and production rights for every retained GLB and brand asset, then perform final model appearance/compression review.
5. Run final physical-device camera checks, keyboard/screen-reader review, and production Lighthouse testing on the real deployment origin.

Only after those decisions should `DEPLOYMENT_ENV`, `VITE_DEPLOYMENT_ENV`, `ALLOW_INDEXING`, and `VITE_ALLOW_INDEXING` be changed to their production values.
