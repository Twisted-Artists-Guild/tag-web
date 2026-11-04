# npm Dependency Audit

## Snapshot

**Audit date:** 2026-11-01

**Repository:** `tag-web`

**Inputs:** `package.json`, `package-lock.json` (lockfile version 3), and the installed dependency tree.

The initial inventory had 68 direct dependencies: 57 production and 11 development. After the critical-finding and email-migration updates, the project has 67 direct dependencies: 56 production and 11 development. `npm ls --depth=0` completed without dependency-tree errors. The initial audit below was captured before those updates.

### Initial audit snapshot

| Check | Result |
|---|---|
| `npm audit` | 76 vulnerability records: 5 critical, 16 high, 54 moderate, 1 low |
| `npm audit --omit=dev` | 56 vulnerability records: 5 critical, 12 high, 38 moderate, 1 low |
| `npm outdated` | 48 direct packages reported; 43 had a newer version within their declared range and 9 had a newer major release available |
| Registry deprecation metadata | No deprecated version reported for the 68 direct packages in the initial audit |
| `npm ls --depth=0` | Passed |

Audit counts are from the live npm advisory registry and can change. They count advisory/package paths, not necessarily distinct root causes. Re-run the commands below before acting on the recommendations.

### Post-critical update audit

Before the email migration, the critical findings were addressed without changing major versions. At that intermediate point, `npm audit` reported **0 critical, 17 high, 53 moderate, and 1 low** (71 total); `npm audit --omit=dev` reported **0 critical, 13 high, 37 moderate, and 1 low** (51 total). This is a historical checkpoint; see the current post-email totals below.

### Post-email migration audit

The NextAuth email sender now uses Azure Communication Email, and the direct Nodemailer dependency has been removed. The current `npm audit` reports **0 critical, 13 high, 53 moderate, and 1 low** (67 total); `npm audit --omit=dev` reports **0 critical, 9 high, 37 moderate, and 1 low** (47 total). Nodemailer is not installed (`npm explain nodemailer` reports no dependencies found). NextAuth declares Nodemailer only as an optional peer; the app no longer imports NextAuth's default Nodemailer-backed Email provider.

## Security findings

The findings catalog and version table below describe the initial audit snapshot, before the critical updates. Use the post-update totals above for current status and re-run `npm audit` for live advisory details.

The audit catalog contains the following affected packages; direct packages are distinguished in the detailed tables below. Use `npm audit --json` to retrieve each advisory ID and affected range from the registry snapshot at remediation time.

- **Critical (5):** `@auth/core`, `@auth/pg-adapter`, `dompurify`, `next`, `next-auth`.
- **High (16):** `@azure/identity`, `@azure/msal-node`, `@tiptap/core`, `axios`, `brace-expansion`, `browserslist`, `fast-xml-parser`, `follow-redirects`, `js-yaml`, `nanoid`, `nodemailer`, `postcss`, `prosemirror-view`, `sharp`, `source-map-js`, `zod`.
- **Moderate (54):** `@eslint-community/eslint-utils`, `@eslint/config-array`, `@eslint/eslintrc`, `@tailwindcss/typography`, `@tiptap/extension-blockquote`, `@tiptap/extension-bold`, `@tiptap/extension-bubble-menu`, `@tiptap/extension-bullet-list`, `@tiptap/extension-code`, `@tiptap/extension-code-block`, `@tiptap/extension-document`, `@tiptap/extension-dropcursor`, `@tiptap/extension-file-handler`, `@tiptap/extension-floating-menu`, `@tiptap/extension-font-family`, `@tiptap/extension-gapcursor`, `@tiptap/extension-hard-break`, `@tiptap/extension-heading`, `@tiptap/extension-horizontal-rule`, `@tiptap/extension-image`, `@tiptap/extension-italic`, `@tiptap/extension-link`, `@tiptap/extension-list`, `@tiptap/extension-list-item`, `@tiptap/extension-list-keymap`, `@tiptap/extension-ordered-list`, `@tiptap/extension-paragraph`, `@tiptap/extension-placeholder`, `@tiptap/extension-strike`, `@tiptap/extension-text`, `@tiptap/extension-text-align`, `@tiptap/extension-text-style`, `@tiptap/extension-underline`, `@tiptap/extension-youtube`, `@tiptap/extensions`, `@tiptap/react`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `@typescript-eslint/type-utils`, `@typescript-eslint/typescript-estree`, `@typescript-eslint/utils`, `baseline-browser-mapping`, `eslint`, `eslint-config-next`, `eslint-plugin-header`, `eslint-plugin-import`, `eslint-plugin-jsx-a11y`, `eslint-plugin-react`, `minimatch`, `moment`, `postcss-selector-parser`, `sanitize-html`, `typescript-eslint`, `uuid`.
- **Low (1):** `deepmerge`.

