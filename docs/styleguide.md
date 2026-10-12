# Frontend Style Guide

This style guide helps keep our codebase consistent, readable, and accessible.

## Naming Conventions
- **Files:** kebab-case for new modules and CSS (e.g., `nav-links.js`, `styles/components/header.css`)
- **Components:** PascalCase files and names (e.g., `components/Header/PalettePicker.js`). Don't rename existing files to match.
- **Hooks:** `hooks/useSomething.js`. **Utilities:** `utils/camelCase.js`.
- **Variables & functions:** camelCase
- **Brand CSS classes:** prefixed `tag-` (e.g., `tag-card`, `tag-section`), so they never collide with Tailwind (`container`) or daisyUI (`btn`, `card`). Block-element style: `tag-footer__col`, modifiers `tag-feature--flip`.
- Every new JS/CSS file starts with the project's GPL header block.

## Formatting
- Use Prettier for code formatting
- Run `npm run lint` and fix all errors before committing
- Match the quote/semicolon style of the file you're editing

## Components
- Use functional React components and hooks
- Use absolute imports (e.g., `@/components/Button`)
- Keep components focused and reusable
- Don't add a helper, hook or component for something used once or twice: write it inline
- `<Link>`/`<a>` for navigation, `<button>` for actions; never `div onClick`

## Accessibility
- All UI must meet WCAG 2.2 AA in **every palette and mode** (body text 4.5:1, large text and UI 3:1)
- Use semantic HTML and ARIA attributes as needed: icon-only buttons get `aria-label`, menus `aria-expanded`
- Visible `:focus-visible` rings; Escape closes menus, popovers and panels; focus returns to the opener
- Honour `prefers-reduced-motion` in the file that owns the motion
- Test with screen readers and keyboard navigation

## Design system
The essentials:

### Tokens, palettes and modes
- All colours, radii and fonts come from `styles/tokens.css` as `var(--tag-…)`. **No raw hex anywhere else.**
- Theming is two attributes on `<html>`: `data-palette` (`orig` = the approved brand palette, the default; `7a` = Magenta) and `data-mode` (`dark` default, `light`). `data-theme` (`tag-dark`/`tag-light`) follows the mode for daisyUI.
- A head script in `pages/_document.js` applies the saved choice before first paint. The picker is `components/Header/PalettePicker.js`.
- Brand colours: Ghost White `#F5F5FC`, Electric Indigo `#6233FF`, Onyx `#151318`, Chartreuse `#CEFF1D`.
- `--tag-acc-text` is the only accent colour allowed for text. Bright accents never sit under white text. Primary buttons use `--tag-grad-btn`.

### Type
- Body **Manrope** (local brand file), headings **Sora** 600/700, both declared with `next/font` in `components/MyLayout.js`. No other families in the UI.

### Shared classes (use these before writing new CSS)
| Need | Use |
|---|---|
| Page width / gutters | `tag-container` |
| Section rhythm / faint band / centred head | `tag-section`, `tag-section--band`, `tag-section-head` |
| Accent bar, eyebrow, gradient text | `tag-accent-bar`, `tag-eyebrow`, `tag-grad-text` |
| Gradient-edged card | `tag-card` or `tag-g-edge` |
| Button row | `tag-cta-row` |
| Check list | `tag-checks` (`tag-checks--two`) |
| Filter chip / price tag | `tag-chip` (`aria-pressed`), `tag-price` |
| FAQ / accordion | `tag-accordion` with `<details>`/`<summary>` |
| Square icon button / count badge | `tag-icon-btn`, `tag-count` |
| Reveal on scroll | `data-reveal` inside a `tag-reveal-scope` (the landing page runs the reveal effect) |

daisyUI classes (`btn`, `btn-primary`, `btn-outline`, `input`, `select`, `textarea`, `card`, `badge`) are restyled site-wide in `styles/components/*.css`. Prefer them over custom buttons and fields.

### Where CSS lives
- `styles/globals.css` holds only the Tailwind import, the daisyUI plugin blocks and `@import`s. No rules.
- All CSS lives in `styles/` and is imported from `styles/globals.css` (the pages router only allows global CSS from `_app`).
- Site-wide: `styles/tokens.css`, `styles/base.css` (in `@layer base`), `styles/layout.css`.
- Components and shared primitives: `styles/components/<name>.css` (e.g. `header.css`, `button.css`).
- Page-only styles: `styles/pages/<page>.css` (e.g. `home.css`).
- New rules go in `@layer components`. **daisyUI 5 puts its components in `@layer utilities > daisyui`**, so overrides of daisyUI classes go in `@layer utilities { @layer daisyui { … } }`. That beats daisyUI's defaults while Tailwind utilities still win.
- Hover styles go inside `@media (hover: hover) and (pointer: fine)`. Animate only `transform` and `opacity`. Never `transition: all`.
- `styles/legacy.css` holds older helpers still in use; retire them as their last users go.

### Layout
- Breakpoints: below 1060px the hamburger menu and header panel buttons; from 1060px edge tabs; from 1280px the Browse/Cart panels push the page, below that they overlay with a scrim.
- No horizontal scroll at any width, with panels open or closed. Size display type with container units (`cqi`) where panels can narrow the page.
- Buttons are content-sized on phones and at least 44px tall on touch.

## Comments & Docs
- Use JSDoc for complex functions/components
- Write clear, concise comments where necessary

## Testing
- UI is verified on a production build (`npm run build` + `npm start`): screenshots in every palette/mode, axe, keyboard, reduced motion, Lighthouse
- Jest + React Testing Library are not installed yet; adding them is a team decision

---

For more, see `CONTRIBUTING.md` and `env.md`. Questions? Ask in your PR or open an issue.
