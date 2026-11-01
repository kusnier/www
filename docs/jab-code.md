# File ↔ JAB Code

Route: `/jab-code`. Fourth homepage tool, alongside the protein calculator, IBAN tool and JWT decoder.

## Features and boundaries

- UTF-8 text and arbitrary binary files up to 2,048 bytes of user data.
- One real JAB primary symbol, eight colors, default upstream error correction and automatic size.
- Local Web Worker + WebAssembly processing. No file/text/image uploads, storage, analytics or remote code service.
- PNG export with a 24-pixel white margin. Every generated code is decoded before it is offered for download; all payload bytes must match.
- PNG/JPEG/WebP input, up to 8 MiB and 16 megapixels, resized to at most 1,600 pixels per dimension for decoding. The original PNG is the most reliable input; arbitrary photographs are not guaranteed to decode.
- Filename/type/size/SHA-256 metadata for original file downloads. SHA mismatch and partial decoding reject the result.
- Raw external JAB codes are readable, but shown without verified file metadata. Their bytes can be downloaded as a binary file or UTF-8 text when valid.
- No multi-code file chunking or camera stream in this version. JAB is not encryption.

## Application envelope

`KJAB1\n` (six bytes), followed by a four-byte little-endian JSON-header length, a UTF-8 JSON header and the unchanged file bytes. The header contains `name`, `type`, `size`, `text` and `sha256`.

This is an application-level convention. Other JAB readers can retrieve the encoded envelope bytes but need to understand this header to reconstruct the file. The generic JAB symbology is unchanged. Filenames are sanitized and decoded content is never rendered as HTML or executed.

## Engine and build

Pinned upstream MIT source: `jabcode/jabcode` at `3b56eef72436c88fc8538dc4d63920e058537874`. Unmodified core sources and the MIT license are shipped under `public/vendor/jabcode`. The site supplies `scripts/jab-web.c` as minimal RGBA/byte-buffer bindings. The browser handles image codecs; libpng/libtiff are not linked. No code from the official demo bundle is redistributed.

Install and activate Emscripten SDK 6.0.13, then run:

```powershell
./scripts/build-jab.ps1 -EmsdkRoot /path/to/emsdk
```

Compiled engine assets are committed, so normal Angular builds do not require Emscripten.

## Verification

```sh
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
```

The Karma tests include actual Web Workers and the browser PNG codecs: a 2-KiB file containing all byte values survives encode → PNG → decode with metadata and SHA-256 intact. Plain white images are rejected. Envelope tests cover Unicode, embedded zeros, tampering, truncation, capacity and raw external messages.

An additional Node/WASM/PNG integration check requires `sharp` locally or a `SHARP_MODULE` environment variable pointing to an existing installation:

```sh
npm run test:jab
```

Optional `JAB_TEST_OUTPUT` saves test PNGs and restored files. Browser UI testing also covered a real file chooser, PNG download, PNG re-selection and restored binary download; original/restored file sizes and SHA-256 matched. Mobile was checked at 390 px with no horizontal overflow.

## Rollback

Source baseline before this tool: `bd03348` on main. Deployment baseline: `3bd759f` on gh-pages. Revert the dedicated tool/deployment commits and push their respective branches to remove this tool without undoing the earlier redesign, protein calculator or favicon.
