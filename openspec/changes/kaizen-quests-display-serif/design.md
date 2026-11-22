# Design

## Context

The [token review](../kaizen-ui-v4-design-tokens/design.md#quests-display-type) identified a mismatch between the Quests PNG's serif display type and the export's Space Grotesk 900 classes. The two affected elements are the `.02 QUESTS` heading and `+450` Total Yield figure. The adjacent `XP` has its own styling.

## Goals / Non-Goals

Use a consistent bold serif for the two reviewed display elements. This change styles the existing `Quests` heading and leaves its wording, catalog text, behaviour, and navigation in place. The `.02 QUESTS` wording and the Total Yield figure appear only in the Stitch export. The current paginated quest endpoint returns quest records and a cursor. It has no yield aggregate. The restyle can use the display class when it has a defined yield value. The browser fixture uses `+450` solely to verify glyph rendering.

## Decisions

Use **STIX Two Text Bold (700, normal)**. The [comparison](evidence/self-hosted-serif-comparison.png) places crops from `UI, v4/kaizen.02_quests_poster_editorial_edition/screen.png` beside Google Fonts samples of Tinos, STIX Two Text, Playfair Display, Libre Caslon Text, Libre Bodoni, and Baskervville, all at 700. Samples use matched visible glyph height, −0.05 em tracking, and no stretching. Judge the Q tail, bracketed serifs, stroke contrast, and lining numeral proportions before using the recorded widths to check layout. STIX Two Text is the closest overall. It keeps a short descending Q tail and the upright numerals with an oval zero. Accept its heavier plus and squarer terminals as visible differences. One face keeps the numerals and sign aligned at a consistent weight. The lighter plus in candidates such as Playfair accompanies numeral forms further from the reference. The source PNG alone does not identify its original font.

Register `STIX_Two_Text` from `next/font/google` in the `/quests` page and attach `--font-quests-display` to the existing main element. Select the family on the display element itself using `font-(family-name:--font-quests-display)` and `font-bold`. Leave the shared text styles in place. Keep preloading disabled so visiting or prefetching another page does not fetch the font for an unused heading. Omit the explicit fallback list and disable Next.js's generated adjusted fallback. When porting the two elements from the reference, replace their `font-black` classes with these family and 700 utilities. The original Stitch export remains the source visual reference. See the [font specimen](https://fonts.google.com/specimen/STIX%20Two%20Text) and [Next.js font documentation](https://nextjs.org/docs/app/getting-started/fonts).

## Risks / Trade-offs

The visual evidence covers the sampled Latin glyphs on the comparison machine. Check the active font, wrapping, and numeral alignment in the demo browser once the restyle actually uses the face.
