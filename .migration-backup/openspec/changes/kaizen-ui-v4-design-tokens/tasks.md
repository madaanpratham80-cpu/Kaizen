# Tasks

## 1. Theme and fonts

- [x] 1.1 Extend `apps/web/src/app/globals.css` with the 47 shared colours, 13 type sizes and companion values, font-family aliases, 10 spacing values, all zero radius overrides, and the three 700 family-weight tokens. Preserve Tailwind's inherited utilities. The scoped Quests family choice belongs to the later Quests restyle. Keep the existing progression, health, and screen styles.
- [x] 1.2 Register the five 404 utility names using scoped backing values and preserve the seven shared colour aliases from the design. Leave the scope ready for eventual 404 wiring. Introduce no animation.
- [x] 1.3 Load the approved Space Grotesk, DM Sans, and Space Mono weights via `next/font/google` in the web root layout using JavaScript ESM with JSDoc. Register font variables without changing any screen's active font styles. Verify that no Google Fonts links, preconnects, or CDN scripts are introduced. Keep local SVG icon adoption in the later screen work.

## 2. Verification

- [x] 2.1 Add one Vitest test in `apps/web/src/app/design-tokens.test.js`, named `defines the agreed Kaizen UI v4 theme tokens without 900-weight or rounded defaults`. Assert the shared token names and values, the five scoped 404 values, the zero radius overrides, and the three family-weight tokens at 700 directly in the stylesheet. Assert the exact loader weight arrays and variable names by importing the root layout with mocked `next/font` loaders.
- [x] 2.2 Run the existing root `pnpm test`, `pnpm test:db` against an empty disposable PostgreSQL database whose name contains `test`, `pnpm lint`, and `pnpm build` with the existing webpack build script. Confirm the production font assets are served by the app and the build gate works without any runtime CDN dependency. Record all results and keep implementation within the theme, root font wiring, and the single test.
- [x] 2.3 Present the apply diff and all four check summaries for review. Record the Quests typography evidence and pending design decision, then make one tokens commit containing the approved change.

Verification on 2026-11-23: `pnpm test` passed 170 tests. `pnpm test:db` applied seven migrations to an empty disposable PostgreSQL database and passed 85 tests. `pnpm lint` passed all three packages. `pnpm build` passed using webpack. The built app served all 11 WOFF2 files referenced by `/login` with HTTP 200. The CSS registered exactly the approved weights. The files comprise three Space Grotesk variable subsets, two DM Sans variable subsets, and six Space Mono static files (three subsets per weight). Its HTML and CSS contained no Google Fonts or Tailwind CDN URLs. The build registered no Material Symbols or 900-weight face.

Loader regression check: the token test passed with the exact arrays. In isolated copies of the root layout, appending `'900'` to Space Grotesk, DM Sans, or Space Mono independently failed the assertion for that loader. The original arrays passed again afterward. The two Quests 900 requests are in the Stitch export and remain pending restyle. See the [Quests comparison](design.md#quests-display-type) for the provisional platform-dependent serif and demo requirements.
