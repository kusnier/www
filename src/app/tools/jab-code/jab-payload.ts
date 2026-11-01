export const MAX_FILE_BYTES = 2048;
const MAGIC = new TextEncoder().encode('KJAB1\n');
const encoder = new TextEncoder();

export interface JabFile {
  name: string;
  type: string;
  bytes: Uint8Array;
  text: string | null;
  verified: boolean;
  checksum: string | null;
}

async function hash(bytes: Uint8Array): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer)))
    .map(value => value.toString(16).padStart(2, '0')).join('');
}

export function safeName(name: string): string {
  return name.replace(/[\\/\u0000-\u001f\u007f]/g, '_').slice(0, 100) || 'datei.bin';
}

export async function packFile(bytes: Uint8Array, name: string, type: string, text: boolean): Promise<Uint8Array> {
  if (!bytes.length) throw new Error('Bitte Text eingeben oder eine nicht leere Datei auswählen.');
  if (bytes.length > MAX_FILE_BYTES) throw new Error('Diese Version unterstützt bis zu 2 KiB (2.048 Bytes) pro Datei oder Text.');
  const metadata = encoder.encode(JSON.stringify({ name: safeName(name), type: type.slice(0, 100),
    size: bytes.length, text, sha256: await hash(bytes) }));
  const payload = new Uint8Array(MAGIC.length + 4 + metadata.length + bytes.length);
  payload.set(MAGIC);
  new DataView(payload.buffer).setUint32(MAGIC.length, metadata.length, true);
  payload.set(metadata, MAGIC.length + 4);
  payload.set(bytes, MAGIC.length + 4 + metadata.length);
  return payload;
}

export async function unpackFile(payload: Uint8Array): Promise<JabFile> {
  const isOurs = payload.length >= MAGIC.length && MAGIC.every((value, index) => payload[index] === value);
  if (!isOurs) {
    let text: string | null = null;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(payload); } catch { /* Binary external JAB code. */ }
    return { name: text === null ? 'jab-daten.bin' : 'jab-text.txt', type: text === null ? 'application/octet-stream' : 'text/plain', bytes: payload, text, verified: false, checksum: null };
  }
  if (payload.length < MAGIC.length + 4) throw new Error('Unvollständiger Dateikopf im JAB-Code.');
  const length = new DataView(payload.buffer, payload.byteOffset, payload.byteLength).getUint32(MAGIC.length, true);
  const start = MAGIC.length + 4;
  if (length > 2048 || start + length >= payload.length) throw new Error('Ungültiger Dateikopf im JAB-Code.');
  let metadata: Record<string, unknown>;
  try { metadata = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(payload.subarray(start, start + length))); }
  catch { throw new Error('Der Dateikopf konnte nicht gelesen werden.'); }
  if (!metadata || typeof metadata !== 'object' || typeof metadata['name'] !== 'string' || typeof metadata['type'] !== 'string'
    || typeof metadata['text'] !== 'boolean' || typeof metadata['sha256'] !== 'string' || !/^[a-f0-9]{64}$/.test(metadata['sha256'])) throw new Error('Ungültige Dateimetadaten.');
  const bytes = payload.slice(start + length);
  if (bytes.length !== metadata['size']) throw new Error('Die wiederhergestellte Dateigröße stimmt nicht überein.');
  const checksum = await hash(bytes);
  if (checksum !== metadata['sha256']) throw new Error('Prüfsumme stimmt nicht überein. Die Datei wird nicht zum Download angeboten.');
  return { name: safeName(metadata['name']), type: metadata['type'].slice(0, 100), bytes,
    text: metadata['text'] ? new TextDecoder('utf-8', { fatal: true }).decode(bytes) : null, verified: true, checksum };
}