The production dependency tree contains critical and high findings and should be prioritized for remediation. `npm audit` reported fixes for the directly affected packages, but some proposed paths cross major-version boundaries. Review each change in a separate, tested update rather than applying `npm audit fix --force` indiscriminately.

### Critical findings — resolved

| Package / path | Before | Fixed version | Result |
|---|---:|---:|---|
| `next` | 16.2.10 | 16.4.3 | Outside the affected ranges; production build passed. |
| `@auth/pg-adapter` -> `@auth/core` | 1.11.2 -> 0.41.2 | 1.11.3 -> 0.41.3 | Adapter and core updated to releases outside the critical affected ranges. |
| `next-auth` | 4.24.14 | 4.24.15 | Updated beyond the affected Auth.js release range. |
| `dompurify` | 3.4.11 | 3.4.17 | Updated beyond the critical affected range. |

Related advisories include [Next.js GHSA-6gpp-xcg3-4w24](https://github.com/advisories/GHSA-6gpp-xcg3-4w24), [Auth.js GHSA-7rqj-j65f-68wh](https://github.com/advisories/GHSA-7rqj-j65f-68wh), and [DOMPurify GHSA-55q2-fjhq-7xh7](https://github.com/advisories/GHSA-55q2-fjhq-7xh7). The full audit output includes additional advisories for each package.

### High findings

| Package / path | Locked version | Audit finding | Recommended action |
|---|---:|---|---|
| `@azure/identity` -> `@azure/msal-node` | 4.13.1 | High; both the direct package and its transitive MSAL dependency are affected. | Upgrade within the supported Azure SDK versions and test authentication to Azure resources. |
| `@tiptap/core` and extensions | 3.27.3 | High in core; moderate findings also affect several directly declared extensions and transitive ProseMirror packages. | Resolved: the whole family was updated to 3.32.2. Regression-test editor input, links, images, and saved content. |
| `axios` | 1.18.1 | High; 12 advisory paths reported for this direct package. | Upgrade to a fixed compatible version and test API calls, redirects, and error handling. |
| `nodemailer` | 7.0.13 | High in the initial audit; npm suggested a major-version update. | Resolved by migrating NextAuth email delivery to Azure Communication Email and removing the direct dependency. |
| `postcss` | 8.5.16 | High; affected through 8.5.22. | The lockfile now resolves 8.5.23; verify with future audits and Tailwind/PostCSS builds. |
| `sharp` | 0.34.5 | High; npm reports a fix at 0.35.5. | Resolved: updated to 0.35.5, the same version Next.js uses. Verify image optimization on deployment platforms. |

Moderate direct findings also affect Tiptap extensions, `@tailwindcss/typography`, ESLint packages, `moment`, and `sanitize-html`. For `@tailwindcss/typography`, the audit's fix metadata proposes version 0.5.4 while the installed version is 0.5.20; verify the advisory and package history before acting on that recommendation.

### Post-remediation audit (npm audit fix, Tiptap, Sharp)

After `npm audit fix`, the Tiptap family update to 3.32.2, and the Sharp update to 0.35.5, `npm audit` reports **0 critical, 0 high, and 19 moderate** vulnerabilities; `npm audit --omit=dev` reports 2 moderate. The Axios and Azure Identity findings cleared with the in-range lockfile updates. The table above shows the original findings; this section is current.

### Dependency-remediation priority

1. **Completed:** address critical production findings in Next.js, Auth.js, and DOMPurify.
2. **Completed:** resolve remaining high findings (Axios, Azure Identity, Tiptap, Sharp). Remaining work is the moderate findings.
3. **Completed:** migrate NextAuth verification emails to Azure Communication Email and remove the direct Nodemailer dependency. Mailgun remains a separate inbound-reply forwarding integration.
4. Re-run the production and full audits after each remediation batch. Do not silence or override audit findings without documenting the risk and owner.

## Updates and major-version opportunities

The following versions are from the lockfile. “Wanted” is the newest version matching the current declared semver range reported by `npm outdated`; major releases should be evaluated separately. An em dash means `npm outdated` reported no newer version for the current range/latest comparison.

| Scope | Package | Locked | License | Wanted / latest opportunity |
|---|---|---:|---|---|
| prod | `@auth/pg-adapter` | 1.11.3 | ISC | — |
| prod | `@azure/communication-email` | 1.1.0 | MIT | — |
| prod | `@azure/identity` | 4.13.1 | MIT | 4.14.1 |
| prod | `@azure/storage-blob` | 12.33.0 | MIT | 12.34.0 |
| prod | `@headlessui/react` | 2.2.10 | MIT | — |
| prod | `@microsoft/applicationinsights-web` | 3.4.3 | MIT | 3.4.5 |
| prod | `@microsoft/signalr` | 10.0.0 | MIT | 10.0.11 |
| prod | `@stripe/react-stripe-js` | 6.7.0 | MIT | 6.12.0; latest 7.0.1 |
| prod | `@stripe/stripe-js` | 9.9.0 | MIT | 9.17.0; latest 10.2.0 |
| prod | `@tailwindcss/typography` | 0.5.20 | MIT | — |
| prod | `@tiptap/core` | 3.27.3 | MIT | 3.32.2 |
| prod | `@tiptap/extension-file-handler` | 3.27.3 | MIT | 3.32.2 |
| prod | `@tiptap/extension-font-family` | 3.27.3 | MIT | 3.32.2 |
| prod | `@tiptap/extension-image` | 3.27.3 | MIT | 3.32.2 |
| prod | `@tiptap/extension-link` | 3.27.3 | MIT | 3.32.2 |
| prod | `@tiptap/extension-placeholder` | 3.27.3 | MIT | 3.32.2 |
| prod | `@tiptap/extension-text-align` | 3.27.3 | MIT | 3.32.2 |
| prod | `@tiptap/extension-text-style` | 3.27.3 | MIT | 3.32.2 |
| prod | `@tiptap/extension-underline` | 3.27.3 | MIT | 3.32.2 |
| prod | `@tiptap/extension-youtube` | 3.27.3 | MIT | 3.32.2 |
| prod | `@tiptap/pm` | 3.27.3 | MIT | 3.32.2 |
| prod | `@tiptap/react` | 3.27.3 | MIT | 3.32.2 |
| prod | `@tiptap/starter-kit` | 3.27.3 | MIT | 3.32.2 |
| prod | `axios` | 1.18.1 | MIT | 1.21.0 |
| prod | `crisp-sdk-web` | 1.2.0 | MIT | 1.2.1 |
| prod | `dompurify` | 3.4.17 | (MPL-2.0 OR Apache-2.0) | — |
| prod | `form-data` | 4.0.6 | MIT | — |
| prod | `formidable` | 3.5.4 | MIT | — |
| prod | `html2canvas` | 1.4.1 | MIT | — |
| prod | `jspdf` | 4.2.1 | MIT | — |
| prod | `jsonwebtoken` | 9.0.3 | MIT | — |
| prod | `lucide-react` | 1.23.0 | ISC | 1.66.0 |
| prod | `mailgun.js` | 13.2.0 | MIT | 13.3.0; latest 14.1.0 |
| prod | `micro` | 10.0.1 | MIT | — |
| prod | `moment` | 2.30.1 | MIT | 2.31.0 |
| prod | `next` | 16.4.3 | MIT | — |
| prod | `next-auth` | 4.24.15 | ISC | — |
| prod | `next-sitemap` | 4.2.3 | MIT | — |
| prod | `nextjs-progressbar` | 0.0.16 | MIT | — |
| prod | `pg` | 8.22.0 | MIT | 8.23.1 |
| prod | `qrcode` | 1.5.4 | MIT | — |
| prod | `react` | 19.2.7 | MIT | 19.3.1 |
| prod | `react-dom` | 19.2.7 | MIT | 19.3.1 |
| prod | `react-hot-toast` | 2.6.0 | MIT | 2.6.1 |
| prod | `react-icons` | 5.7.0 | MIT | — |
| prod | `react-image-gallery` | 2.1.2 | MIT | — |
| prod | `react-slick` | 0.31.0 | MIT | — |
| prod | `react-syntax-highlighter` | 16.1.1 | MIT | 16.1.2 |
| prod | `react-tooltip` | 5.30.1 | MIT | latest 6.0.9 (major) |
| prod | `recharts` | 3.9.2 | MIT | 3.10.1 |
| prod | `remark` | 15.0.1 | MIT | — |
| prod | `remark-html` | 16.0.1 | MIT | — |
| prod | `sanitize-html` | 2.17.5 | MIT | 2.18.1 |
| prod | `sharp` | 0.34.5 | Apache-2.0 | latest 0.35.5 |
| prod | `slick-carousel` | 1.8.1 | MIT | latest 2.0.0 (major) |
| prod | `stripe` | 22.3.0 | MIT | 22.6.2; latest 23.1.0 |
| dev | `@tailwindcss/postcss` | 4.3.2 | MIT | 4.3.3 |
| dev | `autoprefixer` | 10.5.2 | MIT | 10.6.2 |
| dev | `cross-env` | 10.1.0 | MIT | — |
| dev | `daisyui` | 5.6.14 | MIT | 5.7.50 |
| dev | `eslint` | 9.39.4 | MIT | 9.39.5; latest 10.14.0 |
| dev | `eslint-config-next` | 16.2.10 | MIT | 16.4.3 |
| dev | `eslint-plugin-header` | 3.1.1 | MIT | — |
| dev | `eslint-plugin-import` | 2.32.0 | MIT | — |
| dev | `npm-check-updates` | 21.0.3 | Apache-2.0 | latest 23.1.1 (major) |
| dev | `postcss` | 8.5.23 | MIT | 8.5.32 |
| dev | `tailwindcss` | 4.3.2 | MIT | 4.3.3 |

## Usage and consolidation review

A static scan of JavaScript imports/requires, CSS imports, and repository configuration did not find code/config references for the following direct packages. This is a candidate list, not proof that each package is safe to remove; check runtime-loaded modules, deployment behavior, and generated CSS before changing the manifest.

| Candidate | Scope | Notes |
|---|---|---|
| `@azure/identity` | prod | No static reference found; verify Azure credential construction and deployment configuration. |
| `@tailwindcss/typography` | prod | No static reference found; also appears in audit findings. |
| `@tiptap/extension-file-handler` | prod | No static reference found; confirm editor extension registration. |
| `crisp-sdk-web` | prod | No static reference found; verify any dynamically loaded chat integration. |
| `dompurify` | prod | No static reference found; `sanitize-html` is imported in application code. It is also affected by critical advisories. |
| `react-slick`, `slick-carousel` | prod | No static reference found; check route-level/lazy loading and styles before removal. |
| `react-syntax-highlighter` | prod | No static reference found; verify dynamically selected documentation/content renderers. |
| `eslint-plugin-header` | dev | Not configured in `eslint.config.cjs`; README still mentions a header check. Verify whether another CI step enforces it. |
| `npm-check-updates` | dev | No repository script/config reference; it may be an intentionally invoked developer CLI. |

Special cases: `next-sitemap`, `cross-env`, and `autoprefixer` are referenced by npm scripts or PostCSS configuration; `daisyui` is registered by `styles/globals.css`; `sharp` is relevant to Next.js image optimization; and `react-dom` is a React runtime peer. NextAuth declares Nodemailer as an optional peer, but the application now defines its email provider with a custom Azure sender and does not install or import Nodemailer.

Potential consolidation work should verify overlap, not remove packages solely by category. Examples to assess include `react-icons` vs. `lucide-react` and the Tiptap extensions vs. functionality already included by `@tiptap/starter-kit`.

## License review

All 67 current direct package manifests declare a license identifier. The direct set is predominantly MIT, with ISC, Apache-2.0, and DOMPurify's dual choice `(MPL-2.0 OR Apache-2.0)`. Nodemailer, previously listed with `MIT-0`, has been removed. No current direct package is missing license metadata.

The installed dependency tree contains 972 package manifest entries. Twenty had no `license` field; this includes framework/bundler compatibility packages and should be checked against the actual production dependency graph before distribution. The Windows Sharp binary package `@img/sharp-win32-x64` reports `Apache-2.0 AND LGPL-3.0-or-later`; review the platform-specific Sharp binaries included in deployment and meet any applicable notices/source obligations. This is an inventory, not legal advice or a definitive license-compatibility opinion.

## Recommended follow-up work

1. **Security remediation:** create a security follow-up for the critical/high audit findings, prioritized by production reach and tested in separate dependency update batches.
2. **Unused dependency cleanup:** verify the candidate packages above, then remove confirmed unused packages and update the lockfile.
3. **Dependency modernization:** schedule coordinated updates for Tiptap, Next.js/authentication, and carefully scoped major-version opportunities.
4. **Email migration validation:** verify NextAuth sign-in links and system email delivery in an environment configured with Azure Communication Email credentials; track remaining acceptance work under parent issue [#273](https://github.com/Twisted-Artists-Guild/tag-web/issues/273).

Suggested issue titles:

- `[SECURITY] Remediate npm audit vulnerabilities in production dependencies`
- `[TECH DEBT] Remove verified unused npm dependencies`
- `[TECH DEBT] Modernize direct npm dependency versions`

These are recommended follow-ups; they have not been opened as GitHub issues from this workspace.

## Repeatable audit commands

Run from the repository root after installing the lockfile:

```sh
npm ci
npm audit
npm audit --omit=dev
npm outdated
npm ls --all
```

For package removal candidates, search imports, dynamic imports, configuration, CSS, npm scripts, and production/deployment entry points; then run lint, build, and the affected feature tests. Review license/deprecation metadata for newly added or upgraded direct and transitive dependencies before merging.
