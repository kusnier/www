/* Browser adapter for the Fraunhofer SIT JAB Code 2.0.0 engine, built from MIT sources.
 * See NOTICE.md and LICENSE.txt in this directory. No file data leaves this worker.
 */
let ready;
function engine() {
  if (!ready) ready = new Promise((resolve, reject) => {
    self.Module = { locateFile: name => new URL(name, self.location.href).href,
      onRuntimeInitialized: () => resolve(self.Module),
      onAbort: () => reject(new Error('Die JAB-Engine konnte nicht gestartet werden.')) };
    try {
      importScripts('./jabcode.wasm.js');
      Module.onAbort = () => reject(new Error('Die JAB-Engine konnte nicht gestartet werden.'));
      Module.onRuntimeInitialized = () => resolve(Module);
      if (Module.calledRun) resolve(Module);
    } catch (error) { reject(error); }
  });
  return ready;
}

function decode(m, pixels, width, height) {
  let pointer = 0, result = 0;
  try {
    pointer = m._malloc(pixels.length);
    if (!pointer) throw new Error('Nicht genügend Speicher für dieses Bild.');
    m.HEAPU8.set(pixels, pointer);
    result = m._web_read(pointer, width, height);
    if (!result) throw new Error('Kein lesbarer JAB-Code gefunden.');
    if (m.getValue(result, 'i32') !== 3) throw new Error('Der JAB-Code konnte nicht vollständig gelesen werden. Verwende möglichst das originale PNG.');
    const data = m.getValue(result + 4, 'i32');
    const length = data ? m.getValue(data, 'i32') : 0;
    if (length < 1 || length > 1024 * 1024) throw new Error('Kein lesbarer JAB-Code gefunden. Verwende möglichst das originale PNG.');
    return m.HEAPU8.slice(data + 4, data + 4 + length);
  } finally {
    if (result) m._free_jab_decode_result(result);
    if (pointer) m._free(pointer);
  }
}

self.onmessage = async ({ data }) => {
  try {
    const m = await engine();
    if (data.action === 'decode') {
      const bytes = decode(m, new Uint8Array(data.pixels), data.width, data.height);
      self.postMessage({ bytes: bytes.buffer }, [bytes.buffer]);
      return;
    }
    const bytes = new Uint8Array(data.bytes);
    if (!bytes.length || bytes.length > 4096) throw new Error('Die Daten passen nicht in diesen Einzelcode.');
    let pointer = 0, result = 0;
    let pixels, width, height;
    try {
      pointer = m._malloc(bytes.length);
      if (!pointer) throw new Error('Nicht genügend Speicher.');
      m.HEAPU8.set(bytes, pointer);
      result = m._web_write(pointer, bytes.length, 8, 1, 8, 0, 0, 0, 0, 0, 0, 0, 0);
      if (!result || m.getValue(result, 'i32') !== 0) throw new Error('Die Daten konnten nicht als Einzelcode erzeugt werden. Versuche eine kleinere Datei.');
      const bitmap = m.getValue(result + 4, 'i32');
      width = m.getValue(bitmap, 'i32');
      height = m.getValue(bitmap + 4, 'i32');
      const channels = m.getValue(bitmap + 16, 'i32');
      if (channels !== 4 || width < 1 || height < 1 || width * height > 4000000) throw new Error('Unerwartetes Bildformat der JAB-Engine.');
      pixels = m.HEAPU8.slice(bitmap + 20, bitmap + 20 + width * height * 4);
    } finally {
      if (result) m._free_jab_encode_result(result);
      if (pointer) m._free(pointer);
    }
    const restored = decode(m, pixels, width, height);
    if (restored.length !== bytes.length || restored.some((value, i) => value !== bytes[i])) throw new Error('Die automatische Rückleseprüfung ist fehlgeschlagen.');
    self.postMessage({ pixels: pixels.buffer, width, height }, [pixels.buffer]);
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Die JAB-Verarbeitung ist fehlgeschlagen.' });
  }
};
