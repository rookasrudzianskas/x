# Visual provenance

Reference: https://creators.unfair.so/worth, inspected 28 October 2026.

- `public/reference/new-pixel.woff2`: reference display font; all Lithuanian characters and the euro glyph were verified. `new-pixel-static.ttf` is a static ROND=0 conversion for Next.js ImageResponse, which does not accept WOFF2.
- `public/reference/inter-*.woff2`: reference body-font subsets, self-hosted for English/Lithuanian.
- `public/reference/inter-*-static.ttf`: weight-400 conversions of those same subsets for server-rendered PNGs. `src/lib/card-font-characters.json` records their supported glyphs so name rendering can stay offline.
- `public/reference/city-original.svg`: retained visual reference. The actual application uses `public/vilnius-skyline.svg`, a new pixel illustration with local landmarks.
- `public/card-illustration.png`: transparent pixel illustration derived from the reference's composited report-card art with the built-in image-generation tool. It is used in the interactive, downloadable and social-preview cards.
- Original public download URLs are listed in `public/reference/SOURCES.txt`. Third-party assets retain their respective ownership. No blanket license for those assets is asserted by this repository.

## Illustration-edit prompt

Use case: background extraction. Produce a transparent PNG containing only the illustrated pixel-art man giving a thumbs-up in the lower middle of the reference report card. Preserve the head, expression, dark blue suit, tie, white/blue pixel line art and waist baseline. Remove background, skyline, numbers, words, borders, logos, hearts and speech bubbles. Reconstruct parts obscured by numeric text to match the surrounding drawing. Preserve crisp stepped edges and the deep navy, electric blue, pale blue and white palette. Use actual alpha transparency.

The final illustration is an adapted asset, not a claim of exact pixel identity with the composited source.
