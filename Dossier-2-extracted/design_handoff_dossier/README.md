# Handoff: Dossier — Investment Analyst Workbench

## Screenshots

Visual reference for each screen. PNGs in `screenshots/`.

| # | Screen           | File                                                |
|---|------------------|-----------------------------------------------------|
| 1 | Command Center   | `screenshots/01-desk.png`                            |
| 2 | Build Thesis     | `screenshots/02-build-thesis-1-brainstorm.png` ... `5-promote.png` (5 phase states) |
| 3 | Thesis Detail    | `screenshots/03-thesis-detail.png`                   |
| 4 | Stock Detail     | `screenshots/04-stock-detail.png`                    |
| 5 | Fund Detail      | `screenshots/05-fund-detail.png`                     |
| 6 | Search Stocks    | `screenshots/06-search-stocks.png`                   |
| 7 | Search Funds     | `screenshots/07-search-funds.png`                    |
| 8 | Performance      | `screenshots/08-performance.png`                     |
| 9 | Compare          | `screenshots/09-compare.png`                         |

## Overview

Dossier is an analyst-facing investment workbench. The design covers nine connected screens that take a user from idea brainstorming through thesis-building, scenario testing, expert review, portfolio promotion, and live performance tracking — plus opportunity hunting for stocks and funds, and side-by-side thesis comparison.

This handoff covers a full UI redesign for the existing `investmentadvisor` repo. The visual system, screen layouts, components, and copy are all defined here. **The data models, API endpoints, stores, and underlying business logic in the existing repo should be preserved.** This redesign re-skins and re-shapes the UI on top of the existing data flows; it does not replace the backend.

---

## About the Design Files

The HTML files in `screens/` are **design references** — high-fidelity prototypes showing intended look, layout, copy, and interaction behavior. They are **not production code to copy directly**.

The target codebase is React 18 + TypeScript + Vite + Tailwind + Zustand (`willodonnell-cmd/investmentadvisor`). The task is to **re-implement these designs as React components in that codebase**, using its established patterns:

