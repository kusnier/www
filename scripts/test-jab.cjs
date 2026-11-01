// Real C/WASM -> PNG -> RGBA -> C/WASM -> file-envelope integration test.
// Requires sharp locally, or SHARP_MODULE pointing to an existing installation.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const folder = path.resolve(__dirname, '../public/vendor/jabcode');
const payloadSource = fs.readFileSync(path.resolve(__dirname, '../src/app/tools/jab-code/jab-payload.ts'), 'utf8');
const compiled = ts.transpileModule(payloadSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const payload = {};
new Function('exports', compiled)(payload);

async function test() {
  const context = vm.createContext({ console, require, process, __dirname: folder,
    __filename: path.join(folder, 'jabcode.wasm.js'), WebAssembly, Buffer, URL,
    TextEncoder, TextDecoder, setTimeout, clearTimeout });
  await new Promise((resolve, reject) => {
    context.Module = { locateFile: name => path.join(folder, name), onRuntimeInitialized: resolve, onAbort: reject };
    vm.runInContext(fs.readFileSync(path.join(folder, 'jabcode.wasm.js'), 'utf8'), context);
  });
  const m = context.Module;
  const cases = [
    { name: 'unicode.txt', type: 'text/plain', text: true, bytes: new TextEncoder().encode('Grüße 👋 東京 e\u0301\nDatei ↔ JAB-Code') },
    { name: 'all-bytes.bin', type: 'application/octet-stream', text: false, bytes: Uint8Array.from({ length: 2048 }, (_, i) => i % 256) },
    { name: 'zero.bin', type: 'application/octet-stream', text: false, bytes: new Uint8Array(2048) },
  ];
  for (const file of cases) {
    const bytes = await payload.packFile(file.bytes, file.name, file.type, file.text);
    const input = m._malloc(bytes.length); m.HEAPU8.set(bytes, input);
    const encoded = m._web_write(input, bytes.length, 8, 1, 8, 0, 0, 0, 0, 0, 0, 0, 0);
    assert.ok(encoded);
    assert.equal(m.getValue(encoded, 'i32'), 0);
    const bitmap = m.getValue(encoded + 4, 'i32');
    const width = m.getValue(bitmap, 'i32'), height = m.getValue(bitmap + 4, 'i32');
    const pixels = Buffer.from(m.HEAPU8.slice(bitmap + 20, bitmap + 20 + width * height * 4));
    m._free_jab_encode_result(encoded); m._free(input);
    const png = await sharp(pixels, { raw: { width, height, channels: 4 } })
      .extend({ top: 24, bottom: 24, left: 24, right: 24, background: '#fff' }).png().toBuffer();
    const image = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const imagePointer = m._malloc(image.data.length); m.HEAPU8.set(image.data, imagePointer);
    const decoded = m._web_read(imagePointer, image.info.width, image.info.height);
    assert.ok(decoded);
    const dataPointer = m.getValue(decoded + 4, 'i32');
    assert.ok(dataPointer);
    const length = m.getValue(dataPointer, 'i32');
    const restored = await payload.unpackFile(m.HEAPU8.slice(dataPointer + 4, dataPointer + 4 + length));
    m._free_jab_decode_result(decoded); m._free(imagePointer);
    assert.deepEqual(Buffer.from(restored.bytes), Buffer.from(file.bytes));
    assert.equal(restored.name, file.name); assert.equal(restored.type, file.type); assert.equal(restored.verified, true);
    console.log(`PASS ${file.name}: ${file.bytes.length} bytes, PNG ${png.length} bytes, SHA-256 verified`);
    if (process.env.JAB_TEST_OUTPUT) {
      fs.mkdirSync(process.env.JAB_TEST_OUTPUT, { recursive: true });
      fs.writeFileSync(path.join(process.env.JAB_TEST_OUTPUT, file.name + '.png'), png);
      fs.writeFileSync(path.join(process.env.JAB_TEST_OUTPUT, file.name + '.restored'), restored.bytes);
    }
  }
}
test().catch(error => { console.error(error); process.exitCode = 1; });
