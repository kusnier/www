# Third-party licenses and asset provenance

This public repository has no overarching license for the owner's original code or media. Public visibility is not a general open-source license grant. This document does not grant additional rights to project code, media or trademarks. Third-party components retain their own licenses.

## Software shipped to browsers

- Angular, Material, CDK, zone.js: MIT; highlight.js: BSD-3-Clause; RxJS: Apache-2.0; tslib: 0BSD. Full build-extracted notices: [`public/licenses/npm-licenses.txt`](public/licenses/npm-licenses.txt).
- Fraunhofer SIT JAB Code: MIT, pinned source revision `3b56eef72436c88fc8538dc4d63920e058537874`. The complete notice, license and copied core sources are in [`public/vendor/jabcode`](public/vendor/jabcode). The official demo's old LGPL binaries are not used or redistributed.
- Emscripten-generated runtime and compiled standard-library components: notices for Emscripten 6.0.13, musl libc and LLVM compiler-rt are included in [`public/licenses`](public/licenses). Compiler-rt's notice was fetched from the upstream main branch; it records Apache-2.0 with the LLVM exception and additional component notices, not a claim to an exact compiler source revision.

The pinned lockfile also contains build/test-only dependencies. Its license metadata currently includes permissive software licenses and CC attribution/public-domain licenses for tooling data; these are not all shipped in the browser bundles. Full node_modules is not committed. This is an inventory of current tracked content and produced browser bundles, not a legal audit of all repository history or patents/trademarks.

## Icons, fonts and media

- Material Icons, Google: Apache-2.0, full license in `public/licenses/material-icons-APACHE-2.0.txt`. Font source: `https://fonts.gstatic.com/s/materialicons/v145/flUhRq6tzZclQEJ-Vdg-IuiaDsNZ.ttf`, unchanged, self-hosted at `public/fonts/MaterialIcons-Regular.ttf`.
- Other typography uses installed system fonts; no Georgia/Arial/Helvetica font files are redistributed.
- Studio and road-cycling backgrounds were generated with OpenAI ImageGen specifically for this site, rather than downloaded from a stock-image provider. Prompts and provenance are in [`docs/redesign.md`](docs/redesign.md). OpenAI's applicable terms govern the owner's rights in output; no guarantee of exclusive copyright, trademark clearance or absence of third-party claims is asserted.
- The sk favicon and simple SVG UI drawings were created for this project. Technology marks identify technologies; third-party trademark rights are not transferred by this repository.
- The JAB preview PNG was generated using the included JAB engine.
- Protein reference figures are factual values attributed and linked to DGE within the calculator. The original DGE publication, illustrations and tables are not republished here.

## Keeping notices in deployments

Angular emits `dist/www/3rdpartylicenses.txt` outside its `browser/` output. `npm run build` now invokes `scripts/publish-licenses.cjs` to copy that file into both `public/licenses/npm-licenses.txt` and `dist/www/browser/licenses/npm-licenses.txt`. `npm run deploy` uses this build step. The public footer links to `/licenses/NOTICE.html`.
