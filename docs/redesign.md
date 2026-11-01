# Portfolio redesign

The homepage implements the approved dark navy / mint visual concept as responsive Angular components. The editor and tool previews are HTML/CSS; the actual IBAN and JWT tools remain linked on their original routes. Vitest is listed as part of Sebastian's personal stack; the repository's existing Karma/Jasmine runner is retained.

## Validation and publishing

```sh
npm ci
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
npm run deploy
```

`CHROME_BIN` may need to point to the local Chrome executable. Publishing uses the existing `gh-pages` branch and `kusnier.net` custom domain. GitHub Pages builds and deploys that branch automatically. Keep the `CNAME`, `.nojekyll` and SPA `404.html` files in the published branch. The existing separate `sk.html` page must also be preserved when replacing the build output.

The component stylesheet warning threshold is 4 kB and the error threshold is 8 kB. The hero (about 5.1 kB) and tool showcase (about 4.3 kB) produce advisory size warnings, but remain below the original error limit. No budgets were raised.

## Rollback

Source baseline before the redesign: `00e6d3264bcf6c504a4f5bbf439e5262a38704ab` on `main`.

Published baseline before the redesign: `f5ab5f2ebacc4aba384e192734288c779774e60f` on `gh-pages`.

To restore the previous live site immediately, revert the redesign's deployment commit on `gh-pages` and push that branch. GitHub Pages redeploys the restored content. Revert the corresponding source commit on `main` as well if the redesign should be removed from the source. Use new revert commits, rather than resetting or force-pushing either branch, to preserve history and subsequent changes.

## Generated image assets

Both backgrounds were created with the built-in ImageGen tool for this project and compressed to WebP. They are illustrative images, not photographs of Sebastian or his personal workspace.

- `public/images/studio.webp` — approximately 60 kB.
- `public/images/alpine-ride.webp` — approximately 234 kB.

### Studio prompt

Create a photorealistic cinematic editorial background photograph for the hero section of a premium dark software developer portfolio. Very wide horizontal 3:2 composition. A quiet modern architectural office at dusk: dark charcoal concrete walls, tall window at right, a dim forest barely visible outside, black desk along lower edge, subtle mint grey light, a matte black coffee cup near lower center and two blank dark books on lower right. No computer, no screen, no text, no letters, no logos, no UI. Left half very dark empty negative space, right half has window and architectural detail. Restrained premium interior photography, natural materials, soft side lighting, very low-key exposure. This will sit behind real HTML text and code editor; keep unobtrusive.

### Cycling prompt

Generate a photorealistic panoramic editorial landscape photograph for a personal developer portfolio about road cycling. Wide 3:2 aspect ratio. A beautiful winding alpine road overlooking a mountain lake at dawn, atmospheric layered mountains in the distance. A single elegant black road bicycle leaning against a weathered grey stone roadside wall in right-center, no rider or person. Calm understated muted blue-grey colors, pale warm dawn sky, realistic high-end photography. Darker empty cliff and shadow on left third to allow white website text overlay. Horizon in upper third, fine natural detail, realistic bicycle geometry. No typography, no letters, no watermark, no illustration. Composition inspired by a sophisticated dark portfolio website.
