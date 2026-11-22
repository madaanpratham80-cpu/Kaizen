# Design

## Context

Tailwind v4 already owns the web theme in `apps/web/src/app/globals.css`. The root App Router layout currently imports that file and has no font loader. Existing progression and health tokens serve the shipped screens and stay in place during this change.

Under `"Kaizen/UI, v4"`, each verified `code.html` supplies values and markup, and its `screen.png` is the visual authority when they differ. The [inventory](proposal.md#inventory) identifies both files for each screen. The table sources “Login” and “404” below mean `"UI, v4/kaizen login/code.html"` and `"UI, v4/kaizen 404/code.html"`. The other five shared exports define the same shared tokens. Screen-use entries report references in export markup, including variant classes. They are not claims about the current app. An unreferenced token remains part of its agreed palette.

## Goals / Non-Goals

**Goals:** Ship reusable tokens and locally served font assets, preserve the 404's cooler accents, and keep the existing screens available as a stable baseline.

**Non-goals:** Screen and shell restyles, icon adoption, route and API wiring, and the product features listed in the [deferred scope](proposal.md#deferred-scope).

## Decisions

### Shared colours

Use the original Login semantic names under Tailwind's `--color-*` namespace. Add these alongside the existing app tokens.

| Token                                | Value     | Source file       | Screens using the named colour                           |
| ------------------------------------ | --------- | ----------------- | -------------------------------------------------------- |
| `--color-background`                 | `#141312` | Login `code.html` | Progress, Profile, 404                                   |
| `--color-error`                      | `#ffb4ab` | Login `code.html` | Today, Quests, Profile                                   |
| `--color-error-container`            | `#93000a` | Login `code.html` | Today                                                    |
| `--color-inverse-on-surface`         | `#32302f` | Login `code.html` | Progress, Profile                                        |
| `--color-inverse-primary`            | `#bc160c` | Login `code.html` | Profile                                                  |
| `--color-inverse-surface`            | `#e6e1df` | Login `code.html` | Progress, Profile                                        |
| `--color-on-background`              | `#e6e1df` | Login `code.html` | Defined by export, with no named utility reference found |
| `--color-on-error`                   | `#690005` | Login `code.html` | Today                                                    |
| `--color-on-error-container`         | `#ffdad6` | Login `code.html` | Defined by export, with no named utility reference found |
| `--color-on-primary`                 | `#690000` | Login `code.html` | Today, Quests, Habits, Progress, Profile                 |
| `--color-on-primary-container`       | `#5c0000` | Login `code.html` | Today, Quests, Habits, Progress, Profile, Login          |
| `--color-on-primary-fixed`           | `#410000` | Login `code.html` | Defined by export, with no named utility reference found |
| `--color-on-primary-fixed-variant`   | `#930000` | Login `code.html` | Habits                                                   |
| `--color-on-secondary`               | `#32302a` | Login `code.html` | Profile                                                  |
| `--color-on-secondary-container`     | `#bcb8af` | Login `code.html` | Today                                                    |
| `--color-on-secondary-fixed`         | `#1d1c16` | Login `code.html` | Today, Quests, Habits                                    |
| `--color-on-secondary-fixed-variant` | `#494740` | Login `code.html` | Today, Quests, Habits                                    |
| `--color-on-surface`                 | `#e6e1df` | Login `code.html` | Today, Quests, Habits, Progress, Profile, Login, 404     |
| `--color-on-surface-variant`         | `#e5bdb7` | Login `code.html` | Today, Quests, Habits, Progress, Profile, Login          |
| `--color-on-tertiary`                | `#2d3400` | Login `code.html` | Today, Profile                                           |
| `--color-on-tertiary-container`      | `#262d00` | Login `code.html` | Today, Quests, Habits, Progress, Profile                 |
| `--color-on-tertiary-fixed`          | `#191e00` | Login `code.html` | Defined by export, with no named utility reference found |
| `--color-on-tertiary-fixed-variant`  | `#424b00` | Login `code.html` | Defined by export, with no named utility reference found |
| `--color-outline`                    | `#ac8883` | Login `code.html` | Today, Quests, Habits, Progress, Profile                 |
| `--color-outline-variant`            | `#5c403b` | Login `code.html` | Today, Progress, Profile, Login                          |
| `--color-primary`                    | `#ffb4a8` | Login `code.html` | Today, Quests, Habits, Progress, Profile                 |
| `--color-primary-container`          | `#ff5541` | Login `code.html` | Today, Quests, Habits, Progress, Profile, Login, 404     |
| `--color-primary-fixed`              | `#ffdad4` | Login `code.html` | Quests, Habits                                           |
| `--color-primary-fixed-dim`          | `#ffb4a8` | Login `code.html` | Profile                                                  |
| `--color-secondary`                  | `#cac6bd` | Login `code.html` | Today, Progress, Profile, Login                          |
| `--color-secondary-container`        | `#4b4942` | Login `code.html` | Today, Habits, Profile                                   |
| `--color-secondary-fixed`            | `#e7e2d8` | Login `code.html` | Today, Quests, Habits                                    |
| `--color-secondary-fixed-dim`        | `#cac6bd` | Login `code.html` | Defined by export, with no named utility reference found |
| `--color-surface`                    | `#141312` | Login `code.html` | Today, Quests, Habits, Progress, Login                   |
| `--color-surface-bright`             | `#3b3937` | Login `code.html` | Login                                                    |
| `--color-surface-container`          | `#211f1e` | Login `code.html` | Today, Habits, Progress, Profile                         |
| `--color-surface-container-high`     | `#2b2a28` | Login `code.html` | Today, Quests, Habits, Progress, Profile                 |
| `--color-surface-container-highest`  | `#363433` | Login `code.html` | Today, Quests, Habits, Progress, Profile                 |
| `--color-surface-container-low`      | `#1d1b1a` | Login `code.html` | Today, Quests, Habits, Progress, Profile, Login, 404     |
| `--color-surface-container-lowest`   | `#0f0e0d` | Login `code.html` | Today, Quests, Habits, Progress, Profile, Login          |
| `--color-surface-dim`                | `#141312` | Login `code.html` | Today, Profile                                           |
| `--color-surface-tint`               | `#ffb4a8` | Login `code.html` | Defined by export, with no named utility reference found |
| `--color-surface-variant`            | `#363433` | Login `code.html` | Habits, Progress                                         |
| `--color-tertiary`                   | `#c0ce71` | Login `code.html` | Today, Quests, Habits, Progress, Profile, Login, 404     |
| `--color-tertiary-container`         | `#8b9841` | Login `code.html` | Today, Quests, Habits, Progress, Profile                 |
| `--color-tertiary-fixed`             | `#dceb8a` | Login `code.html` | Defined by export, with no named utility reference found |
| `--color-tertiary-fixed-dim`         | `#c0ce71` | Login `code.html` | Defined by export, with no named utility reference found |

### 404 colours

Use `@theme inline` to register the five utility names and point them to private backing variables such as `--kaizen-404-border-subtle`. Declare the actual backing values only beneath a dedicated `.kaizen-404-theme` selector. A future 404 restyle will attach that selector to the page. This keeps the approved values out of the base cascade and allows the utility to resolve the backing value at the element where it is used. Shared colours keep their own values both inside and outside this scope.

| Token                                | Scoped value | 404 `code.html` source name | Screen |
| ------------------------------------ | ------------ | --------------------------- | ------ |
| `--color-404-surface-container`      | `#242321`    | `surface-container`         | 404    |
| `--color-404-surface-container-high` | `#2f2e2b`    | `surface-container-high`    | 404    |
| `--color-404-border-subtle`          | `#2a2826`    | `border-subtle`             | 404    |
| `--color-404-border-strong`          | `#3d3a36`    | `border-strong`             | 404    |
| `--color-muted`                      | `#8a8580`    | `text-muted`                | 404    |

The 404 reuses the following existing shared tokens.

| 404 name in `"UI, v4/kaizen 404/code.html"` | Shared token                    | Value     | Screen |
| ------------------------------------------- | ------------------------------- | --------- | ------ |
| `accent-red`                                | `--color-primary-container`     | `#ff5541` | 404    |
| `text-primary`                              | `--color-on-surface`            | `#e6e1df` | 404    |
| `accent-lime`                               | `--color-tertiary`              | `#c0ce71` | 404    |
| `paper-cream`                               | `--color-secondary`             | `#cac6bd` | 404    |
| `on-accent-red`                             | `--color-primary`               | `#ffb4a8` | 404    |
| `surface-base`                              | `--color-background`            | `#141312` | 404    |
| `surface-container-low`                     | `--color-surface-container-low` | `#1d1b1a` | 404    |

### Typography

Load normal variants with the Next.js `variable` option. Attach only the font variable classes at the web root. Use `@theme inline` for the family aliases so the utility resolves the loader's variable where it is used. Leave existing body styles and existing font utilities in place. The three load sets include supported markup weights in addition to the weights set by the scale.

| Family        | `next/font/google` loader | Loaded weights     | Weights requested in export markup | Applied heavy weight |
| ------------- | ------------------------- | ------------------ | ---------------------------------- | -------------------- |
| Space Grotesk | `Space_Grotesk`           | 300, 400, 600, 700 | 300, 400, 600, 700, 900            | 700                  |
| DM Sans       | `DM_Sans`                 | 400, 500, 700      | 400, 500, 700                      | 700                  |
| Space Mono    | `Space_Mono`              | 400, 700           | 400, 700, 900                      | 700                  |

Keep Space Grotesk 300 for Profile's light `改善` treatment and 600 for 404's semibold `改善` label. Other supported classes retain their requested weights. The 900 → 700 decision applies to the verified Progress and Profile elements in their later restyles. It preserves the visual hierarchy in those PNGs.

| Screen and source    | Family        | Elements                                                                                         | Requested |  Applied | Reason and evidence                                                                                                                                                                              |
| -------------------- | ------------- | ------------------------------------------------------------------------------------------------ | --------: | -------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Progress `code.html` | Space Grotesk | Wordmark, page title, headline metrics, annual submission count, Hundred Gates title             |       900 |      700 | At matched glyph height, the rendered title and lifetime XP sample retained the PNG's strong hierarchy.                                                                                          |
| Progress `code.html` | Space Mono    | Seal XP label                                                                                    |       900 |      700 | The reference label remained distinct at 700. The sample was narrower, so its spacing still needs checking during the screen restyle.                                                            |
| Profile `code.html`  | Space Grotesk | Wordmark, page title, headline metrics                                                           |       900 |      700 | The title and lifetime XP retained the PNG hierarchy. The XP sample was slightly narrower.                                                                                                       |
| Profile `code.html`  | Space Mono    | Health and seal status labels                                                                    |       900 |      700 | The 700 health-label sample kept the visual emphasis from the PNG.                                                                                                                               |
| Quests `code.html`   | Space Grotesk | `.02 QUESTS` page title and `+450` Total Yield number (the nested `XP` has its own type styling) |       900 | Pending | The PNG has serif display lettering. [Quests display type](#quests-display-type) records the platform-dependent 700 comparison and the requirement to select a self-hosted serif before the restyle. |

The three named family weight tokens provide the supported heavy weight. Progress and Profile will select those values when restyled. The token pass leaves Tailwind's built-in `font-black` alone and introduces no screen-level weight overrides.

| Token                   | Value | Source                                                                   | Intended screens |
| ----------------------- | ----: | ------------------------------------------------------------------------ | ---------------- |
| `--font-weight-sans`    |   700 | Approved weight mapping based on the Login type family and export markup | Shared and 404   |
| `--font-weight-grotesk` |   700 | Approved PNG comparison                                                  | Shared and 404   |
| `--font-weight-mono`    |   700 | Approved PNG comparison                                                  | Shared and 404   |

The `--text-*` token owns size and the companion suffixes `--line-height`, `--letter-spacing`, and `--font-weight`. Use the matching `--font-*` name to resolve the family. Units and values below are preserved exactly.

| Type token                 | Family        | Size / line height | Tracking  | Weight | Source file       | Screens using the type or family name                    |
| -------------------------- | ------------- | ------------------ | --------- | -----: | ----------------- | -------------------------------------------------------- |
| `--text-display-xl`        | Space Grotesk | `80px` / `80px`    | `-0.04em` |    700 | Login `code.html` | Today, Quests, Habits, Profile                           |
| `--text-body-md`           | DM Sans       | `14px` / `20px`    | `0em`     |    400 | Login `code.html` | Today, Quests, Habits, Progress, Profile, Login          |
| `--text-label-mono-lg`     | Space Mono    | `14px` / `18px`    | `0.05em`  |    700 | Login `code.html` | Today, Habits, Progress, Profile, Login                  |
| `--text-headline-sm`       | Space Grotesk | `18px` / `22px`    | `0em`     |    700 | Login `code.html` | Today, Quests, Habits, Progress, Profile                 |
| `--text-display-xl-mobile` | Space Grotesk | `44px` / `44px`    | `-0.03em` |    700 | Login `code.html` | Defined by export, with no named utility reference found |
| `--text-body-lg`           | DM Sans       | `16px` / `24px`    | `0em`     |    400 | Login `code.html` | Quests                                                   |
| `--text-label-mono-sm`     | Space Mono    | `10px` / `12px`    | `0.08em`  |    400 | Login `code.html` | Today, Quests, Habits, Progress, Profile, Login          |
| `--text-headline-md`       | Space Grotesk | `24px` / `28px`    | `-0.01em` |    700 | Login `code.html` | Quests, Habits, Progress, Profile, Login                 |
| `--text-label-mono-md`     | Space Mono    | `12px` / `16px`    | `0.06em`  |    400 | Login `code.html` | Today, Quests, Habits, Progress, Profile, Login          |
| `--text-display-lg`        | Space Grotesk | `56px` / `58px`    | `-0.03em` |    700 | Login `code.html` | Today, Quests, Habits, Progress, Profile                 |
| `--text-body-sm`           | DM Sans       | `12px` / `16px`    | `0.01em`  |    400 | Login `code.html` | Today, Progress                                          |
| `--text-display-lg-mobile` | Space Grotesk | `36px` / `38px`    | `-0.02em` |    700 | Login `code.html` | Defined by export, with no named utility reference found |
| `--text-headline-lg`       | Space Grotesk | `32px` / `36px`    | `-0.02em` |    700 | Login `code.html` | Today, Quests, Habits, Progress, Profile, Login          |

### Quests display type

The Quests HTML maps `font-display-lg` and `font-display-xl` to Space Grotesk and adds `font-black` to the `.02 QUESTS` heading and the `+450` Total Yield figure. The adjacent `XP` uses its own type class. In `UI, v4/kaizen.02_quests_poster_editorial_edition/screen.png`, all three sampled text runs have serifs. The PNG does not identify the original font by name.

The [comparison image](evidence/quests-family-comparison.png) places crops of the original PNG beside the same text rasterized in Space Grotesk 700, Times New Roman Bold, and Georgia Bold. The samples match visible glyph height without stretching and use −0.05 em tracking. The PNG shows the `Q`'s descending curved tail, bracketed serifs, strong thick-to-thin stroke contrast, and tall numerals. Space Grotesk differs in each of those features. Times New Roman Bold approximates the forms and dimensions closely enough for a local reference. Width by itself cannot establish a visual match or identify the original font. The measurements below are visible ink width × height in pixels.

| Sample | PNG | Space Grotesk 700 | Times New Roman Bold | Georgia Bold |
| ------ | --: | ----------------: | -------------------: | -----------: |
| `.02` | 61 × 40 | 71 × 39 | 61 × 40 | 105 × 40 |
| `QUESTS` | 210 × 50 | 182 × 49 | 211 × 49 | 224 × 50 |
| `+450` | 154 × 56 | 169 × 56 | 154 × 56 | 181 × 56 |

The provisional comparison stack is `"Times New Roman", Times, serif` at 700 for the heading and yield figure. Its rendering is platform-dependent. The comparison was generated on macOS. The demo laptop and fallback rendering remain unverified. The production Quests screen uses its existing `font-bold` heading. The Stitch markup still requests 900 for the two display elements. That request remains unresolved in the export, and removing the global override prevents the token layer from assigning it a replacement. Before the Quests restyle, select a serif by letterform, self-host it through `next/font/google` in a separate change, and verify the actual face in the demo browser.

### Spacing and radius

Use the exact Login spacing values as project `--spacing-*` tokens. Keep zero gutters as explicit values.

| Token                      | Value     | Source file       | Screens using the named spacing                          |
| -------------------------- | --------- | ----------------- | -------------------------------------------------------- |
| `--spacing-space-xs`       | `0.25rem` | Login `code.html` | Today, Quests, Habits, Progress, Profile, Login          |
| `--spacing-space-sm`       | `0.5rem`  | Login `code.html` | Today, Quests, Habits, Progress, Profile, Login          |
| `--spacing-space-md`       | `1rem`    | Login `code.html` | Today, Quests, Habits, Progress, Profile, Login          |
| `--spacing-space-lg`       | `1.5rem`  | Login `code.html` | Today, Quests, Habits, Progress, Profile, Login          |
| `--spacing-space-xl`       | `2.5rem`  | Login `code.html` | Today, Quests, Login                                     |
| `--spacing-margin`         | `1rem`    | Login `code.html` | Login                                                    |
| `--spacing-margin-tablet`  | `1.5rem`  | Login `code.html` | Login                                                    |
| `--spacing-margin-desktop` | `2rem`    | Login `code.html` | Login                                                    |
| `--spacing-gutter`         | `0px`     | Login `code.html` | Quests, Habits                                           |
| `--spacing-gutter-desktop` | `0px`     | Login `code.html` | Defined by export, with no named utility reference found |

| Token                                                                                                                                                  |  Value | Source                                                                                                                                                            | Intended screens |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | -----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `--radius`, `--radius-xs`, `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-2xl`, `--radius-3xl`, `--radius-4xl`, `--radius-full` | 0 each | Approved square-corner decision. Login and the five signed-in HTML configs supply the conflicting old defaults. 404 `code.html` explicitly forces square corners. | All seven        |

Override Tailwind's inherited named radii in `@theme`, including the bare and full tokens. The installed Tailwind compiler resolves both `rounded` and `rounded-full` to these variables when they are defined.

### Fonts, icons, and motion at runtime

- Next.js downloads the approved font faces at build time and serves the compiled assets with the app. Carry no Google Fonts `<link>`, preconnect, Tailwind CDN script, or other CDN script into app code, and remove any duplicate font-related runtime wiring found during apply. Treat the original Stitch exports as reference files.
- The installed `next/font/google` package exposes all three text font loaders and has no `Material_Symbols_Outlined` loader. Use local Material Symbols Outlined SVGs as needed in later restyles, with their upstream licensing and appropriate accessible names. The token change adds no icon requests.
- Define no animation or keyframes in the token layer. Future use of the 404 pulse or similar motion requires a `prefers-reduced-motion` guard. Existing character feedback behaviour stays as verified.

## Risks / Trade-offs

- Build workers need access to the font source during `next build --webpack`. The browser fetches app-served assets. A failure to acquire those faces must remain visible in build verification.
- The scoped colour utilities require the dedicated 404 wrapper. Applying those utilities elsewhere should not accidentally introduce the 404 palette.
- The comparison establishes a hierarchy match for the sampled Progress and Profile elements at matched glyph heights. It does not replace the screen-by-screen visual and keyboard checks during restyles.
- The token test checks the stylesheet and the exact weight arrays passed by the root layout to the three `next/font` loaders. Production verification checks the emitted CSS registrations and locally served assets. Several registered weights share a variable file within a character subset, so asset count and registered-weight count differ.
