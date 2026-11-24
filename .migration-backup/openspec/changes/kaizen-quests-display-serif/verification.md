# Quests serif verification

2026-11-23. [Letterform comparison](evidence/self-hosted-serif-comparison.png), [Chrome glyph report](evidence/browser-fonts.json), and [fixture screenshot](evidence/browser-glyph-fixture.png).

## Design decision

Keep STIX Two Text Bold at 700, including its heavier plus. The comparison prioritizes the serif shapes, Q tail, stroke contrast, and lining numeral proportions across specimens. The reference plus is lighter. Using one downloaded face preserves consistent weight and alignment across the displayed number.

The live `/quests` page shows `Quests` at 700 and currently has no Total Yield section or `+450` figure. The `+450` glyph result below comes from the browser fixture. A live Total Yield figure belongs to the Quests restyle and needs a defined value from the product data.

## Class replacement

The original Stitch export remains the visual reference. The browser fixture reads both display elements' classes from that export, replaces the Space Grotesk family class and `font-black`, and verifies the resulting computed weight is 700. The current live heading already used `font-bold` and now selects the same STIX family. The fixture changes show the exact replacements to carry over when porting the v4 markup.

```diff
 .02 QUESTS
-font-display-lg text-display-lg font-black tracking-tighter uppercase text-on-surface leading-none m-0
+font-(family-name:--font-quests-display) text-display-lg font-bold tracking-tighter uppercase text-on-surface leading-none m-0
 +450
-font-display-xl text-display-xl font-black text-on-secondary-fixed leading-none tracking-tighter
+font-(family-name:--font-quests-display) text-display-xl font-bold text-on-secondary-fixed leading-none tracking-tighter
```

## Production browser check

Ran `pnpm build`, started disposable PostgreSQL, applied migrations with `pnpm --filter @kaizen/api db:migrate`, and started Express and Next.js production with the local ingress from the seven-route sweep. Registered a disposable user through `/register`, then navigated to `/quests` in a fresh Chrome 157 profile with the network cache disabled. The signed-in document returned 200. The stack and database were stopped and removed afterward.

| Check | Observation |
| ----- | ----------- |
| Font source | Chrome downloaded `5003410bef5ba35b.woff2` from the app origin with HTTP 200. The production `/quests` stylesheet declares six WOFF2 subsets for normal 700 and no `local()` source or fallback list. The other 11 prerendered pages register no STIX face. |
| Live heading | DevTools `CSS.getPlatformFontsForNode` reported `STIXTwoText-Bold`, `isCustomFont: true`, for all six glyphs. Computed weight was 700. |
| Other live text | A filter label rendered in macOS system sans (`.SFNS-Regular`). The test also asserts only the heading opts into the STIX class. |
| Export specimens | Added `.02 QUESTS` and `+450` to the browser DOM after replacing both Stitch family and weight classes as shown above. All 10 heading glyphs and all four yield glyphs reported the downloaded face. The fixture exists only in the review. |
| Blocked-font control | Blocked WOFF2 requests in DevTools and reloaded with the cache disabled. Chrome reported the installed face `STIXTwoText_Bold` with `isCustomFont: false`. The installed face could conceal a missing asset in a visual-only check. |

The available Mac has STIX Two Text installed. Chrome's `CSS.setLocalFontsEnabled` setting was tried, but the `local()` probes still loaded STIX and Arial in this run. The evidence shows that Chrome fetched the file and selected its glyphs. Rendering on a machine without STIX installed, including the demo machine, remains unverified. The commit carries that gap, and the task remains open. [Chrome DevTools font inspection](https://developer.chrome.com/docs/devtools/rendering/apply-effects#emulate_missing_local_fonts)
