---
name: Editorial Brutalist Dossier
colors:
  surface: '#141312'
  surface-dim: '#141312'
  surface-bright: '#3b3937'
  surface-container-lowest: '#0f0e0d'
  surface-container-low: '#1d1b1a'
  surface-container: '#211f1e'
  surface-container-high: '#2b2a28'
  surface-container-highest: '#363433'
  on-surface: '#e6e1df'
  on-surface-variant: '#e5bdb7'
  inverse-surface: '#e6e1df'
  inverse-on-surface: '#32302f'
  outline: '#ac8883'
  outline-variant: '#5c403b'
  surface-tint: '#ffb4a8'
  primary: '#ffb4a8'
  on-primary: '#690000'
  primary-container: '#ff5541'
  on-primary-container: '#5c0000'
  inverse-primary: '#bc160c'
  secondary: '#cac6bd'
  on-secondary: '#32302a'
  secondary-container: '#4b4942'
  on-secondary-container: '#bcb8af'
  tertiary: '#c0ce71'
  on-tertiary: '#2d3400'
  tertiary-container: '#8b9841'
  on-tertiary-container: '#262d00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad4'
  primary-fixed-dim: '#ffb4a8'
  on-primary-fixed: '#410000'
  on-primary-fixed-variant: '#930000'
  secondary-fixed: '#e7e2d8'
  secondary-fixed-dim: '#cac6bd'
  on-secondary-fixed: '#1d1c16'
  on-secondary-fixed-variant: '#494740'
  tertiary-fixed: '#dceb8a'
  tertiary-fixed-dim: '#c0ce71'
  on-tertiary-fixed: '#191e00'
  on-tertiary-fixed-variant: '#424b00'
  background: '#141312'
  on-background: '#e6e1df'
  surface-variant: '#363433'
typography:
  display-xl:
    fontFamily: Space Grotesk
    fontSize: 80px
    fontWeight: '700'
    lineHeight: 80px
    letterSpacing: -0.04em
  display-xl-mobile:
    fontFamily: Space Grotesk
    fontSize: 44px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.03em
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 58px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 22px
    letterSpacing: 0em
  body-lg:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: DM Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-mono-lg:
    fontFamily: Space Mono
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 18px
    letterSpacing: 0.05em
  label-mono-md:
    fontFamily: Space Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.06em
  label-mono-sm:
    fontFamily: Space Mono
    fontSize: 10px
    fontWeight: '400'
    lineHeight: 12px
    letterSpacing: 0.08em
spacing:
  gutter: 0px
  gutter-desktop: 0px
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system synthesizes Swiss International Typographic Style, technical dossiers, and architectural neo-brutalism. It treats the interface as a physical manifest or printed operational broadsheet: unapologetic, highly structured, and governed by strict discipline. The aesthetic avoids contemporary SaaS homogenization—rejecting decorative blurs, floating drop shadows, gradient fills, and organic curves. 

The interface serves high-agency individuals tracking disciplined personal evolution. It communicates rigor, finality, and precision. Every interaction reinforces intentionality through monolithic structural blocks, structural hairline rules, modular grids, stark monochrome value shifts, and disciplined flashes of signal red. The branding anchors on the bold "KAIZEN" wordmark supported by the sub-caption "改善" (continuous improvement). Every major surface treats data as editorial content, turning daily routines and milestones into documented case files.

## Colors

The palette operates under absolute high-contrast restraint. There are no gradients, color washes, or semi-transparent alpha overlays.

- **Primary Canvas & Dark Panels (`#121110`):** An uncompromising off-black foundation that anchors data density.
- **Secondary Canvas & High-Contrast Fill (`#F5F0E6`):** Warm cream / off-white used for full-width inverted panels, crisp textual contrast, badge fills, and poster-scale typography.
- **Primary Accent (`#E63827`):** Signal Red. Reserved strictly for imperative actions, live operational states, critical XP highlights, interactive hover/active fills, and canonical numbered section markers (`.01`, `.02`).
- **Status & Progression Accent (`#8C9942`):** Flat Olive/Ochre. Represents completed objectives, verified streaks, positive margins, and fulfilled habits. Supporting deep tone: `#7A8A3A`.
- **Structural Dividers & Rules:** Hairline boundaries rely on `#242220` against dark surfaces, and `#D8D2C4` or pure `#121110` against cream surfaces. Boundaries are structural lines, never decorative ornaments.

## Typography

The typographic hierarchy is split into three disciplined engines:

1. **Display & Headlines (`Space Grotesk`):** Tight, geometric, high-impact sans-serif. Used for section titles, broadsheet headers, and poster-scale numbers. Characterized by aggressive negative tracking (`-0.02em` to `-0.04em`) and compact line heights that treat text as physical architectural blocks.
2. **Body Copy (`DM Sans`):** Clean, neutral, highly legible grotesque sans-serif that balances the raw density of display titles. Used for narrative descriptions, directives, and user logs.
3. **Operational Mono (`Space Mono`):** Fixed-width mechanical type applied strictly to metadata, timestamps, system outputs, XP increments, status coordinates, and the standardized section prefix taxonomy.

### Section Taxonomy Convention
All top-level views and primary module headers must be indexed with monospaced period-prefixed numbers:
- `.01 TODAY`
- `.02 QUESTS`
- `.03 HABITS`
- `.04 PROGRESS`
- `.05 PROFILE`