- React Router for navigation (existing `App.tsx` routes — extend, don't replace)
- Zustand stores for state (existing `useThesisStore`, `useHuntStore`, `usePortfolioStore`, `useMacroStore` — keep)
- Tailwind for styling, with custom color tokens defined in `tailwind.config.js`
- The existing `tk` color object in screens like `HuntScreen.tsx` and `ThesisScreen.tsx` is a useful starting point — the new design refines and extends it (see Design Tokens below)
- Component decomposition into `src/components/cards/`, `src/components/ui/`, `src/components/layout/`

Open each HTML file in a browser to see the live design — interactions, hover states, the floating AI dock, the lifecycle pill, etc.

---

## Fidelity

**High-fidelity.** Exact colors (hex), typography (sizes, weights, letter-spacing), spacing, border-radii, shadows, copy, and interactions are all specified below and visible in the HTML. The developer should re-create the UI pixel-perfectly. The HTML files use vanilla CSS with custom properties; the equivalent Tailwind tokens are mapped in the Design Tokens section.

---

## Integration Plan: Mapping Designs onto Existing Routes

| Design screen      | HTML file                  | Existing route        | Existing component                                   | Notes                                        |
|--------------------|----------------------------|------------------------|------------------------------------------------------|----------------------------------------------|
| Command Center     | `Desk.html`                | `/`                    | `InvestmentDesk.tsx`                                 | Rebuild as 3-column pipeline w/ rich cards   |
| Build Thesis       | `Build Thesis.html`        | `/brainstorm`          | `BrainstormingScreen.tsx`                            | Replace with 5-phase wizard                  |
| Thesis Detail      | `Thesis Detail.html`       | `/thesis/:id`          | `ThesisScreen.tsx`                                   | Rebuild as scrollable detail w/ editable cells |
| Stock Detail       | `Stock Detail.html`        | NEW: `/stock/:ticker`  | NEW component `StockDetailScreen.tsx`                | New route to add                             |
| Fund Detail        | `Fund Detail.html`         | NEW: `/fund/:ticker`   | NEW component `FundDetailScreen.tsx`                 | New route to add                             |
| Search Stocks      | `Search Stocks.html`       | `/hunt` (stocks mode)  | `HuntScreen.tsx` (stocks mode)                       | Re-skin existing screen                      |
| Search Funds       | `Search Funds.html`        | `/hunt` (funds mode)   | `HuntScreen.tsx` (funds mode)                        | Re-skin existing screen                      |
| Performance        | `Performance.html`         | `/paper`               | `PaperTrackerScreen.tsx`                             | Re-skin with new dashboard layout            |
| Compare            | `Compare.html`             | `/compare`             | `ComparisonScreen.tsx`                               | Rebuild as side-by-side table                |

Recommended new sidebar nav structure (replace `NAV_ITEMS` in `Sidebar.tsx`):

```ts
const NAV_ITEMS = [
  { label: 'Command Center', path: '/' },           // group: Workspace
  { label: 'Build Thesis',   path: '/brainstorm' },
  { label: 'Search Stocks',  path: '/hunt?mode=stocks' },
  { label: 'Search Funds',   path: '/hunt?mode=funds' },
  { label: 'Performance',    path: '/paper' },
  { label: 'Compare',        path: '/compare' },
]
```

A second group, "Thesis Pipeline," shows the three stage-filtered views of the pipeline (Developing / Actionable / Live) — wire these to filter `/` by stage.

---

## Design Tokens

### Colors

All colors are warm-cream / ink-dark with a sunburst-amber accent system.

```css
/* Backgrounds & surfaces (warm cream) */
--bg:        #ede9e0   /* page background */
--surface:   #f5f2eb   /* secondary surface (sidebar nav items, etc.) */
--surface-2: #e8e4d8   /* tertiary surface (hover, segmented bg) */
--card:      #fbf8f1   /* card background */

/* Ink (dark text) */
--ink:       #1a1a1f   /* primary text */
--ink-2:     #3a3a42   /* secondary text */
--muted:     #6b6960   /* muted body */
--muted-2:   #8b8980   /* label/eyebrow text */

/* Hairlines */
--hairline:   rgba(0,0,0,.08)
--hairline-2: rgba(0,0,0,.14)

/* Sunburst — primary accent system (use as gradient stops for the brand sigil
   and primary CTAs; the sigil is a watch-dial-style radial gradient) */
--sun-1: #ffd87a    /* light highlight */
--sun-2: #f4922c    /* mid amber */
--sun-3: #e0511a    /* deep red-amber */
--sun-4: #a01a0c    /* shadow */

/* Stage colors (pipeline stages) */
--purple: #4a1d6b   /* Developing */
--rust:   #92400e   /* Actionable */
--green:  #2d6a4f   /* Live */

/* Semantic */
--pos: #2d6a4f      /* gains, advance-to-dossier */
--neg: #9b2c1a      /* losses, kill, danger */
--amber:      #c4892a   /* highlights, deprecated; prefer --sun-3 */
--amber-soft: rgba(196,137,42,.12)
```

#### Tailwind config additions

Add these to `tailwind.config.js` `theme.extend.colors`:

```js
colors: {
  cream: { 50: '#fbf8f1', 100: '#f5f2eb', 200: '#ede9e0', 300: '#e8e4d8', 400: '#d8d0c4' },
  ink:   { DEFAULT: '#1a1a1f', 2: '#3a3a42' },
  muted: { DEFAULT: '#6b6960', 2: '#8b8980' },
  sun:   { 1: '#ffd87a', 2: '#f4922c', 3: '#e0511a', 4: '#a01a0c' },
  stage: { dev: '#4a1d6b', act: '#92400e', live: '#2d6a4f' },
  pos:   '#2d6a4f',
  neg:   '#9b2c1a',
}
```

#### The sunburst sigil (used in brand mark + AI markers + CTAs)

The "sunburst" is a watch-dial-style radial gradient. It appears as a small circle in the sidebar brand, on AI mention pips, on the primary CTA, and on lifecycle current-state indicators. The CSS:

```css
.sunburst {
  border-radius: 50%;
  background:
    radial-gradient(circle at 50% 32%, rgba(255,250,235,.7) 0%, rgba(255,250,235,0) 38%),
    repeating-conic-gradient(from 0deg, rgba(255,255,255,.12) 0 1.2deg, rgba(0,0,0,.10) 1.2deg 2.4deg),
    radial-gradient(circle at 50% 50%, var(--sun-1) 0%, var(--sun-2) 30%, var(--sun-3) 70%, var(--sun-4) 100%);
  box-shadow:
    inset 0 0 0 1px rgba(0,0,0,.25),
    inset 0 -2px 4px rgba(0,0,0,.18),
    0 0 0 2px rgba(0,0,0,.4),
    0 1px 2px rgba(0,0,0,.4);
}
```

Render as a React component `<Sunburst size={22} />` and reuse everywhere.

### Typography

Two families, loaded from Google Fonts:

```html
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

- **Hanken Grotesk** — sans-serif, all body / heading / UI text. Weights 400 / 500 / 600 / 700.
- **Geist Mono** — monospace, all numbers, tickers, timestamps, metadata, keyboard shortcuts. Weights 400 / 500.

Type scale (the design is dense — these are accurate, do not round up):

| Use                                              | Size | Weight | Letter-spacing | Line-height |
|--------------------------------------------------|------|--------|----------------|-------------|
| Page title (topbar h1)                           | 22px | 600    | -0.01em        | 1           |
| Section title (td-sec-hd h2 — uppercase eyebrow) | 12–13px | 700 | 0.13em         | 1.3         |
| Hero title (td-title, on detail screens)         | 26px | 600    | -0.015em       | 1.2         |
| Card title (.card .ttl on Desk)                  | 16px | 600    | -0.005em       | 1.25        |
| Body                                             | 13px | 400    | normal         | 1.5         |
| Body — emphasis (b)                              | inherit | 600 | inherit        | inherit     |
| Smaller body                                     | 12.5px | 400  | normal         | 1.55        |
| Eyebrow / uppercase labels                       | 9.5–10px | 700 | 0.13em         | 1           |
| Metadata mono                                    | 10.5–11px | 500 | 0.005em       | 1.2         |
| Numeric readout (mono, tabular)                  | 13–22px | 600 | -0.005em–-0.01em | 1.2       |
| Pill / chip                                      | 9.5–11.5px | 600–700 | 0.13em (uppercase) | 1 |
| Conviction number (big mono)                     | 20–22px | 600   | -0.01em        | 1           |

All monospace use `font-feature-settings: "tnum"` (`font-variant-numeric: tabular-nums`) — numbers must align in tables.

Body should use `font-feature-settings: "ss01","ss02","cv11"` (Hanken Grotesk stylistic alternates) and `text-wrap: pretty` where supported.

### Spacing & radii

```css
--r-card: 12px;     /* card corners */
--r-btn:   8px;     /* button corners */
--r-pill:  4px;     /* tight pill (sector chip on Desk) */
                    /* 99px for fully-rounded pills */
```

Spacing in the design follows an 8/12/14/18/24 rhythm — not a strict 4/8/16 scale. Common values:
- Cell padding: `12px 14px` (canvas cell), `14px 16px` or `14px 18px` (sd-cards)
- Section gap: `18–22px` between major sections
- Page horizontal padding: `24px` (sometimes 22 in narrower layouts)
- Stack gap: `8px` for label/value, `14px` between rows, `18–22px` between blocks

### Shadows

```css
/* card resting */
box-shadow: 0 1px 0 rgba(255,255,255,.5) inset, 0 1px 2px rgba(0,0,0,.02);

/* card hover */
box-shadow: 0 1px 0 rgba(255,255,255,.6) inset, 0 8px 20px -14px rgba(0,0,0,.18);

/* CTA / primary button (over the sunburst gradient) */
box-shadow: inset 0 1px 0 rgba(255,255,255,.25), 0 1px 2px rgba(0,0,0,.18);

/* AI dock */
box-shadow: 0 12px 32px -16px rgba(0,0,0,.25), 0 2px 6px rgba(0,0,0,.06);

/* Promote toast */
box-shadow: 0 10px 28px -16px rgba(0,0,0,.30), 0 2px 6px rgba(0,0,0,.06);
```

### Hairlines & dividers

Always use `1px solid var(--hairline)` (subtler) or `var(--hairline-2)` (stronger). Don't use grays from the muted palette for borders — use the hairline tokens so borders inherit warmth.

---

## Layout Primitives (used on every screen)

### Sidebar (`<aside class="side">`)

- 220px wide, dark ink background (`#1a1a1f`), light-cream text (`#cfcdc4`).
- Brand header: sunburst sigil + "DOSSIER" + env badge ("v0.9").
- Two nav groups: **Workspace** and **Thesis Pipeline** (each with a small sunburst pip on the left of the header).
- Each nav item is a row with optional count chip (right-aligned, mono, 10.5px, in a soft pill).
- Active item: amber-accented left-bar (3px `var(--sun-2)`), white text, subtle amber-to-transparent left-gradient background.
- Below nav: **AI section** — model picker (dropdown with tier badge) and reasoning segmented control (Low / Medium / High).
- Bottom: account row (avatar + name + role).

The existing `Sidebar.tsx` and `OpenAIModelSelect.tsx` cover most of this; the redesign adds the count chips on workspace items, the reasoning segmented control, and the "Thesis Pipeline" group with three stage links.

### Topbar (`<header class="topbar">`)

Two columns:
- **Left:** page title (h1 22px 600) + crumb/subtitle (12px muted)
- **Right:** action buttons (Share / Export / etc.) and/or stamps ("Last hunt · 22 May · 14:08")

On detail screens (Thesis/Stock/Fund Detail), the topbar uses a different variant — a back-breadcrumb on the left ("← Command Center · Thesis #024") and an action group on the right.

### Floating "Ask AI" dock (`<aside class="td-dock">`)

A persistent docked panel in the bottom-right of every screen, 400px wide, 520px tall.

- Collapsed by default → just header with sigil + "Ask AI · about <context>" + chevron
- Click header to expand → empty state with intro paragraph + 4 starter-question buttons
- Send a message → simulated AI reply appended below user message
- Each screen has different starter questions and reply text, scoped to the screen's data (see per-screen sections)

This is the most consistent affordance in the app. Every screen has it, contextualized. Implement once as `<AskAIDock context="thesis-detail" thesisId={id} />` or similar and pass starter questions + response generator via props.

### Tweaks panel (`tweaks-panel.jsx` — included for reference)

A floating bottom-right panel that opens via a toolbar toggle, exposing live design tweaks (accent color, density, sidebar visibility, CTA style). **Not needed in production** — this is a design-time tool only.

### Status footer (`<footer class="statusbar">`)

Thin footer at the bottom of every screen: date + next event + ⌘K command palette hint. Mono 11px, muted color.

---

## Screen-by-Screen

### 1. Command Center (`Desk.html` → route `/`)

**Purpose:** Daily landing surface. Shows the analyst's full pipeline of theses, stocks, and funds, organized by lifecycle stage. Each card is clickable to open its detail screen.

**Layout:**
- Sidebar (220px) + main column (fluid, min-width 1180px).
- Topbar with "Command Center" title and "Overlay: Prologis lens" pill toggle.
- Optional summary band (env state — collapsed/expanded).
- Section eyebrow "Today" and a "next event" summary row.
- **Pipeline (hero):** 3-column grid, columns labeled `Developing` (purple), `Actionable` (rust), `Live` (green). Each column has:
  - Header: stage label (uppercase, 11px, 0.14em tracking, in stage color) + count chip
  - 3px stage-color left-bar on the column header background
  - Body: vertical stack of cards (14px gap)
  - Footer: dashed `+ New hypothesis` / `+ Promote from developing` row

**Card anatomy:**
Cards are rounded `12px`, `var(--card)` background, soft gradient tint by card type (thesis = amber tint, stock = teal tint, fund = purple tint). Each card has:
- **Header strip:** small circular type-chip (T / S / F, single uppercase letter), ticker (mono 11.5px bold), sector chip (right-aligned, color-coded per sector), id (mono 10px muted)
- **Body:**
  - Title (16px 600, balanced text-wrap)
  - Snippet (12.5px muted, pretty text-wrap)
  - **Live-line** (only on stock/position cards in Live column): 3-column mini-grid showing Size / MTD P&L / Invalidation, with a green tint
  - **Conviction row:** "CONVICTION" label + horizontal bar + big mono number (20px) + `/100` small
- **Footer:** icon + label/value pair on the left (Catalyst / Trigger / Review), age or sized stamp on the right

**Card interactions:**
- Hover: lifts 1px up, border darkens to `--hairline-2`, soft shadow appears.
- Hover reveals a `×` delete button top-right (22×22 transparent → on hover, red tint).
- Click → navigates to the matching detail screen (`Thesis Detail.html`, `Stock Detail.html`, `Fund Detail.html`).
- Click the `×` → in-card confirm overlay (semi-translucent, with "Delete this card? Cancel / Delete" — Delete button is `var(--neg)`).

**Promote handoff toast (top-of-screen, see also Build Thesis):**
When the URL has `?promoted=1`, Desk reads `sessionStorage["dossier:justPromoted"]` (JSON with thesis fields), inserts a new card at the top of Developing with `.just-promoted` class (CSS animation: `newCardIn` — fade-in + lift + amber-glow box-shadow that decays over 1s), bumps the Developing count chip in the column header and sidebar, and shows a centered toast pill at the top: sunburst sigil + "<TICKER> promoted to Developing" + "Open →" link + dismiss. Toast auto-hides after 7s. URL is cleaned via `history.replaceState`.

**Sector chip colors:** energy `#1e4d5c`/`#dbeaef`; materials `#5a3a1a`/`#ece1cc`; commodity `#7a4a0c`/`#f0e2c4`; reit `#3a3650`/`#dedce8`; position `#1a4a36`/`#d5e6dc`.

**Data source in the existing repo:** `useThesisStore`, filtered by `stage` (Developing/Actionable/Live). For stock/fund cards, derive from existing position data or `useHuntStore` results that have been advanced to dossier.

---

### 2. Build Thesis (`Build Thesis.html` → route `/brainstorm`)

**Purpose:** A guided 5-phase wizard for taking a rough investment idea through brainstorming, canvas-building, scenario analysis, expert-panel review, and final promotion to the Developing pipeline column.

**Layout:**
- Sidebar (Build Thesis active) + main column.
- Topbar: "Build Thesis" title + Drafts button (with count chip) + "Save Draft" button on the right.
- Phase nav: horizontal stepper with 5 steps (Brainstorm / Canvas / Scenarios / Experts / Promote). Each step has a number disc + label. Active = sunburst-filled disc, white text. Completed = green dot + ink-2 text. Future = muted gray. Steps connected by 18px hairline trails.
- One phase visible at a time, swapped via JS (`.bt-stage.on`).

**Phase 1: Brainstorm**
- Stage header: H2 22px "What thesis are you exploring?" + 13px muted subhead.
- Empty conversation area (collapses if no messages).
- Composer: rounded card with textarea + footer row containing tip text + "Generate canvas →" CTA (disabled until input).
- "Suggested prompts" section: 3-col grid of 6 prompt cards (rotating from a 25-prompt pool, shufflable). Each card has a small amber tag + a short prompt. Click a prompt → pre-fills the composer.

**Phase 2: Canvas**
- Header + subtitle.
- **13-cell canvas:** 4-col grid. First cell ("Hypothesis") spans 2 columns. Each cell is a rounded card with:
  - Tiny mono index (01, 02, …) + uppercase title (11px 700 0.06em)
  - Body paragraph (12px)
- Footer: secondary "Refine in chat" + primary "Run scenarios →" CTA.

The 13 categories are: Hypothesis, Consensus, Variant view, Mechanism, Horizon, Catalysts, Vehicles, Sizing, Disconfirming, Risks, Invalidation, Macro fit, Linked.

**Phase 3: Scenarios**
- 3-col grid: Bull / Base / Bear cards.
- Each card has a colored left-bar (green / amber / red), name + probability % header, big mono return number, and a narrative paragraph.
- Footer: "Expected value +18.4% · Sharpe est. 1.1" + "Adjust weights" + "Submit to expert panel →".

**Phase 4: Experts**
- **Selection rules** card on the left + **Panel posture** + **probability matrix** on the right.
- **Panel synthesis** card: H3 "Panel Synthesis" + verdict-distribution pill bar ("2 Endorse · 2 Challenge · 1 Reframe"); then 6 cells in a 2-col grid: Strongest for / Strongest against / Most contested variable / Convergence / Divergence / What would resolve.
- **Individual perspectives:** List of 5 expandable voice cards (Soros / Druckenmiller / Marks / Munger / Zell). Each card has:
  - Header: avatar circle (named gradient per expert), name + role, verdict badge (Endorse / Challenge / Reframe), confidence pill (High / Med), expand chevron.
  - Body (when expanded): italicized pull-quote argument, mispriced-pill + probability scenario, "What would change their verdict" box, and an **AI-drafted improvement** panel — gradient-amber background with a paragraph + Refine / Dismiss / Apply-to-canvas buttons.
- **Reconciliation with Research View** card: 4-cell grid (Agreements / Disagreements / Stronger evidence base / Lifecycle implication).
- Footer: counter "X of 5 improvements applied" + Re-run panel + Continue →.

**Phase 5: Promote**
- Single card: title + sub, 6-cell summary grid (Type / Stage on save / Conviction / Horizon / Sizing target / Expected return), Save as draft + **Promote to Developing →** CTA.
- Promote CTA stores the thesis payload to `sessionStorage["dossier:justPromoted"]` then navigates to `Desk.html?promoted=1`.

**Drafts modal:** Top-right "Drafts" button opens a centered modal listing saved drafts (3 example items, each with title + meta + phase pill in different colors). Backdrop-blur overlay. Close with `×` or backdrop click.

---

### 3. Thesis Detail (`Thesis Detail.html` → route `/thesis/:id`)

**Purpose:** Full-screen home for a thesis post-promotion. Editable canvas, scenarios, expert panel, all live.

**Layout:**
- Sidebar (Command Center active — user came from there).
- Top breadcrumb topbar: back arrow + "Command Center · Thesis #024" + action group (Share / Export / Open in Builder / Archive).
- **Hero card** (margin 18/24, rounded 14px, with sunburst left-bar 4px):
  - Pretitle row: type chip + #id + ticker (mono bold) + sector chip + "Long / XLU short" annotation.
  - Title (h1, 26px 600, balanced).
  - Subtitle (13.5px muted).
  - Right side: **Lifecycle pill** — 3-segment pill ("Developing → Actionable → Live") in a rounded surface; current segment is white background + colored text + pip (Developing → purple, Actionable → rust, Live → green). Click any segment to advance. Below the pill: "Promoted 14 days ago · last edited 4m ago" stamp.
  - **Meta strip** (6-cell grid, no outer padding, rounded 10px): Conviction (with mini bar), Sizing target, Horizon, Expected return (green), Panel posture (amber "Mixed"), Next catalyst (with date stamp).
- **Sections** (scrollable, with eyebrow headers `td-sec-hd`):
  - **Thesis Canvas** — same 13-cell grid as Build Thesis Phase 2, but each cell has:
    - Hover affordances top-right: ✏️ Edit + ✨ Ask AI (mini 22×22 buttons, fade in on hover)
    - Click ✏️ → in-place textarea replaces the paragraph; blur or Cmd-Enter commits; Esc cancels
    - Click ✨ → inline Ask-AI panel slides into the cell (dashed amber border-top, cell-specific suggested prompts like "Sharpen this into one tighter sentence" / "Steelman the opposing hypothesis", plus a free-text input with an "Ask" button)
    - Submitting any prompt → cell flashes with amber animation (`@keyframes td-flash`) and the panel closes
  - **Scenarios** — Bull / Base / Bear (same as Build Thesis Phase 3), Re-weight CTA in the section header
  - **Expert Panel** — full reconstruction of the Phase 4 content, including synthesis + 5 voice cards + reconciliation, plus a "Re-run panel" CTA in the section header
- **Ask AI dock** (bottom-right) — context: "about this thesis". Starter questions include "Has anything changed in the last 14 days that would push this to Actionable?", "What's the strongest argument against this thesis right now?", "Walk me through Marks's staged-entry plan", "What hyperscaler capex prints am I watching?"

---

### 4. Stock Detail (`Stock Detail.html` → route `/stock/:ticker`)

**Purpose:** Detail page for a stock opportunity or position. Example data is for CCJ (Cameco).

**Layout:**
- Sidebar, breadcrumb topbar ("Command Center · CCJ · Position #014"), action group (Share / Export / Re-hunt / Archive).
- **Hero card:**
  - Pretitle: stock-type chip (S, teal) + #id + ticker + sector chip (commodity, gold) + "NYSE · Uranium & nuclear fuel services" + green "Advance to dossier" badge.
  - Title: company name ("Cameco Corporation").
  - Subtitle: thesis statement.
  - Right side: **Position state** pill (Watching → Pilot → Position), current = green Position. Stamp "Opened 04 May · 21d · last refreshed 2h ago".
  - **Meta strip** (6 cells): Conviction with mini bar / Last price (with today's % in green) / 52-week range / Position size / Cost basis / MTD P&L (green +47bp).
- **Sections:**
  1. **Variant view** — single sd-quote card (sunburst left-bar). Thesis statement paragraph + amber mispriced-pill ("Contracting-cycle timing") + variant-perception footnote.
  2. **Transmission path** — sd-quote card with a numbered 4-step list (`<ol class="sd-steps">`). Each step has a circular mono number in an amber pip.
  3. **Evidence chain** — 4-card grid: Your Vault (amber dot), Insider signal (green dot, CEO buy), Analyst consensus (teal dot, 11 Buy median PT $58), Morningstar view (amber dot, 4★ FV $62). Each card has a small color-dotted label, paragraph, and source line.
  4. **Market data** — 4-col × 2-row metrics grid: Last, 52w range, Market cap, Avg volume, Fwd P/E, EV/EBITDA, FCF yield, Short interest. Each cell has uppercase label + mono value + small context line.
  5. **Advisor panel** — sd-verdict card (gradient amber → cream, amber border). 3-col grid: sunburst mark + verdict body (label, italic pull-quote, attribution, "Expand 3 voices →" button) + aux column (Verdicts: 2 Endorse · 1 Caveat, Conviction lift +8, Confidence High). Re-run panel CTA in section header.
  6. **Risks & kill conditions** — 2-col grid of sd-cards. Left = red "Key risks" with `⚠` icons, ranked severity. Right = muted "Kill conditions" with `✕` icons.
  7. **Watch triggers** — full-width sd-card with `→` icons. Each trigger shows the action ("Add 0.8% on WNA Symposium print > $82/lb"), target state, or de-risk threshold.
- **Ask AI dock** — context: "about CCJ". Starter questions: "What changed in the last 7 days?", "Walk me through the $58 upside & $42 downside.", "Strongest argument against, right now?", "Is the contracting cycle still on track?"

---

### 5. Fund Detail (`Fund Detail.html` → route `/fund/:ticker`)

**Purpose:** Detail page for a fund opportunity. Example data is for XLRE (Real Estate Select Sector SPDR).

Same shell as Stock Detail. Differences:

- **Hero** type chip is "F" (purple). Sector chip is "REIT ETF" (purple). Position state pill defaults to "Actionable" (not Position).
- **Meta strip** cells: Conviction / Last NAV / **AUM** / **Expense ratio** / **Liquidity** ("Deep · 4.2M avg vol") / Sizing target.
- **Sections:**
  1. **Regime fit** — sd-quote card with "Why this fund fits today's macro" subtitle. Variant perception paragraph + mispriced-pill ("Supply-cycle inflection") + "Why ETF, not single-name" footnote.
  2. **Transmission path** — numbered list (same pattern as Stock Detail).
  3. **Top holdings** — `sd-holdings` table (4-col grid: rank / ticker+name / weight / weight-bar). 10 rows: PLD 12.4%, AMT 9.8%, EQIX 8.1%, WELL 7.2%, CCI 5.9%, DLR 5.1%, PSA 4.6%, O 3.8%, SPG 3.0%, VICI 2.5%. Each row clickable to that name's Stock Detail (future).
  4. **Cost & liquidity** — 4-col × 2-row metrics grid: Expense ratio (with "vs. category avg" context), AUM, Avg daily volume, Bid-ask spread, Tracking error, Distribution yield, Concentration (amber, "High · top 10 = 62%"), Beta to SPX.
  5. **Advisor panel** — same sd-verdict pattern.
  6. **Risks & kill conditions** — same 2-col layout.
  7. **Watch triggers** — entry/add tranches.
- **Ask AI dock** — context: "about XLRE". Starter questions: "How exposed is the basket to PLD?", "Compare XLRE vs. VNQ vs. IYR.", "Walk me through the 14× → 17× path.", "Cleanest macro print to act on?"

---

### 6. Search Stocks (`Search Stocks.html` → route `/hunt?mode=stocks`)

**Purpose:** Opportunity feed of stocks surfaced by the hunt agent. Vertical list of cards with rank, conviction, suggested-action, evidence highlights. Each card opens Stock Detail.

**Layout:**
- Sidebar (Search Stocks active).
- Topbar: "Search Stocks" + crumb "Opportunity feed · 12 candidates from today's hunt" + "Last hunt" stamp.
- **Toolbar:** search input (`⌘K` shortcut) on the left + filter chips on the right (All sectors / Conviction ≥ 50 / Action: Advance / Thesis type).
- **Hunt context** card: Regime / Focus areas / Avoiding columns + sunburst-styled "Run hunt" CTA.
- **Meta bar:** "Opportunities" eyebrow + counts ("12 shown · 5 advance-ready · 4 watch · 3 pass") + sort pill ("Sort: Conviction ↓").
- **Opportunity list** (single column, 10px gap between cards). Each `sh-opp` card is a 3-col grid (48px rank disc + middle content + 200px right column with conviction):
  - **Rank disc:** if rank 1, a filled sunburst gradient circle with white "1"; otherwise neutral muted-on-surface.
  - **Middle:**
    - Row 1: ticker (mono 15px bold) + company name (13px ink-2 medium) + thesis-type pill (uppercase amber, e.g. "Catalyst" / "Cycle" / "Reflexivity" / "Mispricing") + right-aligned action badge (Advance to dossier = green / Watch = amber / Pass = muted).
    - Row 2: 1-line thesis statement (13px ink-2 pretty).
    - Row 3: **Evidence pills** — 4 small mono pills, each with a colored dot + label (e.g. "CEO buy · $2.1M · 12 May" with green dot, "Morningstar · 4★ · FV $62" with amber dot).
  - **Right column (200px, with left hairline divider):** "CONVICTION" eyebrow + big mono number (22px) colored by score (≥60 green, 45–59 amber, <45 red) + horizontal score bar (5px tall, gradient by tier).
  - Top-ranked card (rank 1) has an amber border tint and a soft amber-to-transparent gradient.
  - Hover: lifts, border becomes amber, an arrow `→` fades in on the right.
  - Click anywhere on card → `Stock Detail.html`.

Run-hunt CTA: shows a temporary `sh-hunting` band with a spinner + label "Hunting opportunities · scanning vault + 2,400 names" + progress bar that animates 0→100% over ~3 seconds, then disappears.

Seven example cards: CCJ (rank 1, 78), PWR (72), VST (68), ALB (54), CEG (52), MTZ (48), NEE (32).

- **Ask AI dock** — context: "hunt for me". Starter questions: "Find 3 non-crowded AI-power names", "Contrarian short that survives +75bp?", "Insider buys + analyst upgrades, 30d", "Re-hunt: quality at 5-yr-low multiples".

---

### 7. Search Funds (`Search Funds.html` → route `/hunt?mode=funds`)

**Purpose:** Same as Search Stocks but for funds. Cards open Fund Detail.

Structure identical. Differences:
- Filter chips: All fund types / Expense ratio ≤ 0.50% / AUM > $500M / Liquidity: Deep.
- Evidence pills emphasize fund-specific signals: ER, AUM, Liquidity, Top holding %.
- Seven example funds: URA (72), XLRE (68), PAVE (64), ITA (52), IBIT (48), KWEB (42), ARKF (28).
- Dock starter questions: "Cheaper alternatives to URA?", "EM ex-China, single-country picks?", "Income ETFs that survive +100bp.", "Re-hunt: low-correlation, < 0.20% ER".

---

### 8. Performance (`Performance.html` → route `/paper`)

**Purpose:** Portfolio performance dashboard. Headline metrics, cumulative return chart, active positions table, recently closed list, pipeline conversion funnel.

**Layout:**
- Sidebar (Performance active), topbar: "Performance" + "12-month rolling · paired vs. SPX · net of est. fees" + marked-as stamp.
- **Headline summary** (6-cell grid, rounded 14px, with a vertical gradient left-bar going from sun-2 → pos): YTD return (big green) / Alpha / Sharpe (1y) / Max drawdown (red) / Hit rate (closed) / Avg holding. Each cell: uppercase label + 22px mono value + small context line.
- **Return chart card:**
  - Header: "Cumulative return" + subtitle + right-aligned period segmented control (1M / 3M / 6M / YTD / **1Y** / 3Y / All; 1Y active).
  - SVG chart (920×260, responsive): horizontal grid lines at 0/5/10/15%, y-axis labels (mono), x-axis month labels (Jun→May), dotted teal SPX bench line, solid amber Dossier line with an amber-fade fill under it. Reference values: Dossier ends at +14.3%, SPX at +8.2%.
  - Legend: mono labels with colored dashes.
- **Active positions / Recently closed** (1.4 : 1 grid):
  - Left card "Active positions" — table-style rows. Columns: type chip / position name (ticker + 1-line desc) / size (right) / P&L since open (right, colored) / stage pill / age. Rows clickable (cursor: pointer, hover bg surface). 5 example rows: CCJ +11.8% Live, PWR/VST/CEG +8.2% Live, XLRE +3.4% Actionable, ALB/SQM -1.2% Developing, MTZ +2.1% Live.
  - Right card "Recently closed" — last 90 days. 6 rows, each: ticker + description ("Trimmed on +18% rally · closed 21 May") + colored P&L (+62bp / -41bp / etc.).
- **Pipeline conversion funnel:**
  - 4-cell grid: Developing / Actionable / Live / Killed. Each cell colored by stage (subtle tint + matching border). 22px mono big number + context line.
  - Below: a mono rate-row showing key conversion stats separated by `·`: "Dev → Live: 37% · Avg conviction at Live: 72 · Avg time-to-Live: 18d · Win rate: 68% · Avg winner: +86bp · Avg loser: -34bp".
- Position rows + the funnel both navigate to the relevant detail screens.
- **Ask AI dock** — context: "about performance". Starter questions: "Decompose YTD alpha by sector.", "Which kills should I have held?", "Where's the conversion leak?", "Sizing vs. selection attribution?"

---

### 9. Compare (`Compare.html` → route `/compare`)

**Purpose:** Side-by-side comparison of two theses (or stocks). Highlights similarities and differences row-by-row across the 13 canvas categories.

**Layout:**
- Sidebar (Compare active, count chip "2").
- Topbar: "Compare" + "Side-by-side · 2 theses · highlights differences and overlaps" + Export / Save view actions.
- **Slot picker** (3-col grid: 240px label + 2 thesis slots):
  - Left: "Comparing" eyebrow + "Two active theses" title + small mono "cells colored by similarity" hint.
  - Each slot: small "A" / "B" mono badge in a pill + ticker (mono bold) + thesis title (truncated) + action buttons (↗ open, ⇄ swap, × remove).
  - Empty slot variant: dashed border, diagonal-stripe background, "+ Add to compare" label.
- **Summary row** (3-col, same widths): "Headline metrics" label + 4-cell mini metric card per thesis (Conviction / Sizing / Horizon / Expected return).
- **Comparison table:** 14 rows (header + 13 categories). Each row is a 3-col grid (240px label + 2 thesis cells with hairline dividers).
  - **Header row:** "Overview" label cell. Each thesis cell shows full hero: ticker (mono bold), id, stage badge (Developing/Actionable/Live colored), bold thesis title (16px), 1-line snippet.
  - **Category rows (01–13):** Label cell shows mono index + uppercase title + optional muted hint. Each cell shows the thesis's content for that category.
  - **Cell similarity backgrounds:** `.cp-cell.same` = green tint + green left-border (e.g. when both Macro fit cells align); `.cp-cell.diff` = amber tint + amber left-border (e.g. when horizons differ); `.cp-cell.opposed` = red tint + red left-border (e.g. when risk profiles oppose).
  - Cells with a `.cp-flag` show a small mono uppercase tag at the top ("Different drivers", "B is 6mo longer", "Both late-cycle real-asset") so the analyst can scan the diff structure at a glance.

Example data uses thesis #024 (AI power buildout, PWR · VST · CEG) vs. thesis #023 (Lithium oversupply reversal, ALB · SQM). Diff/same/opposed flags are pre-set based on a manual reading of the two theses.

- **Ask AI dock** — context: "about this comparison". Starter questions: "Which one has cleaner asymmetry?", "Which to size up by 1%?", "Pair them into one multi-leg book?", "Which is more rate-sensitive?"

---

## Cross-Cutting Interactions

### Navigation routing summary

| Source                                 | Target                          | Trigger                       |
|----------------------------------------|----------------------------------|--------------------------------|
| Desk card (`.type-thesis`)             | `Thesis Detail.html`            | Click anywhere on card         |
| Desk card (`.type-stock`)              | `Stock Detail.html`             | Click anywhere on card         |
| Desk card (`.type-fund`)               | `Fund Detail.html`              | Click anywhere on card         |
| Build Thesis Promote CTA               | `Desk.html?promoted=1`          | Click "Promote to Developing →" |
| Search Stocks opportunity card         | `Stock Detail.html`             | Click card                     |
| Search Funds opportunity card          | `Fund Detail.html`              | Click card                     |
| Performance active-position row        | matching detail screen          | Click row                      |
| Compare slot ↗ button                  | matching detail screen          | Click ↗                        |
| Thesis Detail topbar "Open in Builder" | `Build Thesis.html`             | Click button                   |

### Promote handoff (Build Thesis → Desk)

1. `Promote to Developing →` button saves `{ticker, title, snippet, sector, sectorLabel, conviction, catalyst, catalystDate, age, id}` to `sessionStorage["dossier:justPromoted"]`.
2. Navigates to `Desk.html?promoted=1`.
3. Desk reads the param, parses the sessionStorage payload, prepends a new card to `.col.dv .body` with `.just-promoted` class.
4. Increments the Developing count chip in the column header and the sidebar pipeline group.
5. Shows the centered toast (`#promoToast.on`) for 7 seconds, with "Open →" link to Thesis Detail and a × dismiss.
6. Cleans the URL: `history.replaceState`.
7. The new card has a 0.55s entrance animation (`@keyframes newCardIn`) that fades in, lifts up, and pulses an amber glow.

In the React app, this can be replaced with a Zustand-store-based handoff: `useThesisStore.getState().promoteToDeveloping(thesis)` adds it, sets a `justPromoted` flag, the Desk component reads the flag and shows the toast on mount. URL params not required.

### Hover and active states

All interactive elements use a consistent vocabulary:
- **Hover** on cards: lift 1px, border darkens to `--hairline-2`, shadow grows (see Shadows above).
- **Hover** on accent-able elements (CTAs, conviction-themed buttons, opportunity cards): border becomes amber `rgba(244,146,44,.40)` and gets a soft amber gradient tint.
- **Active / on** pill segments (lifecycle, period control, filter chips): rounded 99px, surface bg with a hairline shadow, colored text.
- **Cards never use `:active` shadow inset** — just border-color shift; the design avoids the "pushed down" pattern.

### Lifecycle pill (Developing / Actionable / Live)

A pattern reused on Thesis Detail (and adapted to Stock Detail's Position state, Fund Detail's Fund state). 3 segments + 2 thin connector lines, in a rounded 99px container with a 3px padding. Active segment gets a white background + stage-color text. Pip is a 7px dot inside the segment.

Behavior: click any segment to transition to that stage. In production, this should dispatch a `useThesisStore` action that updates the thesis.stage value, persists, and may trigger downstream effects (e.g. card animation on Desk).

### Ask AI dock — universal pattern

- Collapsed by default; click header to expand.
- Header always has the sunburst sigil, "Ask AI", context-specific meta ("about this thesis" / "hunt for me" / "find me a fund" / etc.), and a ▾ toggle.
- Body: empty state with starter Q&A button list; or message history (user messages get a card background and inverted layout, AI messages get the sunburst-avatar gradient bubble).
- Foot: text input + Send button (sunburst-gradient pill).
- Click any starter Q → expands the dock + auto-sends that question.
- Simulated responses are screen-specific (see the JS in each HTML file's `dockRespond` for the canned reply library).
- In production, replace `dockRespond` with a streaming call to the existing OpenAI / Anthropic API (the repo has `src/api/openai.ts`).

---

## State Management

Existing Zustand stores to reuse:

- `useThesisStore` (`src/store/thesisStore.ts`) — list of theses keyed by id, each with stage / ticker / canvas / scenarios / experts / conviction. Add fields: `promotedAt`, `lastEditedAt`, `panelLastRun`.
- `useHuntStore` (`src/store/huntStore.ts`) — already covers stocks vs funds opportunity feeds. Re-use for Search Stocks / Search Funds.
- `usePortfolioStore` (`src/store/portfolioStore.ts`) — positions + P&L. Power the Performance dashboard's Active positions table and Recently closed.
- `useMacroStore` (`src/store/macroStore.ts`) — regime label for Hunt context, Performance benchmark line, Compare macro-fit row.

New state to add:

- `compareStore` — list of 2-3 thesis ids currently being compared. `slot[A], slot[B]`. Actions: setSlot, swap, clear.
- Thesis canvas cell edits: each thesis canvas should be a `Record<CanvasCategory, string>`; the cell-level editor mutates this directly. The "Ask AI" cell flow can call the existing API and replace the cell value.

---

## Files Reference

### HTML prototypes (in `screens/`)

| File                       | Bytes      | Purpose                                       |
|----------------------------|------------|------------------------------------------------|
| `Desk.html`                | ~120 KB    | Command Center / Desk landing                  |
| `Build Thesis.html`        | ~110 KB    | 5-phase thesis wizard                          |
| `Thesis Detail.html`       | ~115 KB    | Full thesis detail with editable canvas        |
| `Stock Detail.html`        | ~115 KB    | Stock detail with evidence chain + market data |
| `Fund Detail.html`         | ~115 KB    | Fund detail with holdings + cost & liquidity   |
| `Search Stocks.html`       | ~115 KB    | Stocks opportunity feed                        |
| `Search Funds.html`        | ~115 KB    | Funds opportunity feed                         |
| `Performance.html`         | ~120 KB    | Portfolio performance dashboard                |
| `Compare.html`             | ~120 KB    | Side-by-side thesis comparison                 |
| `tweaks-panel.jsx`         | ~5 KB      | Design-time tweaks panel (reference only — do not ship) |

### Conventions used in the HTML

- CSS variables under `:root` define all design tokens — colors, type, radii, font stacks.
- BEM-ish class naming: `bt-` prefix for Build-Thesis-specific, `td-` for top-level detail-shell, `sd-` for stock/fund-detail-specific, `sh-` for search/hunt-feed-specific, `cp-` for compare, `pf-` for performance. Where a pattern is reused across screens (e.g. `.bt-cell` for canvas cells), the same class is reused.
- JS is all vanilla JS in a single IIFE at the bottom of each file. The Tweaks panel uses React + Babel-standalone — the React parts are dev-only.
- The shared `tweaks-panel.jsx` exposes `TweaksPanel`, `useTweaks`, `TweakSection`, `TweakColor`, `TweakRadio`, `TweakToggle`, etc. — not needed in production.

### How to view

Open any `.html` file directly in a browser. They're fully self-contained (only external dependencies are Google Fonts for Hanken Grotesk + Geist Mono, and the dev-only React/Babel CDN scripts for the Tweaks panel). All assets are inline.

The sidebar links work — you can navigate between all 9 screens by clicking the nav items.

---

## What's not included / TBD

- **Real data wiring.** All numbers, names, and dates are realistic but hard-coded. Wire to existing Zustand stores in implementation.
- **Authentication.** Not designed. Inherit from the existing repo.
- **Mobile responsive layout.** Designs are desktop-only (`min-width: 1180px`). The existing app is also desktop-only; future mobile work is out of scope.
- **Internationalization.** All copy is English; no i18n wrapping in the prototypes.
- **Empty states.** Most screens assume populated data. Empty-state designs are TBD — when implementing, replicate the "Open slot / Capacity" dashed-border placeholder pattern from Desk for empty columns.
- **Loading states.** Only Search Stocks/Funds has a "hunting" spinner band. Other screens should adopt a similar pattern when fetching async data.
- **Print / export styles.** The `Export` buttons in topbars don't do anything in the prototype. Reuse existing export logic from the codebase.

---

## Implementation Order (suggested)

1. **Tokens + shell** — add the new color tokens to `tailwind.config.js`, build the new `<Sidebar>` and `<Topbar>` components, build the `<AskAIDock>` component, build the `<Sunburst>` sigil.
2. **Command Center** — reskin `InvestmentDesk.tsx` with the new card / column patterns. Wire card clicks to detail routes.
3. **Build Thesis** — rebuild `BrainstormingScreen.tsx` as the 5-phase wizard. Promote action → store action + route to Desk.
4. **Thesis Detail** — rebuild `ThesisScreen.tsx` with the editable canvas, lifecycle pill, scenarios, expert panel.
5. **Stock / Fund Detail** — new routes + components, wired to opportunity store and Finnhub data.
6. **Search Stocks / Search Funds** — re-skin `HuntScreen.tsx` with the new opportunity-card pattern.
7. **Performance** — replace `PaperTrackerScreen.tsx` with the new dashboard.
8. **Compare** — replace `ComparisonScreen.tsx` with the slot picker + 13-row diff table.

Each step ships independently. The HTML prototypes are the visual contract for each screen.
