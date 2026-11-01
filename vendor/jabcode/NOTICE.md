# JAB Code browser engine

JAB Code encoding/decoding library, Copyright Fraunhofer SIT.

Upstream: https://github.com/jabcode/jabcode

Pinned source revision: `3b56eef72436c88fc8538dc4d63920e058537874` (MIT-licensed by Fraunhofer SIT on 2026-04-17). The MIT license and copyright notice are included in `LICENSE.txt`.

This website builds its own WebAssembly engine from the unmodified upstream core C sources in `source/`, plus the minimal browser bindings `scripts/jab-web.c`. File image I/O (`image.c`, libpng and libtiff) is excluded: the browser handles PNG encoding and RGBA decoding. No third-party static image libraries are linked.

The readable Web Worker adapter `worker.js` loads the generated `jabcode.wasm.js` and `jabcode.wasm.wasm` at runtime. Input files and images are never sent to a server. The worker is terminated after each operation, including a timeout on excessively slow images.

Full application source and build bindings: https://github.com/kusnier/www

Build with Emscripten SDK 6.0.13 installed and activated:

```powershell
./scripts/build-jab.ps1 -EmsdkRoot /path/to/emsdk
```

The binary API supports a single 8-color symbol and raw byte buffers. The website file envelope (KJAB1, UTF-8 JSON metadata and SHA-256) is an application-level format, not an extension to the JAB symbology. Generic JAB readers see the envelope bytes; use this website's reader to restore the original file.

No endorsement by Fraunhofer SIT is implied.