Prefixes are styled in `Space Mono` using Signal Red (`#E63827`), while section titles follow in `Space Grotesk` uppercase.

## Layout & Spacing

The layout model is governed by the Swiss Grid Poster structure: contiguous, abutting modular compartments.

- **Zero-Gutter Abutment:** Standard fluid and multi-column grid layouts do not use air gaps between cards. Gutters evaluate to `0px`. Adjacent cells share structural `1px` or `2px` hairline boundaries to maintain a monolithic, unified ledger facade.
- **Exterior Boundaries:** The entire canvas is framed by rigid margins (`1rem` on mobile, `1.5rem` on tablet, `2rem` on desktop) enclosed inside a stark border running the perimeter of the viewport.
- **Internal Padding:** Rhythmic, dense, and mathematically consistent. Modules employ `space-md` (`1rem`) to `space-lg` (`1.5rem`) internal cell padding. Compact utility components rely on `space-xs` and `space-sm`.
- **Responsive Adaptations:**
  - **Desktop (12 Columns):** Multi-pane dossier view. High data density, adjacent operational tables, side-by-side metric tiles.
  - **Tablet (6 Columns):** Dual-column stacking, maintaining zero-gap hairline dividers between horizontal and vertical pairings.
  - **Mobile (Single Column):** Pure vertical dossier stack. Elements share top and bottom rules, operating as a continuous register tape.

## Elevation & Depth

This system operates strictly on a zero-depth, flat architectural plane. Depth is communicated solely through graphic confrontation, tonal zoning, and border density:

- **No Drop Shadows or Glows:** `box-shadow`, `filter: drop-shadow`, and `text-shadow` are prohibited in all contexts.
- **No Gradients or Blurs:** Translucent backdrops, glassmorphism, and color ramping are disallowed.
- **Structural Hairlines & Contrast Inversion:** Depth is communicated strictly by swapping contrasting ground planes. A dark module (`#121110`) sits flush against an inverted cream module (`#F5F0E6`). Focus or interactive states are denoted by pure solid flood fills of Signal Red (`#E63827`) or complete monochrome inversion.
- **Border Weight as Hierarchy:** Primary structural boundaries use `2px` solid rules. Secondary internal divisions and metric partitions use `1px` hairline rules.

## Shapes

The geometric rule of this design system is absolute: `border-radius: 0px` across every element without exception. 

No rounded cards, no softened tags, no pill buttons, and no circular avatars. User avatars, indicators, action buttons, progress meters, and modal dialogs are rendered as clean-edge rectangles. Visual interest stems purely from asymmetrical rectangular ratios, bold typographic balance, and hard geometric corner cutouts (e.g., 45-degree chamfers rendered strictly via clip-path when marking mechanical state changes).

## Components

### Buttons & Triggers
- **Primary Action:** Solid `#E63827` background, pure `#F5F0E6` uppercase `Space Mono` typography, 0px border radius, `12px 24px` padding. On hover: inverts instantly to `#121110` text on `#F5F0E6` background with no transition easing.
- **Secondary Action:** Transparent background with an internal or inline `1px` solid border (`#F5F0E6` or `#121110` depending on container), monospaced text. On hover: solid fill of the foreground color with text reversed.
- **Destructive/Critical:** Outlined in `#E63827`, text in `#E63827`. On hover: solid fill `#E63827` with `#121110` text.

### Modular Dossier Cards
- Constructed with abutting boundaries (`1px` border in `#242220` on dark canvas, `#D8D2C4` on cream canvas).
- Each card features an integrated top header strip containing a monospaced tracking label (e.g., `// LOG_ID: 8820`) aligned left, and an operational status indicator (`[ ACTIVE ]` or `[ COMPLETED ]`) aligned right.
- No drop shadows; cards occupy absolute structural coordinates in the grid.

### Chips, Badges & Section Markers
- Flat rectangular blocks. Height fixed to `24px` or `28px`.
- Monospaced typography (`label-mono-sm` or `label-mono-md`).
- Positive status chips: Solid `#8C9942` fill with `#121110` text.
- Accent/XP badges: Solid `#E63827` fill with `#F5F0E6` text, prefixing numerical values with `+` (e.g., `+500 XP`).

### Inputs & Form Fields
- Strict rectangular boxes with a `1px` solid border.
- Background: pure `#121110` (or pure `#F5F0E6` when nested inside inverted modules).
- Placeholder text styled in muted monospaced font with high contrast ratio.
- Focused state: immediate shift to `2px` solid `#E63827` outline. No outer glow or transition animation.

### Checkboxes & Progress Habits
- Checkboxes are `18x18px` sharp squares with a `1.5px` border.
- Unchecked: Empty square.
- Checked: Completely filled with `#8C9942` or marked with a solid centered square block (no rounded checkmark icon).
- Progress Trackers: Segmented visual blocks rather than continuous fluid bars. A 10-step habit progress bar renders as 10 distinct abutting rectangular segments separated by hairline borders.

### Dossier Data Tables & Lists
- Table rows separated by `1px` solid horizontal rules.
- Headers are styled in `label-mono-sm`, all caps, tracking at `0.08em`.
- Alternating rows do not use subtle zebra stripes; hover states trigger an immediate full-width background color inversion.